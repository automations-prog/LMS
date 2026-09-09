<?php

use App\Models\EligibilityAttestation;
use App\Models\TrainingCompletion;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    EligibilityAttestation::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('admins and super admins see the management dashboard', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->component('dashboard'));
});

test('the management dashboard reports pending review counts instead of resource counts', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    EligibilityAttestation::factory()->create();
    EligibilityAttestation::factory()->flaggedForWaiver()->create();
    EligibilityAttestation::factory()->create(['status' => EligibilityAttestation::STATUS_CLEARED]);
    TrainingCompletion::factory()->create();

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('stats.pending_eligibility_reviews', 2)
            ->where('stats.pending_training_reviews', 1)
            ->missing('stats.total_resources')
            ->missing('stats.published_resources')
            ->missing('charts.resources_by_status')
            ->has('charts.eligibility_by_status'));
});

test('the onboarding funnel counts agents per checkpoint and averages days since submission', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    // Submitted 10 days ago, reached enrollment 4 days after that.
    EligibilityAttestation::factory()->create([
        'created_at' => now()->subDays(10),
        'enrollment_completed_at' => now()->subDays(6),
    ]);

    // Submitted 20 days ago, reached enrollment 10 days after that —
    // averages to 7 days across both records.
    EligibilityAttestation::factory()->create([
        'created_at' => now()->subDays(20),
        'enrollment_completed_at' => now()->subDays(10),
    ]);

    // Submitted but hasn't reached enrollment yet.
    EligibilityAttestation::factory()->create([
        'created_at' => now()->subDays(2),
        'enrollment_completed_at' => null,
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('charts.onboarding_funnel.0.key', 'submitted')
            ->where('charts.onboarding_funnel.0.count', 3)
            ->where('charts.onboarding_funnel.1.key', 'enrollment')
            ->where('charts.onboarding_funnel.1.count', 2)
            ->where('charts.onboarding_funnel.1.avg_days', 7));
});

test('agents see the agent dashboard, with no user-management or resource data', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create();

    $response = $this->actingAs($agent)->get(route('dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->component('dashboard-agent')
        ->missing('stats')
        ->missing('recent')
        ->missing('charts'));
});

test('an agent with no eligibility attestation is redirected to the eligibility form from the dashboard', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertRedirect(route('eligibility.create'));
});

test('a pending eligibility attestation shows the under-review notice on the agent dashboard', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_PENDING,
    ]);

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-agent')
            ->where('eligibilityStatus', 'under_review'));
});

test('a flagged-for-waiver attestation also shows the under-review notice on the agent dashboard', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->flaggedForWaiver()->for($agent)->create();

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-agent')
            ->where('eligibilityStatus', 'under_review'));
});

test('a cleared eligibility attestation shows the enrollment steps on the agent dashboard', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-agent')
            ->where('eligibilityStatus', 'cleared')
            ->where('enrollmentCompleted', false));
});

test('once enrollment is marked done, the dashboard reflects that', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'enrollment_completed_at' => now(),
    ]);

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-agent')
            ->where('eligibilityStatus', 'cleared')
            ->where('enrollmentCompleted', true));
});

test('a not-eligible attestation shows neither the under-review notice nor the enrollment steps', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_NOT_ELIGIBLE,
    ]);

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-agent')
            ->where('eligibilityStatus', 'not_eligible'));
});

test('the dashboard reflects no training submission once enrollment is done', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'enrollment_completed_at' => now(),
    ]);

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-agent')
            ->where('trainingStatus', null)
            ->where('trainingNote', null));
});

test('the dashboard shows the rejection note only while training is rejected', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'enrollment_completed_at' => now(),
    ]);
    TrainingCompletion::factory()->rejected()->for($agent)->create([
        'note' => 'Please re-upload a clearer scan.',
    ]);

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-agent')
            ->where('trainingStatus', 'rejected')
            ->where('trainingNote', 'Please re-upload a clearer scan.'));
});

test('the dashboard reports verified training status', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'enrollment_completed_at' => now(),
    ]);
    TrainingCompletion::factory()->for($agent)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
    ]);

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-agent')
            ->where('trainingStatus', 'verified')
            ->where('trainingNote', null));
});
