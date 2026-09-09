<?php

use App\Models\AhipCertification;
use App\Models\AuditLog;
use App\Models\EligibilityAttestation;
use App\Models\LicenseSubmission;
use App\Models\TrainingCompletion;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('an eligibility decision writes an audit log entry with the actor and status change', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('eligibility.decision', $attestation), ['status' => 'cleared'])
        ->assertRedirect();

    $entry = AuditLog::query()->where('auditable_id', $attestation->id)
        ->where('auditable_type', (new EligibilityAttestation)->getMorphClass())
        ->firstOrFail();

    expect($entry->actor_id)->toBe($admin->id);
    expect($entry->action)->toBe('eligibility.decision');
    expect($entry->from_status)->toBe(EligibilityAttestation::STATUS_PENDING);
    expect($entry->to_status)->toBe('cleared');
});

test('a training rejection writes an audit log entry carrying the reviewer note', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $completion = TrainingCompletion::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('training.decision', $completion), [
            'status' => 'rejected',
            'note' => 'Certificate is illegible.',
        ])
        ->assertRedirect();

    $entry = $completion->auditLogs()->firstOrFail();

    expect($entry->to_status)->toBe('rejected');
    expect($entry->note)->toBe('Certificate is illegible.');
});

test('a license decision writes an audit log entry, and a no-op decision does not', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $submission = LicenseSubmission::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('license.decision', $submission), ['status' => 'verified'])
        ->assertRedirect();

    expect($submission->auditLogs()->count())->toBe(1);

    // Re-submitting the same status is a no-op in the controller — no
    // second audit entry for a click that changed nothing.
    $this->actingAs($admin)
        ->post(route('license.decision', $submission), ['status' => 'verified'])
        ->assertRedirect();

    expect($submission->auditLogs()->count())->toBe(1);
});

test('bulk AHIP certification decisions write one audit log entry per updated agent', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $first = User::factory()->create();
    $first->assignRole('agent');
    AhipCertification::factory()->for($first)->create();

    $second = User::factory()->create();
    $second->assignRole('agent');
    AhipCertification::factory()->for($second)->create();

    $this->actingAs($admin)
        ->post(route('ahip-certification.bulk-decision'), [
            'user_ids' => [$first->id, $second->id],
            'status' => 'verified',
        ])
        ->assertRedirect();

    expect(AuditLog::where('action', 'ahip_certification.decision')->count())->toBe(2);
});

test('the onboarding review page surfaces the combined audit trail, newest first', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create();

    $this->actingAs($admin)->post(route('eligibility.decision', $attestation), ['status' => 'cleared']);
    $this->actingAs($admin)->post(route('eligibility.decision', $attestation), ['status' => 'not_eligible']);

    $this->actingAs($admin)
        ->get(route('onboarding.show', $agent))
        ->assertInertia(fn ($page) => $page
            ->component('admin/onboarding/show')
            ->has('auditLog', 2)
            ->where('auditLog.0.to_status', 'not_eligible')
            ->where('auditLog.1.to_status', 'cleared'));
});
