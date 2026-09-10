import { router } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import RoleplayController from '@/actions/App/Http/Controllers/RoleplayController';
import type { RoleplayTranscriptEntry } from '@/types/roleplay';

// The live call's audio never touches our server: the browser opens a
// WebRTC connection straight to OpenAI's Realtime API using a short-lived
// token our backend mints (RoleplayController::token), and the transcript
// is assembled client-side from events OpenAI sends back over a WebRTC
// data channel, then posted to RoleplayController::complete once the
// agent hangs up.
//
// NOTE: this follows OpenAI's documented WebRTC connect flow as of when
// this was written (POST an SDP offer to /v1/realtime/calls using the
// ephemeral token, listen for transcript events on an "oai-events" data
// channel). OpenAI's Realtime API has changed shape before — if calls
// stop connecting or transcripts stop showing up, check the event names
// below (search this file for "event.type ===") against OpenAI's current
// Realtime API docs first.
const OPENAI_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';

export type RoleplayCallStatus =
    | 'idle'
    | 'requesting_mic'
    | 'connecting'
    | 'connected'
    | 'ending'
    | 'ended'
    | 'error';

type OpenAiRealtimeEvent = {
    type: string;
    item_id?: string;
    delta?: string;
    transcript?: string;
    error?: { message?: string };
};

function readCsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export function useRoleplayCall(sessionId: number) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    // Delta text buffered per in-flight item, keyed by OpenAI's item_id —
    // used as a fallback if a `.done`/`.completed` event ever arrives
    // without its own final `transcript` field.
    const deltaBuffers = useRef<Record<string, string>>({});
    const transcriptRef = useRef<RoleplayTranscriptEntry[]>([]);

    const [status, setStatus] = useState<RoleplayCallStatus>('idle');
    const [transcript, setTranscript] = useState<RoleplayTranscriptEntry[]>(
        [],
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const appendTranscript = useCallback(
        (role: RoleplayTranscriptEntry['role'], text: string) => {
            const trimmed = text.trim();

            if (!trimmed) {
                return;
            }

            const entry: RoleplayTranscriptEntry = {
                role,
                text: trimmed,
                at: new Date().toISOString(),
            };

            transcriptRef.current = [...transcriptRef.current, entry];
            setTranscript(transcriptRef.current);
        },
        [],
    );

    const handleDataChannelMessage = useCallback(
        (raw: string) => {
            let event: OpenAiRealtimeEvent;

            try {
                event = JSON.parse(raw);
            } catch {
                return;
            }

            const itemId = event.item_id;

            switch (event.type) {
                case 'conversation.item.input_audio_transcription.delta':
                case 'response.output_audio_transcript.delta':
                    if (itemId && typeof event.delta === 'string') {
                        deltaBuffers.current[itemId] =
                            (deltaBuffers.current[itemId] ?? '') +
                            event.delta;
                    }

                    break;

                case 'conversation.item.input_audio_transcription.completed': {
                    const text =
                        event.transcript ??
                        (itemId ? deltaBuffers.current[itemId] : '') ??
                        '';
                    appendTranscript('agent', text);

                    if (itemId) {
                        delete deltaBuffers.current[itemId];
                    }

                    break;
                }

                case 'response.output_audio_transcript.done': {
                    const text =
                        event.transcript ??
                        (itemId ? deltaBuffers.current[itemId] : '') ??
                        '';
                    appendTranscript('assistant', text);

                    if (itemId) {
                        delete deltaBuffers.current[itemId];
                    }

                    break;
                }

                case 'error':
                    setErrorMessage(
                        event.error?.message ??
                            'The realtime call reported an error.',
                    );
                    break;
            }
        },
        [appendTranscript],
    );

    const cleanup = useCallback(() => {
        dataChannelRef.current?.close();
        dataChannelRef.current = null;

        peerConnectionRef.current?.getSenders().forEach((sender) => {
            sender.track?.stop();
        });
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;

        micStreamRef.current?.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;

        if (audioRef.current) {
            audioRef.current.srcObject = null;
        }
    }, []);

    const connect = useCallback(async () => {
        setErrorMessage(null);
        setStatus('requesting_mic');

        try {
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            micStreamRef.current = micStream;

            setStatus('connecting');

            const pc = new RTCPeerConnection();
            peerConnectionRef.current = pc;

            pc.ontrack = (event) => {
                if (audioRef.current) {
                    audioRef.current.srcObject = event.streams[0];
                }
            };

            micStream
                .getTracks()
                .forEach((track) => pc.addTrack(track, micStream));

            const dc = pc.createDataChannel('oai-events');
            dataChannelRef.current = dc;
            dc.addEventListener('message', (event) =>
                handleDataChannelMessage(event.data),
            );
            dc.addEventListener('open', () => setStatus('connected'));

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const tokenResponse = await fetch(
                RoleplayController.token.url(sessionId),
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': readCsrfToken(),
                    },
                },
            );

            if (!tokenResponse.ok) {
                throw new Error(
                    'Could not start the call — please try again.',
                );
            }

            const { client_secret: clientSecret } =
                await tokenResponse.json();

            const sdpResponse = await fetch(OPENAI_CALLS_URL, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${clientSecret}`,
                    'Content-Type': 'application/sdp',
                },
            });

            if (!sdpResponse.ok) {
                throw new Error(
                    'Could not connect the call — please try again.',
                );
            }

            const answerSdp = await sdpResponse.text();
            await pc.setRemoteDescription({
                type: 'answer',
                sdp: answerSdp,
            });
        } catch (error) {
            cleanup();
            setStatus('error');
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : 'Could not access your microphone.',
            );
        }
    }, [cleanup, handleDataChannelMessage, sessionId]);

    const hangUp = useCallback(() => {
        setStatus('ending');
        cleanup();
        setStatus('ended');

        router.post(
            RoleplayController.complete.url(sessionId),
            { transcript: transcriptRef.current },
            { preserveScroll: true },
        );
    }, [cleanup, sessionId]);

    return { status, transcript, errorMessage, connect, hangUp, audioRef };
}
