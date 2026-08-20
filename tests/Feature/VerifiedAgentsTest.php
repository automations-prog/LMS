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

function createFullyVerifiedAgent(array $attributes = []): User
{
    $agent = User::factory()->create($attributes);
    $agent->assignRole('agent');

    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'contracting_complete_at' => now(),
    ]);
    TrainingCompletion::factory()->for($agent)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
    ]);
    LicenseSubmission::factory()->for($agent)->create([
        'status' => LicenseSubmission::STATUS_VERIFIED,
    ]);
    AhipCertification::factory()->for($agent)->create([
        'status' => AhipCertification::STATUS_VERIFIED,
    ]);

    return $agent;
}

test('guests are redirected to login on the verified agents route', function () {
    $this->get(route('agents.index'))->assertRedirect(route('login'));
});

test('a non-privileged agent is forbidden from the verified agents route', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)->get(route('agents.index'))->assertForbidden();
});

test('the verified agents list only includes agents who cleared every stage and contracting', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $verified = createFullyVerifiedAgent();

    $partiallyVerified = User::factory()->create();
    $partiallyVerified->assignRole('agent');
    EligibilityAttestation::factory()->for($partiallyVerified)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'contracting_complete_at' => now(),
    ]);
    TrainingCompletion::factory()->for($partiallyVerified)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
    ]);
    // No license submission or AHIP certification — should not show up.

    $clearedButNotContracted = User::factory()->create();
    $clearedButNotContracted->assignRole('agent');
    EligibilityAttestation::factory()->for($clearedButNotContracted)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);
    TrainingCompletion::factory()->for($clearedButNotContracted)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
    ]);
    LicenseSubmission::factory()->for($clearedButNotContracted)->create([
        'status' => LicenseSubmission::STATUS_VERIFIED,
    ]);
    AhipCertification::factory()->for($clearedButNotContracted)->create([
        'status' => AhipCertification::STATUS_VERIFIED,
    ]);

    $response = $this->actingAs($admin)
        ->get(route('agents.index'))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('admin/agents/index')
        ->has('agents.data', 1)
        ->where('agents.data.0.id', $verified->id));
});

test('the verified agents list can be searched by agent name or email', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $match = createFullyVerifiedAgent(['name' => 'Findable Person']);
    createFullyVerifiedAgent(['name' => 'Someone Else']);

    $response = $this->actingAs($admin)
        ->get(route('agents.index', ['search' => 'Findable']))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->has('agents.data', 1)
        ->where('agents.data.0.name', 'Findable Person'));
});
