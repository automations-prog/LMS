<?php

namespace App\Jobs;

use App\Actions\SyncTrainingProgressForUser;
use App\Models\User;
use App\Services\CustomerApiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class LinkPitchHealthUsersToXcelJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Match every not-yet-linked Pitch Health user to their XCEL student
     * record by email, so the onboarding review table — which only shows
     * a Pitch Health agent once they're linked — has something to show.
     *
     * Runs both right after a Pitch Health pull (XCEL may already have the
     * record) and nightly (to catch anyone XCEL didn't have yet at pull
     * time, but does by the next morning).
     */
    public function handle(CustomerApiClient $client, SyncTrainingProgressForUser $sync): void
    {
        $pending = User::query()
            ->where('source', User::SOURCE_PITCH_HEALTH)
            ->whereNull('excel_id')
            ->get();

        if ($pending->isEmpty()) {
            Log::info('Pitch Health → XCEL link finished.', ['matched' => 0, 'unmatched' => 0]);

            return;
        }

        // MySQL's `email` column is case-insensitive, so the roster lookup
        // has to compare the same way — see the Pitch Health sync jobs for
        // the same reasoning.
        $roster = collect($client->eachStudent())
            ->filter(fn (array $student) => ! empty($student['email']))
            ->keyBy(fn (array $student) => mb_strtolower($student['email']));

        $matched = 0;
        $unmatched = 0;

        foreach ($pending as $user) {
            $student = $roster->get(mb_strtolower($user->email));

            if (! $student || empty($student['id'])) {
                $unmatched++;

                continue;
            }

            $user->update(['excel_id' => $student['id']]);

            try {
                $sync->handle($user, $client);
            } catch (Throwable $e) {
                // The link itself succeeded — losing this run's training
                // progress isn't worth failing the whole match over, and
                // the regular 4-hourly sync will pick it up next time.
                Log::warning('Training progress sync failed right after linking a Pitch Health user to XCEL.', [
                    'user_id' => $user->id,
                    'excel_id' => $student['id'],
                    'error' => $e->getMessage(),
                ]);
            }

            $matched++;
        }

        Log::info('Pitch Health → XCEL link finished.', [
            'matched' => $matched,
            'unmatched' => $unmatched,
        ]);
    }
}
