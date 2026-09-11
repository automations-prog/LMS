<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\PitchHealthSyncCompletedNotification;
use App\Services\AirtableClient;
use App\Support\PullProgress;
use Illuminate\Bus\Batch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class PullPitchHealthFromAirtableJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Small enough that a single chunk job comfortably finishes well
    // inside the queue worker's default 60s timeout, however large the
    // whole base gets.
    private const BATCH_SIZE = 50;

    /**
     * Paging through every record is still one job, but the network calls
     * involved can add up on a large base — give it room the per-chunk
     * write jobs below don't need.
     */
    public int $timeout = 300;

    /**
     * @param  User|null  $triggeredBy  The admin who clicked "Pull Pitch
     *                                  Health", or null when the nightly
     *                                  schedule ran this instead of a person.
     * @param  string|null  $progressId  The id the "Pull Pitch Health"
     *                                   dialog is polling for a progress
     *                                   bar, or null when nothing is
     *                                   watching (the nightly schedule).
     */
    public function __construct(
        private readonly ?User $triggeredBy = null,
        private readonly ?string $progressId = null,
    ) {}

    /**
     * Page through every record in the Pitch Health Airtable table, then
     * hand the actual writes off to small batched jobs
     * (SyncPitchHealthRecordsBatchJob) instead of doing them all in this
     * one job — a large base's worth of upserts and user creations could
     * otherwise run long enough to hit the queue worker's timeout.
     */
    public function handle(AirtableClient $client): void
    {
        $records = iterator_to_array($client->eachPitchHealthRecord(), false);

        $synced = count($records);
        $created = $this->countPendingAccounts($records);

        $triggeredBy = $this->triggeredBy;

        if ($records === []) {
            if ($this->progressId) {
                PullProgress::finish($this->progressId);
            }

            self::notifyResult($triggeredBy, $synced, $created);

            return;
        }

        $jobs = collect($records)
            ->chunk(self::BATCH_SIZE)
            ->map(fn ($chunk) => new SyncPitchHealthRecordsBatchJob($chunk->values()->all()))
            ->all();

        $batch = Bus::batch($jobs)
            ->name('pitch-health-sync')
            ->allowFailures()
            ->finally(function (Batch $batch) use ($triggeredBy, $synced, $created) {
                self::notifyResult($triggeredBy, $synced, $created);
                // Linking newly-created Pitch Health users to their XCEL
                // record no longer happens right after the pull — disabled
                // for now, see LinkPitchHealthUsersToXcelJob. The nightly
                // schedule (routes/console.php) still runs it separately.
            })
            ->dispatch();

        if ($this->progressId) {
            PullProgress::attach($this->progressId, $batch);
        }
    }

    /**
     * How many of these records' emails don't have an account yet — an
     * up-front count so the completion notification can report a number
     * without waiting on every batch job to report back its own tally.
     *
     * @param  array<int, array{id: string, createdTime: string, fields: array<string, mixed>}>  $records
     */
    private function countPendingAccounts(array $records): int
    {
        // MySQL's `email` column is case-insensitive, so two records whose
        // emails only differ by case are really the same account — compare
        // the same way SyncPitchHealthRecordsBatchJob does, or this count
        // won't match what actually gets created.
        $emails = collect($records)
            ->map(fn (array $record) => $record['fields']['Email'] ?? $record['fields']['Personal email'] ?? null)
            ->filter()
            ->unique(fn (string $email) => mb_strtolower($email))
            ->values();

        $existingEmails = User::query()
            ->whereIn(DB::raw('LOWER(email)'), $emails->map(fn (string $email) => mb_strtolower($email)))
            ->pluck('email')
            ->map(fn (string $email) => mb_strtolower($email))
            ->flip();

        return $emails->reject(fn (string $email) => $existingEmails->has(mb_strtolower($email)))->count();
    }

    /**
     * Send the same "pull finished" notifications the pre-batching job
     * used to send inline, once every batch job has run.
     */
    private static function notifyResult(?User $triggeredBy, int $synced, int $created): void
    {
        // Same pattern as the agent roster pull: a manual click always gets
        // a definitive answer, even "0 synced" confirms the click did
        // something, while the unattended nightly run only notifies
        // reviewers when there's actually something to see.
        if ($triggeredBy) {
            $triggeredBy->notify(new PitchHealthSyncCompletedNotification($synced, $created));
        }

        if ($synced > 0) {
            $reviewers = User::onboardingReviewers();

            if ($triggeredBy) {
                $reviewers = $reviewers->reject(fn (User $reviewer) => $reviewer->is($triggeredBy));
            }

            Notification::send($reviewers, new PitchHealthSyncCompletedNotification($synced, $created));
        }

        Log::info('Pitch Health sync finished.', [
            'synced' => $synced,
            'created' => $created,
        ]);
    }
}
