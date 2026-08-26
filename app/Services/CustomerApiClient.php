<?php

namespace App\Services;

use Generator;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class CustomerApiClient
{
    private const PAGE_SIZE = 50;

    public function __construct(
        private readonly ?string $domain = null,
        private readonly ?string $apiKey = null,
        private readonly ?string $locationId = null,
    ) {}

    /**
     * Fetch a single page of the location's training progress report.
     *
     * @return array{pagedResults: array{pageNumber: int, pageSize: int, pagesCount: int, resultsCount: int}, students: array<int, array<string, mixed>>}
     */
    public function fetchTrainingProgressPage(int $pageIndex): array
    {
        $domain = $this->domain ?? config('services.customer_api.domain');
        $locationId = $this->locationId ?? config('services.customer_api.location_id');
        $apiKey = $this->apiKey ?? config('services.customer_api.key');

        if (! $domain || ! $locationId || ! $apiKey) {
            throw new RuntimeException('Customer API is not configured. Set CUSTOMER_API_DOMAIN, CUSTOMER_API_KEY, and CUSTOMER_API_LOCATION_ID.');
        }

        $response = Http::withHeaders(['X-OCD-ApiKey' => $apiKey])
            ->baseUrl(rtrim($domain, '/'))
            ->get("/services/CustomerApi.svc/locations/{$locationId}/trainingprogress", [
                'PageIndex' => $pageIndex,
                'PageSize' => self::PAGE_SIZE,
                'includeChildren' => 'false',
            ])
            ->throw();

        return $response->json();
    }

    /**
     * Lazily yield every student across every page of the report.
     *
     * @return Generator<int, array<string, mixed>>
     */
    public function eachStudent(): Generator
    {
        $pageIndex = 0;

        do {
            $page = $this->fetchTrainingProgressPage($pageIndex);

            foreach ($page['students'] ?? [] as $student) {
                yield $student;
            }

            $pagedResults = $page['pagedResults'] ?? [];
            $pageNumber = (int) ($pagedResults['pageNumber'] ?? 1);
            $pagesCount = (int) ($pagedResults['pagesCount'] ?? 1);

            $pageIndex++;
        } while ($pageNumber < $pagesCount);
    }
}
