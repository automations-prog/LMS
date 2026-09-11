<?php

namespace App\Support;

use Illuminate\Bus\Batch;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Cache;

/**
 * Tracks a background data pull (Pull Agents, Pull Pitch Health, Pull
 * PitchPerfect) under a short-lived cache key, keyed by an id the frontend
 * generates before submitting the form — so it can immediately start
 * polling for a progress bar instead of only finding out later via a
 * notification.
 */
class PullProgress
{
    private const TTL_MINUTES = 60;

    /**
     * Record that a pull has been queued, before we even know whether it
     * will need a batch — an empty roster/table never creates one.
     */
    public static function start(string $id): void
    {
        Cache::put(self::key($id), ['status' => 'queued'], now()->addMinutes(self::TTL_MINUTES));
    }

    /**
     * Attach the batch doing the actual work, once it exists.
     */
    public static function attach(string $id, Batch $batch): void
    {
        Cache::put(self::key($id), [
            'status' => 'running',
            'batch_id' => $batch->id,
        ], now()->addMinutes(self::TTL_MINUTES));
    }

    /**
     * Mark a pull as finished without ever needing a batch (nothing to
     * sync).
     */
    public static function finish(string $id): void
    {
        Cache::put(self::key($id), ['status' => 'finished'], now()->addMinutes(self::TTL_MINUTES));
    }

    /**
     * @return array{status: 'queued'|'running'|'finished', total: int, processed: int, progress: int}
     */
    public static function status(string $id): array
    {
        $state = Cache::get(self::key($id));

        // Either this id was never started, or the cache entry expired —
        // either way there's nothing left to wait on.
        if (! $state) {
            return ['status' => 'finished', 'total' => 0, 'processed' => 0, 'progress' => 100];
        }

        if ($state['status'] === 'queued') {
            return ['status' => 'queued', 'total' => 0, 'processed' => 0, 'progress' => 0];
        }

        if ($state['status'] === 'finished') {
            return ['status' => 'finished', 'total' => 0, 'processed' => 0, 'progress' => 100];
        }

        $batch = Bus::findBatch($state['batch_id']);

        // The batch record can be pruned before the frontend stops polling
        // (or, in theory, never existed) — treat that as done too.
        if (! $batch) {
            return ['status' => 'finished', 'total' => 0, 'processed' => 0, 'progress' => 100];
        }

        return [
            'status' => $batch->finished() ? 'finished' : 'running',
            'total' => $batch->totalJobs,
            'processed' => $batch->processedJobs(),
            'progress' => $batch->totalJobs > 0 ? (int) round($batch->progress()) : 100,
        ];
    }

    private static function key(string $id): string
    {
        return "pull-progress:{$id}";
    }
}
