<?php

use App\Models\EligibilityAttestation;
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

test('onboarding.show 404s for a user who is not an agent', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('onboarding.show', $otherAdmin))
        ->assertNotFound();
});
