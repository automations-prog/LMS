<?php

use App\Jobs\LinkPitchHealthUsersToXcelJob;
use App\Jobs\PullAgentsFromCustomerApiJob;
use App\Jobs\PullPitchHealthFromAirtableJob;
use App\Jobs\PullPitchPerfectFromAirtableJob;
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

// Keep each agent's Pitch Health data (from the Airtable onboarding form)
// in step with Airtable overnight, instead of relying on an admin clicking
// "Pull Pitch Health".
Schedule::job(new PullPitchHealthFromAirtableJob)
    ->dailyAt('03:00')
    ->name('sync-pitch-health')
    ->onOneServer();

// Catch any Pitch Health user XCEL didn't have a matching student record
// for at pull time (03:00) but does by now — the pull itself already tries
// this right after each sync, this is just the nightly safety net.
Schedule::job(new LinkPitchHealthUsersToXcelJob)
    ->dailyAt('03:30')
    ->name('link-pitch-health-to-xcel')
    ->onOneServer();

// Keep each agent's PitchPerfect data (from the Airtable onboarding form)
// in step with Airtable overnight, instead of relying on an admin clicking
// "Pull PitchPerfect".
Schedule::job(new PullPitchPerfectFromAirtableJob)
    ->dailyAt('04:00')
    ->name('sync-pitch-perfect')
    ->onOneServer();

// Warn agents before a verified license or AHIP certification lapses —
// once a day is plenty since reminders are matched on the exact day.
Schedule::job(new SendExpiryRemindersJob)
    ->dailyAt('08:00')
    ->name('send-expiry-reminders')
    ->onOneServer();
