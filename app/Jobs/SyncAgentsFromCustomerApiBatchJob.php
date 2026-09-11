<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncAgentsFromCustomerApiBatchJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param  array<int, array<string, mixed>>  $students  One page-sized slice of the full Customer API roster pull — kept small so this job comfortably finishes well inside the queue worker's timeout no matter how large the whole roster gets.
     */
    public function __construct(
        private readonly array $students,
    ) {}

    /**
     * Create an active agent account for each student in this slice that
     * isn't already registered by email.
     *
     * Each student is created independently, on purpose: with dozens of
     * students sharing a chunk, one bad one (a malformed email, a
     * duplicate that only differs by case, ...) must not take the rest of
     * the chunk down with it.
     */
    public function handle(): void
    {
        // The whole batch may have been cancelled (e.g. a later chunk kept
        // failing) — no point doing more writes once that's happened.
        if ($this->batch()?->cancelled()) {
            return;
        }

        $emails = collect($this->students)
            ->map(fn (array $student) => $student['email'] ?? null)
            ->filter()
            ->unique()
            ->values();

        $existingEmails = User::whereIn('email', $emails)->pluck('email')->flip();

        foreach ($this->students as $student) {
            $email = $student['email'] ?? null;

            if (! $email || $existingEmails->has($email)) {
                continue;
            }

            try {
                $user = $this->createAgent($student, $email);

                // Avoid creating a second account for the same email if it
                // appears more than once within this chunk.
                $existingEmails->put($email, $user->id);
            } catch (Throwable $e) {
                Log::warning('Skipped creating a Customer API agent account.', [
                    'excel_id' => $student['id'] ?? null,
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function createAgent(array $student, string $email): User
    {
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

        return $user;
    }
}
