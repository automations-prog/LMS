<?php

use App\Jobs\SendExpiryRemindersJob;
use App\Models\AhipCertification;
use App\Models\LicenseSubmission;
use App\Models\User;
use App\Notifications\AhipCertificationExpiringNotification;
use App\Notifications\LicenseExpiringNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('it reminds agents whose verified license expires in exactly 60, 30, or 7 days', function () {
    Notification::fake();

    $in60 = User::factory()->create();
    $in60->assignRole('agent');
    LicenseSubmission::factory()->verified()->for($in60)->create(['expires_at' => now()->addDays(60)]);

    $in45 = User::factory()->create();
    $in45->assignRole('agent');
    LicenseSubmission::factory()->verified()->for($in45)->create(['expires_at' => now()->addDays(45)]);

    $in7 = User::factory()->create();
    $in7->assignRole('agent');
    LicenseSubmission::factory()->verified()->for($in7)->create(['expires_at' => now()->addDays(7)]);

    $pendingWithFarExpiry = User::factory()->create();
    $pendingWithFarExpiry->assignRole('agent');
    LicenseSubmission::factory()->for($pendingWithFarExpiry)->create(['expires_at' => now()->addDays(30)]);

    (new SendExpiryRemindersJob)->handle();

    Notification::assertSentTo($in60, LicenseExpiringNotification::class);
    Notification::assertSentTo($in7, LicenseExpiringNotification::class);
    Notification::assertNotSentTo($in45, LicenseExpiringNotification::class);
    Notification::assertNotSentTo($pendingWithFarExpiry, LicenseExpiringNotification::class);
});

test('it reminds agents whose verified AHIP certification expires in exactly 60, 30, or 7 days', function () {
    Notification::fake();

    $in30 = User::factory()->create();
    $in30->assignRole('agent');
    AhipCertification::factory()->verified()->for($in30)->create(['expires_at' => now()->addDays(30)]);

    $in90 = User::factory()->create();
    $in90->assignRole('agent');
    AhipCertification::factory()->verified()->for($in90)->create(['expires_at' => now()->addDays(90)]);

    (new SendExpiryRemindersJob)->handle();

    Notification::assertSentTo($in30, AhipCertificationExpiringNotification::class);
    Notification::assertNotSentTo($in90, AhipCertificationExpiringNotification::class);
});
