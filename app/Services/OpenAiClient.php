<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Thin wrapper around the two OpenAI HTTP calls the sales roleplay feature
 * needs. The live call's audio never flows through our server — the
 * browser opens a WebRTC connection directly to OpenAI's Realtime API
 * using the short-lived client secret minted here — so this class only
 * ever makes plain, short-lived HTTPS requests, not anything long-lived.
 *
 * @see https://developers.openai.com/api/docs/guides/realtime-webrtc
 */
class OpenAiClient
{
    private const BASE_URL = 'https://api.openai.com/v1';

    public function __construct(
        private readonly ?string $apiKey = null,
    ) {}

    /**
     * Mint a short-lived client secret the browser can use to open a
     * WebRTC session directly with OpenAI's Realtime API, playing the
     * given persona. The secret is scoped to one realtime session and
     * expires quickly server-side, so it's safe to hand straight to the
     * browser.
     *
     * @return array{value: string, expires_at: int|string|null}
     */
    public function mintRealtimeClientSecret(string $instructions, string $greeting): array
    {
        $response = $this->client()
            ->post('/realtime/client_secrets', [
                'session' => [
                    'type' => 'realtime',
                    'model' => config('services.openai.realtime_model'),
                    'instructions' => $instructions."\n\nOpen the call by saying, in character: \"{$greeting}\"",
                    'audio' => [
                        'output' => [
                            'voice' => config('services.openai.realtime_voice'),
                        ],
                        'input' => [
                            'transcription' => [
                                'model' => config('services.openai.transcribe_model'),
                            ],
                        ],
                    ],
                ],
            ])
            ->throw();

        $body = $response->json();

        return [
            'value' => $body['value'],
            'expires_at' => $body['expires_at'] ?? null,
        ];
    }

    /**
     * Grade a finished transcript against the given rubric criteria,
     * returning a structured 0-5 score plus feedback per criterion and an
     * overall 0-100 score with a short summary.
     *
     * @param  array<int, array{role: string, text: string}>  $transcript
     * @param  array<int, array{key: string, label: string, description: string}>  $rubric
     * @return array{criteria: array<int, array{key: string, score: int, feedback: string}>, overall_score: int, summary: string}
     */
    public function scoreTranscript(array $transcript, array $rubric): array
    {
        $transcriptText = collect($transcript)
            ->map(fn (array $turn) => sprintf(
                '%s: %s',
                $turn['role'] === 'agent' ? 'Agent' : 'Prospect',
                $turn['text'],
            ))
            ->implode("\n");

        $rubricText = collect($rubric)
            ->map(fn (array $criterion) => "- {$criterion['key']} ({$criterion['label']}): {$criterion['description']}")
            ->implode("\n");

        $response = $this->client()
            ->post('/chat/completions', [
                'model' => config('services.openai.scoring_model'),
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'You are a sales coaching expert grading a roleplayed cold call transcript between a sales agent and an AI-played prospect. Score only the agent\'s performance, one integer 0-5 per rubric criterion (0 = not attempted/handled very poorly, 5 = excellent), with one or two sentences of specific, actionable feedback per criterion referencing what the agent actually said. Also give an overall 0-100 score and a 2-3 sentence summary of the call.',
                    ],
                    [
                        'role' => 'user',
                        'content' => "Rubric:\n{$rubricText}\n\nTranscript:\n{$transcriptText}",
                    ],
                ],
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => [
                        'name' => 'roleplay_score',
                        'strict' => true,
                        'schema' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'required' => ['criteria', 'overall_score', 'summary'],
                            'properties' => [
                                'criteria' => [
                                    'type' => 'array',
                                    'items' => [
                                        'type' => 'object',
                                        'additionalProperties' => false,
                                        'required' => ['key', 'score', 'feedback'],
                                        'properties' => [
                                            'key' => ['type' => 'string', 'enum' => array_column($rubric, 'key')],
                                            'score' => ['type' => 'integer', 'minimum' => 0, 'maximum' => 5],
                                            'feedback' => ['type' => 'string'],
                                        ],
                                    ],
                                ],
                                'overall_score' => ['type' => 'integer', 'minimum' => 0, 'maximum' => 100],
                                'summary' => ['type' => 'string'],
                            ],
                        ],
                    ],
                ],
            ])
            ->throw();

        $content = $response->json('choices.0.message.content');

        if (! is_string($content)) {
            throw new RuntimeException('OpenAI scoring response did not include structured content.');
        }

        return json_decode($content, associative: true, flags: JSON_THROW_ON_ERROR);
    }

    private function client(): PendingRequest
    {
        $key = $this->apiKey ?? config('services.openai.key');

        if (! $key) {
            throw new RuntimeException('OpenAI is not configured. Set OPENAI_API_KEY.');
        }

        return Http::withToken($key)
            ->baseUrl(self::BASE_URL)
            ->timeout(30);
    }
}
