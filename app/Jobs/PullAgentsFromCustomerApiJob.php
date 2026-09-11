<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\RosterSyncCompletedNotification;
use App\Services\CustomerApiClient;
use App\Support\PullProgress;
use Illuminate\Bus\Batch;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class PullAgentsFromCustomerApiJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Small enough that a single chunk job comfortably finishes well
    // inside the queue worker's default 60s timeout, however large the
    // whole roster gets.
    private const BATCH_SIZE = 50;

    /**
     * Paging through every student is still one job, but the network calls
     * involved can add up on a large roster — give it room the per-chunk
     * write jobs below don't need.
     */
    public int $timeout = 300;

    /**
     * @param  User|null  $triggeredBy  The admin who clicked "Pull agents",
     *                                  or null when the nightly schedule ran
     *                                  this instead of a person.
     * @param  string|null  $progressId  The id the "Pull agents" dialog is
     *                                   polling for a progress bar, or null
     *                                   when nothing is watching (the
     *                                   nightly schedule).
     */
    public function __construct(
        private readonly ?User $triggeredBy = null,
        private readonly ?string $progressId = null,
    ) {}

    /**
     * Page through every student in the Customer API roster, then hand the
     * actual account creation off to small batched jobs
     * (SyncAgentsFromCustomerApiBatchJob) instead of doing it all in this
     * one job — a large roster's worth of user creations could otherwise
     * run long enough to hit the queue worker's timeout.
     */
    public function handle(CustomerApiClient $client): void
    {
        // Buffered into an array (rather than staying a lazy generator) so
        // the pending-account count below can happen against one query
        // instead of one query per student.
        $students = iterator_to_array($client->eachStudent(), false);

        $created = $this->countPendingAccounts($students);

        $triggeredBy = $this->triggeredBy;

        if ($students === []) {
            if ($this->progressId) {
                PullProgress::finish($this->progressId);
            }

            self::notifyResult($triggeredBy, $created);

            return;
        }

        $jobs = collect($students)
            ->chunk(self::BATCH_SIZE)
            ->map(fn ($chunk) => new SyncAgentsFromCustomerApiBatchJob($chunk->values()->all()))
            ->all();

        $batch = Bus::batch($jobs)
            ->name('agent-roster-sync')
            ->allowFailures()
            ->finally(function (Batch $batch) use ($triggeredBy, $created) {
                self::notifyResult($triggeredBy, $created);
            })
            ->dispatch();

        if ($this->progressId) {
            PullProgress::attach($this->progressId, $batch);
        }
    }

    /**
     * How many of these students' emails don't have an account yet — an
     * up-front count so the completion notification can report a number
     * without waiting on every batch job to report back its own tally.
     *
     * @param  array<int, array<string, mixed>>  $students
     */
    private function countPendingAccounts(array $students): int
    {
        $emails = collect($students)
            ->map(fn (array $student) => $student['email'] ?? null)
            ->filter()
            ->unique()
            ->values();

        $existingEmails = User::whereIn('email', $emails)->pluck('email')->flip();

        return $emails->reject(fn (string $email) => $existingEmails->has($email))->count();
    }

    /**
     * Send the same "pull finished" notifications the pre-batching job
     * used to send inline, once every batch job has run.
     */
    private static function notifyResult(?User $triggeredBy, int $created): void
    {
        // A manual "Pull agents" click always gets a definitive answer —
        // even "0 new agents" confirms the click did something. The
        // unattended nightly sweep only bothers every reviewer when the
        // roster actually changed; a "0 new agents" email every night would
        // just be noise nobody asked for.
        if ($triggeredBy) {
            $triggeredBy->notify(new RosterSyncCompletedNotification($created));
        }

        if ($created > 0) {
            $reviewers = User::onboardingReviewers();

            if ($triggeredBy) {
                $reviewers = $reviewers->reject(fn (User $reviewer) => $reviewer->is($triggeredBy));
            }

            Notification::send($reviewers, new RosterSyncCompletedNotification($created));
        }

        Log::info('Customer API agent pull finished.', [
            'created' => $created,
        ]);
    }
}
