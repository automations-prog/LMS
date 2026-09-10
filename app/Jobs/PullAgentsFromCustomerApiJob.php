<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\RosterSyncCompletedNotification;
use App\Services\CustomerApiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class PullAgentsFromCustomerApiJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * A full roster pull pages through every student one HTTP request at a
     * time, which can comfortably outrun the queue worker's default 60s
     * kill-timeout on a large roster.
     */
    public int $timeout = 300;

    /**
     * @param  User|null  $triggeredBy  The admin who clicked "Pull agents",
     *                                  or null when the nightly schedule ran
     *                                  this instead of a person.
     */
    public function __construct(
        private readonly ?User $triggeredBy = null,
    ) {}

    /**
     * Pull every student from the Customer API and create a local agent
     * account for each one that isn't already registered by email.
     */
    public function handle(CustomerApiClient $client): void
    {
        // Buffered into an array (rather than staying a lazy generator) so
        // every existing-email check below can happen against one query
        // instead of one query per student.
        $students = iterator_to_array($client->eachStudent(), false);

        $emails = collect($students)->pluck('email')->filter()->unique()->values();

        $existingEmails = User::whereIn('email', $emails)->pluck('email')->flip();

        $created = 0;
        $skipped = 0;

        foreach ($students as $student) {
            $email = $student['email'] ?? null;

            if (! $email) {
                $skipped++;

                continue;
            }

            if ($existingEmails->has($email)) {
                $skipped++;

                continue;
            }

            $name = trim(($student['firstName'] ?? '').' '.($student['lastName'] ?? ''));

            // Unlike UserController::store's admin-created agents, a
            // roster-pulled agent is active immediately with a default
            // password — the invite/signed-link flow is only for agents
            // created by hand through the Users form.
            $user = User::create([
                'name' => $name !== '' ? $name : $email,
                'email' => $email,
                'password' => 'password',
                'is_active' => true,
                // Every pulled agent shares that same default password, so
                // flag the account until they change it — the dashboard
                // banner reads this to nag them.
                'must_change_password' => true,
                'excel_id' => $student['id'] ?? null,
                'metadata' => collect($student)->except(['id', 'email'])->all(),
                'source' => User::SOURCE_CUSTOMER_API,
            ]);

            $user->syncRoles(['agent']);

            $created++;
        }

        // A manual "Pull agents" click always gets a definitive answer —
        // even "0 new agents" confirms the click did something. The
        // unattended nightly sweep only bothers every reviewer when the
        // roster actually changed; a "0 new agents" email every night would
        // just be noise nobody asked for.
        if ($this->triggeredBy) {
            $this->triggeredBy->notify(new RosterSyncCompletedNotification($created));
        }

        if ($created > 0) {
            $reviewers = User::onboardingReviewers();

            if ($this->triggeredBy) {
                $reviewers = $reviewers->reject(fn (User $reviewer) => $reviewer->is($this->triggeredBy));
            }

            Notification::send($reviewers, new RosterSyncCompletedNotification($created));
        }

        Log::info('Customer API agent pull finished.', [
            'created' => $created,
            'skipped' => $skipped,
        ]);
    }
}
