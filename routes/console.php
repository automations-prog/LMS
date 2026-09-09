<?php

use App\Jobs\PullAgentsFromCustomerApiJob;
use App\Jobs\SendExpiryRemindersJob;
use App\Jobs\SyncAllAgentsTrainingProgressJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Keep the local agent roster in step with the Customer API roster
// overnight, instead of relying on an admin clicking "pull agents".
Schedule::job(new PullAgentsFromCustomerApiJob)
    ->dailyAt('02:00')
    ->name('sync-agent-roster')
    ->onOneServer();

// Refresh every agent's XCEL training progress a few times a day so the
// admin dashboard and agent-facing progress page stay current between
// visits, without waiting on an on-demand page load to trigger the sync.
Schedule::job(new SyncAllAgentsTrainingProgressJob)
    ->everyFourHours()
    ->name('sync-training-progress')
    ->onOneServer();

// Warn agents before a verified license or AHIP certification lapses —
// once a day is plenty since reminders are matched on the exact day.
Schedule::job(new SendExpiryRemindersJob)
    ->dailyAt('08:00')
    ->name('send-expiry-reminders')
    ->onOneServer();
