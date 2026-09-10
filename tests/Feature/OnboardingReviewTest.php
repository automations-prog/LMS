<?php

use App\Models\AhipCertification;
use App\Models\EligibilityAttestation;
use App\Models\LicenseSubmission;
use App\Models\TrainingCompletion;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('guests are redirected to login on onboarding review routes', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->get(route('onboarding.index'))->assertRedirect(route('login'));
    $this->get(route('onboarding.show', $agent))->assertRedirect(route('login'));
});

test('a non-reviewer agent is forbidden from onboarding review routes', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)->get(route('onboarding.index'))->assertForbidden();
    $this->actingAs($agent)->get(route('onboarding.show', $agent))->assertForbidden();
});

test('the onboarding list shows every agent with both statuses, by default unfiltered', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $withBoth = User::factory()->create();
    $withBoth->assignRole('agent');
    EligibilityAttestation::factory()->for($withBoth)->create(['status' => EligibilityAttestation::STATUS_CLEARED]);
    TrainingCompletion::factory()->for($withBoth)->create();

    $withNeither = User::factory()->create();
    $withNeither->assignRole('agent');

    $response = $this->actingAs($admin)
        ->get(route('onboarding.index'))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('admin/onboarding/index')
        ->has('agents.data', 2));
});

test('a Pitch Health agent without a linked XCEL record is hidden from the onboarding list and its show page', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $unlinked = User::factory()->create(['source' => User::SOURCE_PITCH_HEALTH, 'excel_id' => null]);
    $unlinked->assignRole('agent');

    $linked = User::factory()->create(['source' => User::SOURCE_PITCH_HEALTH, 'excel_id' => 'xcel-1']);
    $linked->assignRole('agent');

    $response = $this->actingAs($admin)
        ->get(route('onboarding.index'))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('admin/onboarding/index')
        ->has('agents.data', 1)
        ->where('agents.data.0.id', $linked->id));

    $this->actingAs($admin)->get(route('onboarding.show', $unlinked))->assertNotFound();
    $this->actingAs($admin)->get(route('onboarding.show', $linked))->assertOk();
});

test('a non-Pitch-Health agent without an XCEL record still shows in the onboarding list', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $manual = User::factory()->create(['source' => User::SOURCE_MANUAL, 'excel_id' => null]);
    $manual->assignRole('agent');

    $response = $this->actingAs($admin)
        ->get(route('onboarding.index'))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('admin/onboarding/index')
        ->has('agents.data', 1));
});

test('the onboarding list is sorted by newest agent first', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $older = User::factory()->create(['created_at' => now()->subDays(2)]);
    $older->assignRole('agent');

    $newer = User::factory()->create(['created_at' => now()]);
    $newer->assignRole('agent');

    $response = $this->actingAs($admin)
        ->get(route('onboarding.index'))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->where('agents.data.0.id', $newer->id)
        ->where('agents.data.1.id', $older->id));
});

test('the onboarding list can be searched by agent name or email', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $match = User::factory()->create(['name' => 'Findable Person']);
    $match->assignRole('agent');

    $other = User::factory()->create(['name' => 'Someone Else']);
    $other->assignRole('agent');

    $response = $this->actingAs($admin)
        ->get(route('onboarding.index', ['search' => 'Findable']))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->has('agents.data', 1)
        ->where('agents.data.0.name', 'Findable Person'));
});

test('the onboarding list can be filtered independently by eligibility status and training status', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $cleared = User::factory()->create();
    $cleared->assignRole('agent');
    EligibilityAttestation::factory()->for($cleared)->create(['status' => EligibilityAttestation::STATUS_CLEARED]);

    $pending = User::factory()->create();
    $pending->assignRole('agent');
    EligibilityAttestation::factory()->for($pending)->create();

    $verifiedTraining = User::factory()->create();
    $verifiedTraining->assignRole('agent');
    TrainingCompletion::factory()->for($verifiedTraining)->create(['status' => TrainingCompletion::STATUS_VERIFIED]);

    $this->actingAs($admin)
        ->get(route('onboarding.index', ['eligibility_status' => 'cleared']))
        ->assertInertia(fn ($page) => $page
            ->has('agents.data', 1)
            ->where('agents.data.0.id', $cleared->id));

    $this->actingAs($admin)
        ->get(route('onboarding.index', ['training_status' => 'verified']))
        ->assertInertia(fn ($page) => $page
            ->has('agents.data', 1)
            ->where('agents.data.0.id', $verifiedTraining->id));
});

test('the onboarding detail page shows both sections, with placeholders when one is missing', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agentWithEligibilityOnly = User::factory()->create();
    $agentWithEligibilityOnly->assignRole('agent');
    EligibilityAttestation::factory()->flaggedForWaiver()->for($agentWithEligibilityOnly)->create();

    $response = $this->actingAs($admin)
        ->get(route('onboarding.show', $agentWithEligibilityOnly))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('admin/onboarding/show')
        ->where('agent.id', $agentWithEligibilityOnly->id)
        ->has('agent.eligibility_attestation')
        ->where('agent.training_completion', null));
});

test('the onboarding list and detail page report enrollment completion', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    // Explicit, distinct created_at values — the list orders newest agent
    // first, and two records created within the same second would otherwise
    // tie and make the ordering assertion below flaky.
    $notYetEnrolled = User::factory()->create(['created_at' => now()->subMinute()]);
    $notYetEnrolled->assignRole('agent');
    EligibilityAttestation::factory()->for($notYetEnrolled)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $enrolled = User::factory()->create(['created_at' => now()]);
    $enrolled->assignRole('agent');
    EligibilityAttestation::factory()->for($enrolled)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'enrollment_completed_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get(route('onboarding.index'))
        ->assertInertia(fn ($page) => $page
            ->where(
                'agents.data.0.eligibility_attestation.enrollment_completed_at',
                fn ($value) => $value !== null,
            )
            ->where(
                'agents.data.1.eligibility_attestation.enrollment_completed_at',
                null,
            ));

    $this->actingAs($admin)
        ->get(route('onboarding.show', $enrolled))
        ->assertInertia(fn ($page) => $page->where(
            'agent.eligibility_attestation.enrollment_completed_at',
            fn ($value) => $value !== null,
        ));

    $this->actingAs($admin)
        ->get(route('onboarding.show', $notYetEnrolled))
        ->assertInertia(fn ($page) => $page->where(
            'agent.eligibility_attestation.enrollment_completed_at',
            null,
        ));
});

test('the onboarding list and detail page report exam scheduling', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $notYetScheduled = User::factory()->create(['created_at' => now()->subMinute()]);
    $notYetScheduled->assignRole('agent');
    EligibilityAttestation::factory()->for($notYetScheduled)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $scheduled = User::factory()->create(['created_at' => now()]);
    $scheduled->assignRole('agent');
    EligibilityAttestation::factory()->for($scheduled)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'exam_scheduled_at' => now(),
        'proctoring_type' => 'remote',
    ]);

    $this->actingAs($admin)
        ->get(route('onboarding.index'))
        ->assertInertia(fn ($page) => $page
            ->where(
                'agents.data.0.eligibility_attestation.exam_scheduled_at',
                fn ($value) => $value !== null,
            )
            ->where(
                'agents.data.1.eligibility_attestation.exam_scheduled_at',
                null,
            ));

    $this->actingAs($admin)
        ->get(route('onboarding.show', $scheduled))
        ->assertInertia(fn ($page) => $page
            ->where(
                'agent.eligibility_attestation.exam_scheduled_at',
                fn ($value) => $value !== null,
            )
            ->where('agent.eligibility_attestation.proctoring_type', 'remote'));

    $this->actingAs($admin)
        ->get(route('onboarding.show', $notYetScheduled))
        ->assertInertia(fn ($page) => $page->where(
            'agent.eligibility_attestation.exam_scheduled_at',
            null,
        ));
});

test('the onboarding list and detail page report license submission status', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $withoutLicense = User::factory()->create(['created_at' => now()->subMinute()]);
    $withoutLicense->assignRole('agent');
    EligibilityAttestation::factory()->for($withoutLicense)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $withLicense = User::factory()->create(['created_at' => now()]);
    $withLicense->assignRole('agent');
    EligibilityAttestation::factory()->for($withLicense)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);
    LicenseSubmission::factory()->for($withLicense)->create([
        'status' => LicenseSubmission::STATUS_VERIFIED,
    ]);

    $this->actingAs($admin)
        ->get(route('onboarding.index'))
        ->assertInertia(fn ($page) => $page
            ->where('agents.data.0.license_submission.status', 'verified')
            ->where('agents.data.1.license_submission', null));

    $this->actingAs($admin)
        ->get(route('onboarding.index', ['license_status' => 'verified']))
        ->assertInertia(fn ($page) => $page
            ->has('agents.data', 1)
            ->where('agents.data.0.id', $withLicense->id));

    $this->actingAs($admin)
        ->get(route('onboarding.show', $withLicense))
        ->assertInertia(fn ($page) => $page->where(
            'agent.license_submission.status',
            'verified',
        ));

    $this->actingAs($admin)
        ->get(route('onboarding.show', $withoutLicense))
        ->assertInertia(fn ($page) => $page->where(
            'agent.license_submission',
            null,
        ));
});

test('the onboarding list and detail page report AHIP certification status', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $withoutAhip = User::factory()->create(['created_at' => now()->subMinute()]);
    $withoutAhip->assignRole('agent');
    EligibilityAttestation::factory()->for($withoutAhip)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $withAhip = User::factory()->create(['created_at' => now()]);
    $withAhip->assignRole('agent');
    EligibilityAttestation::factory()->for($withAhip)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);
    AhipCertification::factory()->for($withAhip)->create([
        'status' => AhipCertification::STATUS_VERIFIED,
    ]);

    $this->actingAs($admin)
        ->get(route('onboarding.index'))
        ->assertInertia(fn ($page) => $page
            ->where('agents.data.0.ahip_certification.status', 'verified')
            ->where('agents.data.1.ahip_certification', null));

    $this->actingAs($admin)
        ->get(route('onboarding.index', ['ahip_status' => 'verified']))
        ->assertInertia(fn ($page) => $page
            ->has('agents.data', 1)
            ->where('agents.data.0.id', $withAhip->id));

    $this->actingAs($admin)
        ->get(route('onboarding.show', $withAhip))
        ->assertInertia(fn ($page) => $page->where(
            'agent.ahip_certification.status',
            'verified',
        ));

    $this->actingAs($admin)
        ->get(route('onboarding.show', $withoutAhip))
        ->assertInertia(fn ($page) => $page->where(
            'agent.ahip_certification',
            null,
        ));
});

test('the onboarding list and detail page report the contracting stages', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'contracting_forwarded_at' => now(),
        'contracting_complete_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get(route('onboarding.index'))
        ->assertInertia(fn ($page) => $page
            ->where(
                'agents.data.0.eligibility_attestation.contracting_forwarded_at',
                fn ($value) => $value !== null,
            )
            ->where(
                'agents.data.0.eligibility_attestation.contracting_confirmed_at',
                null,
            )
            ->where(
                'agents.data.0.eligibility_attestation.contracting_complete_at',
                fn ($value) => $value !== null,
            ));

    $this->actingAs($admin)
        ->get(route('onboarding.show', $agent))
        ->assertInertia(fn ($page) => $page
            ->where(
                'agent.eligibility_attestation.contracting_forwarded_at',
                fn ($value) => $value !== null,
            )
            ->where(
                'agent.eligibility_attestation.contracting_complete_at',
                fn ($value) => $value !== null,
            ));
});

test('onboarding.show 404s for a user who is not an agent', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('onboarding.show', $otherAdmin))
        ->assertNotFound();
});
