<?php

namespace App\Actions;

use App\Models\TrainingProgress;
use App\Models\User;
use App\Services\CustomerApiClient;

class SyncTrainingProgressForUser
{
    /**
     * Pull the user's training programs from the Customer API and upsert
     * them into training_progresses. Shared by the on-demand controller
     * sync (one agent, on page view) and the scheduled bulk sync (every
     * agent, run periodically) so both stay in lockstep.
     *
     * Throws on any API/HTTP failure — callers decide how to handle that
     * (fall back to last-synced data, log and move on, etc.).
     */
    public function handle(User $user, CustomerApiClient $client): void
    {
        if (! $user->excel_id) {
            return;
        }

        $response = $client->fetchUserTrainingProgress($user->excel_id);
        $programs = $response['TrainingPrograms'] ?? $response['trainingPrograms'] ?? [];

        foreach ($programs as $program) {
            TrainingProgress::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'enrollment_id' => (string) ($program['EnrollmentId'] ?? $program['ID'] ?? ''),
                ],
                [
                    'metadata' => $program,
                    'synced_at' => now(),
                ],
            );
        }
    }
}
