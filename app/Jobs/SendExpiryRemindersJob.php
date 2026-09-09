<?php

namespace App\Jobs;

use App\Models\AhipCertification;
use App\Models\LicenseSubmission;
use App\Notifications\AhipCertificationExpiringNotification;
use App\Notifications\LicenseExpiringNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class SendExpiryRemindersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * How many days out to warn before a verified license or AHIP
     * certification expires. Matched on the exact day so each agent gets
     * one reminder per milestone rather than one every day this job runs.
     *
     * @var list<int>
     */
    private const REMINDER_MILESTONES = [60, 30, 7];

    /**
     * Send a renewal reminder for every verified license and AHIP
     * certification expiring in exactly 60, 30, or 7 days.
     */
    public function handle(): void
    {
        $sent = 0;

        foreach (self::REMINDER_MILESTONES as $days) {
            $targetDate = Carbon::today()->addDays($days)->toDateString();

            LicenseSubmission::query()
                ->where('status', LicenseSubmission::STATUS_VERIFIED)
                ->whereDate('expires_at', $targetDate)
                ->with('user')
                ->each(function (LicenseSubmission $submission) use ($days, &$sent) {
                    if (! $submission->expires_at) {
                        return;
                    }

                    $submission->user->notify(new LicenseExpiringNotification($submission->expires_at, $days));
                    $sent++;
                });

            AhipCertification::query()
                ->where('status', AhipCertification::STATUS_VERIFIED)
                ->whereDate('expires_at', $targetDate)
                ->with('user')
                ->each(function (AhipCertification $certification) use ($days, &$sent) {
                    if (! $certification->expires_at) {
                        return;
                    }

                    $certification->user->notify(new AhipCertificationExpiringNotification($certification->expires_at, $days));
                    $sent++;
                });
        }

        Log::info('Expiry reminder sweep finished.', ['sent' => $sent]);
    }
}
