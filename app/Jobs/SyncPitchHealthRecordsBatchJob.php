<?php

namespace App\Jobs;

use App\Models\PitchHealthSubmission;
use App\Models\User;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncPitchHealthRecordsBatchJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param  array<int, array{id: string, createdTime: string, fields: array<string, mixed>}>  $records  One page-sized slice of the full Pitch Health pull — kept small so this job comfortably finishes well inside the queue worker's timeout no matter how large the whole base gets.
     */
    public function __construct(
        private readonly array $records,
    ) {}

    /**
     * Mirror this slice of records into `pitch_health_submissions`, then
     * create an active agent account for each email in it that isn't
     * already registered — same as PullAgentsFromCustomerApiJob.
     *
     * Each record is handled independently, on purpose: with hundreds of
     * records sharing a chunk, one bad one (an unparseable date, a
     * duplicate email that only differs by case, ...) must not take the
     * rest of the chunk down with it.
     */
    public function handle(): void
    {
        // The whole batch may have been cancelled (e.g. a later chunk kept
        // failing) — no point doing more writes once that's happened.
        if ($this->batch()?->cancelled()) {
            return;
        }

        foreach ($this->records as $record) {
            try {
                $this->syncSubmission($record);
            } catch (Throwable $e) {
                Log::warning('Skipped a Pitch Health submission that failed to save.', [
                    'airtable_record_id' => $record['id'],
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // MySQL's `email` column is case-insensitive, so both the lookup
        // itself and the comparison below have to match that — an exact
        // string match here would miss "Jane@x.com" against an existing
        // "jane@x.com", and the create() below would blow up on the
        // unique index instead of being skipped.
        $emails = collect($this->records)
            ->map(fn (array $record) => $this->email($record))
            ->filter()
            ->unique(fn (string $email) => mb_strtolower($email))
            ->values();

        $existingEmails = User::query()
            ->whereIn(DB::raw('LOWER(email)'), $emails->map(fn (string $email) => mb_strtolower($email)))
            ->pluck('email')
            ->map(fn (string $email) => mb_strtolower($email))
            ->flip();

        foreach ($this->records as $record) {
            $email = $this->email($record);

            if (! $email || $existingEmails->has(mb_strtolower($email))) {
                continue;
            }

            try {
                $user = $this->createAgent($record, $email);

                // Avoid creating a second account for the same email if it
                // appears more than once within this chunk.
                $existingEmails->put(mb_strtolower($email), $user->id);
            } catch (Throwable $e) {
                Log::warning('Skipped creating a Pitch Health agent account.', [
                    'airtable_record_id' => $record['id'],
                    'email' => $email,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * @param  array{id: string, createdTime: string, fields: array<string, mixed>}  $record
     */
    private function syncSubmission(array $record): void
    {
        $fields = $record['fields'];

        PitchHealthSubmission::updateOrCreate(
            ['airtable_record_id' => $record['id']],
            [
                'email' => $this->email($record),
                'full_name' => $fields['Full Name'] ?? null,
                'submitted_at' => $fields['Submitted At'] ?? null,
                'metadata' => $fields,
                'synced_at' => now(),
            ],
        );
    }

    /**
     * @param  array{id: string, createdTime: string, fields: array<string, mixed>}  $record
     */
    private function createAgent(array $record, string $email): User
    {
        $fields = $record['fields'];

        // Unlike UserController::store's admin-created agents, a
        // Pitch-Health-pulled agent is active immediately with a default
        // password — the invite/signed-link flow is only for agents
        // created by hand through the Users form.
        $user = User::create([
            'name' => $fields['Full Name'] ?? $email,
            'email' => $email,
            'password' => 'password',
            'is_active' => true,
            // Every pulled agent shares that same default password, so
            // flag the account until they change it — the dashboard banner
            // reads this to nag them.
            'must_change_password' => true,
            'source' => User::SOURCE_PITCH_HEALTH,
            // Everything else from the Airtable record, same as
            // PullAgentsFromCustomerApiJob — `pitch_health_submissions`
            // already keeps the raw record, this is just a quick-access
            // copy on the account itself.
            'metadata' => collect($fields)->except(['Email', 'Personal email'])->all(),
        ]);

        $user->syncRoles(['agent']);

        return $user;
    }

    /**
     * @param  array{id: string, createdTime: string, fields: array<string, mixed>}  $record
     */
    private function email(array $record): ?string
    {
        return $record['fields']['Email'] ?? $record['fields']['Personal email'] ?? null;
    }
}
