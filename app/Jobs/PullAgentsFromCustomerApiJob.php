<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\CustomerApiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PullAgentsFromCustomerApiJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Pull every student from the Customer API and create a local agent
     * account for each one that isn't already registered by email.
     */
    public function handle(CustomerApiClient $client): void
    {
        $created = 0;
        $skipped = 0;

        foreach ($client->eachStudent() as $student) {
            $email = $student['email'] ?? null;

            if (! $email) {
                $skipped++;

                continue;
            }

            if (User::where('email', $email)->exists()) {
                $skipped++;

                continue;
            }

            $name = trim(($student['firstName'] ?? '').' '.($student['lastName'] ?? ''));

            $user = User::create([
                'name' => $name !== '' ? $name : $email,
                'email' => $email,
                'password' => 'password',
                'excel_id' => $student['id'] ?? null,
                'metadata' => collect($student)->except(['id', 'email'])->all(),
            ]);

            $user->syncRoles(['agent']);

            $created++;
        }

        Log::info('Customer API agent pull finished.', [
            'created' => $created,
            'skipped' => $skipped,
        ]);
    }
}
