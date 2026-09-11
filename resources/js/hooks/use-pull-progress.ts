import { useCallback, useEffect, useRef, useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/UserController';

export type PullStatus = {
    status: 'queued' | 'running' | 'finished';
    total: number;
    processed: number;
    progress: number;
};

const IDLE: PullStatus = {
    status: 'finished',
    total: 0,
    processed: 0,
    progress: 0,
};

/**
 * Drives one "Pull ..." dialog's progress bar: mint an id the dialog sends
 * along with its submit, then poll the backend for that id's batch
 * progress once the submit succeeds.
 */
export function usePullProgress() {
    const [status, setStatus] = useState<PullStatus>(IDLE);
    // Distinguishes "hasn't been asked to pull anything yet" from
    // "finished pulling" — both look like IDLE's status shape otherwise.
    const [isActive, setIsActive] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressIdRef = useRef<string | null>(null);

    const stopPolling = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    useEffect(() => stopPolling, [stopPolling]);

    const startId = useCallback(() => {
        const id = crypto.randomUUID();
        progressIdRef.current = id;

        return id;
    }, []);

    const poll = useCallback((id: string) => {
        const request = () => {
            // A dialog that got reset (closed, or a new pull started)
            // after this timer was scheduled shouldn't resurrect stale
            // progress for an id nobody cares about anymore.
            if (progressIdRef.current !== id) {
                return;
            }

            fetch(UserController.pullStatus.url(id), {
                headers: { Accept: 'application/json' },
            })
                .then((response) => (response.ok ? response.json() : null))
                .then((data: PullStatus | null) => {
                    if (!data || progressIdRef.current !== id) {
                        return;
                    }

                    setStatus(data);

                    if (data.status !== 'finished') {
                        timeoutRef.current = setTimeout(request, 1000);
                    }
                })
                .catch(() => {
                    // Transient network hiccup — retry rather than
                    // leaving the bar stuck partway.
                    timeoutRef.current = setTimeout(request, 2000);
                });
        };

        setIsActive(true);
        setStatus({ status: 'queued', total: 0, processed: 0, progress: 0 });
        request();
    }, []);

    const reset = useCallback(() => {
        stopPolling();
        progressIdRef.current = null;
        setIsActive(false);
        setStatus(IDLE);
    }, [stopPolling]);

    return { status, isActive, startId, poll, reset };
}
