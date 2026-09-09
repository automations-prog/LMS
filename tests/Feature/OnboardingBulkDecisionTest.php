<?php

use App\Models\AhipCertification;
use App\Models\EligibilityAttestation;
use App\Models\LicenseSubmission;
use App\Models\TrainingCompletion;
use App\Models\User;
use App\Notifications\AhipCertificationDecisionNotification;
use App\Notifications\EligibilityDecisionNotification;
use App\Notifications\LicenseDecisionNotification;
use App\Notifications\TrainingDecisionNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('a non-reviewer agent is forbidden from every bulk-decision route', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('eligibility.bulk-decision'), ['user_ids' => [$agent->id], 'status' => 'cleared'])
        ->assertForbidden();

    $this->actingAs($agent)
        ->post(route('training.bulk-decision'), ['user_ids' => [$agent->id], 'status' => 'verified'])
        ->assertForbidden();

    $this->actingAs($agent)
        ->post(route('license.bulk-decision'), ['user_ids' => [$agent->id], 'status' => 'verified'])
        ->assertForbidden();

    $this->actingAs($agent)
        ->post(route('ahip-certification.bulk-decision'), ['user_ids' => [$agent->id], 'status' => 'verified'])
        ->assertForbidden();

    $this->actingAs($agent)
        ->post(route('eligibility.bulk-contracting-stages'), ['user_ids' => [$agent->id], 'stage' => 'confirmed'])
        ->assertForbidden();
});

test('bulk eligibility decision updates every selected agent and skips agents without an attestation', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $withAttestation = User::factory()->create();
    $withAttestation->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($withAttestation)->create();

    $withoutAttestation = User::factory()->create();
    $withoutAttestation->assignRole('agent');

    $this->actingAs($admin)
        ->post(route('eligibility.bulk-decision'), [
            'user_ids' => [$withAttestation->id, $withoutAttestation->id],
            'status' => 'cleared',
        ])
        ->assertRedirect();

    expect($attestation->fresh()->status)->toBe(EligibilityAttestation::STATUS_CLEARED);
    expect($attestation->fresh()->reviewed_by)->toBe($admin->id);
    Notification::assertSentTo($withAttestation, EligibilityDecisionNotification::class);
});

test('bulk training decision requires a note only when rejecting, and applies it to every selected completion', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $first = User::factory()->create();
    $first->assignRole('agent');
    $firstCompletion = TrainingCompletion::factory()->for($first)->create();

    $second = User::factory()->create();
    $second->assignRole('agent');
    $secondCompletion = TrainingCompletion::factory()->for($second)->create();

    $this->actingAs($admin)
        ->post(route('training.bulk-decision'), [
            'user_ids' => [$first->id, $second->id],
            'status' => 'rejected',
        ])
        ->assertSessionHasErrors('note');

    $this->actingAs($admin)
        ->post(route('training.bulk-decision'), [
            'user_ids' => [$first->id, $second->id],
            'status' => 'rejected',
            'note' => 'Please re-upload a clearer certificate.',
        ])
        ->assertRedirect();

    expect($firstCompletion->fresh()->status)->toBe(TrainingCompletion::STATUS_REJECTED);
    expect($firstCompletion->fresh()->note)->toBe('Please re-upload a clearer certificate.');
    expect($secondCompletion->fresh()->status)->toBe(TrainingCompletion::STATUS_REJECTED);
    expect($secondCompletion->fresh()->note)->toBe('Please re-upload a clearer certificate.');

    Notification::assertSentTo($first, TrainingDecisionNotification::class);
    Notification::assertSentTo($second, TrainingDecisionNotification::class);
});

test('bulk training decision is a no-op for a completion already at the target status', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $completion = TrainingCompletion::factory()->for($agent)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
    ]);
    $reviewedAt = $completion->reviewed_at;

    $this->actingAs($admin)
        ->post(route('training.bulk-decision'), [
            'user_ids' => [$agent->id],
            'status' => 'verified',
        ])
        ->assertRedirect();

    expect($completion->fresh()->reviewed_at)->toEqual($reviewedAt);
    Notification::assertNothingSent();
});

test('bulk license decision updates selected submissions and requires a note when rejecting', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $submission = LicenseSubmission::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('license.bulk-decision'), [
            'user_ids' => [$agent->id],
            'status' => 'rejected',
        ])
        ->assertSessionHasErrors('note');

    $this->actingAs($admin)
        ->post(route('license.bulk-decision'), [
            'user_ids' => [$agent->id],
            'status' => 'verified',
        ])
        ->assertRedirect();

    expect($submission->fresh()->status)->toBe(LicenseSubmission::STATUS_VERIFIED);
    Notification::assertSentTo($agent, LicenseDecisionNotification::class);
});

test('bulk AHIP decision updates selected certifications and requires a note when rejecting', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $certification = AhipCertification::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('ahip-certification.bulk-decision'), [
            'user_ids' => [$agent->id],
            'status' => 'rejected',
        ])
        ->assertSessionHasErrors('note');

    $this->actingAs($admin)
        ->post(route('ahip-certification.bulk-decision'), [
            'user_ids' => [$agent->id],
            'status' => 'verified',
        ])
        ->assertRedirect();

    expect($certification->fresh()->status)->toBe(AhipCertification::STATUS_VERIFIED);
    Notification::assertSentTo($agent, AhipCertificationDecisionNotification::class);
});

test('bulk advancing to a stage stamps every required prerequisite not yet reached', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('eligibility.bulk-contracting-stages'), [
            'user_ids' => [$agent->id],
            'stage' => 'issued',
        ])
        ->assertRedirect();

    $attestation->refresh();

    expect($attestation->contracting_confirmed_at)->not->toBeNull();
    expect($attestation->contracting_forwarded_at)->not->toBeNull();
    expect($attestation->contracting_issued_at)->not->toBeNull();
    expect($attestation->contracting_carrier_certs_at)->toBeNull();
    expect($attestation->contracting_complete_at)->toBeNull();
});

test('bulk advancing to a stage never rewinds an agent already further along', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $completedAt = now()->subDay();
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'contracting_confirmed_at' => $completedAt,
        'contracting_forwarded_at' => $completedAt,
        'contracting_issued_at' => $completedAt,
        'contracting_complete_at' => $completedAt,
    ]);

    $this->actingAs($admin)
        ->post(route('eligibility.bulk-contracting-stages'), [
            'user_ids' => [$agent->id],
            'stage' => 'confirmed',
        ])
        ->assertRedirect();

    // Already-checked stages keep their original timestamp, and stages
    // ahead of the requested one are left completely untouched.
    expect($attestation->fresh()->contracting_confirmed_at->toDateTimeString())->toBe($completedAt->toDateTimeString());
    expect($attestation->fresh()->contracting_complete_at)->not->toBeNull();
});

test('bulk advancing to a stage skips agents with no attestation at all', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($admin)
        ->post(route('eligibility.bulk-contracting-stages'), [
            'user_ids' => [$agent->id],
            'stage' => 'confirmed',
        ])
        ->assertRedirect();

    expect($agent->fresh()->eligibilityAttestation)->toBeNull();
});
