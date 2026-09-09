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

class SyncAllAgentsTrainingProgressJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Refresh every linked agent's XCEL training progress from the
     * Customer API. Runs on a schedule so admins see current data without
     * having to open each agent's page first.
     */
    public function handle(CustomerApiClient $client, SyncTrainingProgressForUser $sync): void
    {
        $synced = 0;
        $failed = 0;

        User::role('agent')
            ->whereNotNull('excel_id')
            ->each(function (User $agent) use ($client, $sync, &$synced, &$failed) {
                try {
                    $sync->handle($agent, $client);
                    $synced++;
                } catch (Throwable $e) {
                    $failed++;

                    Log::warning('Training progress sync failed for agent.', [
                        'user_id' => $agent->id,
                        'excel_id' => $agent->excel_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            });

        Log::info('Scheduled training progress sync finished.', [
            'synced' => $synced,
            'failed' => $failed,
        ]);
    }
}
