<?php

namespace App\Services;

use Generator;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class AirtableClient
{
    public function __construct(
        private readonly ?string $token = null,
        private readonly ?string $baseId = null,
        private readonly ?string $tableId = null,
    ) {}

    /**
     * Fetch a single page of records from the Pitch Health table.
     *
     * @return array{records: array<int, array{id: string, createdTime: string, fields: array<string, mixed>}>, offset?: string}
     */
    public function fetchPitchHealthPage(?string $offset = null): array
    {
        return $this->fetchPage(
            baseId: $this->baseId ?? config('services.airtable.pitch_health_base_id'),
            tableId: $this->tableId ?? config('services.airtable.pitch_health_table_id'),
            token: $this->token ?? config('services.airtable.token'),
            offset: $offset,
            missingConfigMessage: 'Airtable is not configured. Set AIRTABLE_API_TOKEN, AIRTABLE_PITCH_HEALTH_BASE_ID, and AIRTABLE_PITCH_HEALTH_TABLE_ID.',
        );
    }

    /**
     * Lazily yield every Pitch Health record across every page, following
     * the `offset` Airtable returns until a page comes back without one.
     *
     * @return Generator<int, array{id: string, createdTime: string, fields: array<string, mixed>}>
     */
    public function eachPitchHealthRecord(): Generator
    {
        yield from $this->eachPage(fn (?string $offset) => $this->fetchPitchHealthPage($offset));
    }

    /**
     * Fetch a single page of records from the PitchPerfect table.
     *
     * @return array{records: array<int, array{id: string, createdTime: string, fields: array<string, mixed>}>, offset?: string}
     */
    public function fetchPitchPerfectPage(?string $offset = null): array
    {
        return $this->fetchPage(
            baseId: config('services.airtable.pitchperfect_base_id'),
            tableId: config('services.airtable.pitchperfect_table_id'),
            // PitchPerfect lives in a different Airtable base, which may
            // need its own token — fall back to the shared one so a single
            // token covering both bases still works.
            token: config('services.airtable.pitchperfect_token') ?? config('services.airtable.token'),
            offset: $offset,
            missingConfigMessage: 'Airtable is not configured. Set AIRTABLE_PITCHPERFECT_TOKEN (or AIRTABLE_API_TOKEN), AIRTABLE_PITCHPERFECT_BASE_ID, and AIRTABLE_PITCHPERFECT_TABLE_ID.',
        );
    }

    /**
     * Lazily yield every PitchPerfect record across every page, following
     * the `offset` Airtable returns until a page comes back without one.
     *
     * @return Generator<int, array{id: string, createdTime: string, fields: array<string, mixed>}>
     */
    public function eachPitchPerfectRecord(): Generator
    {
        yield from $this->eachPage(fn (?string $offset) => $this->fetchPitchPerfectPage($offset));
    }

    /**
     * Fetch a single page of records from any Airtable table.
     *
     * @return array{records: array<int, array{id: string, createdTime: string, fields: array<string, mixed>}>, offset?: string}
     */
    private function fetchPage(?string $baseId, ?string $tableId, ?string $token, ?string $offset, string $missingConfigMessage): array
    {
        if (! $token || ! $baseId || ! $tableId) {
            throw new RuntimeException($missingConfigMessage);
        }

        $response = Http::withToken($token)
            ->baseUrl("https://api.airtable.com/v0/{$baseId}")
            ->get("/{$tableId}", array_filter(['offset' => $offset]))
            ->throw();

        return $response->json();
    }

    /**
     * Page through a single table using the given page-fetcher, yielding
     * every record until a page comes back without an `offset`.
     *
     * @param  callable(?string): array{records: array<int, array{id: string, createdTime: string, fields: array<string, mixed>}>, offset?: string}  $fetchPage
     * @return Generator<int, array{id: string, createdTime: string, fields: array<string, mixed>}>
     */
    private function eachPage(callable $fetchPage): Generator
    {
        $offset = null;

        do {
            $page = $fetchPage($offset);

            foreach ($page['records'] as $record) {
                yield $record;
            }

            $offset = $page['offset'] ?? null;
        } while ($offset !== null);
    }
}
