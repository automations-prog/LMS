<?php

use App\Models\EligibilityAttestation;
use App\Models\RoleplaySession;
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

test('an agent with no eligibility attestation yet is shared as having none', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('eligibility.create'))
        ->assertInertia(fn ($page) => $page->where('eligibilityStatus', null));
});

test('an agent whose eligibility is still under review is shared as such', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_PENDING,
    ]);

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('eligibilityStatus', 'under_review'));
});

test('an agent whose eligibility has been decided is shared as such', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('eligibilityStatus', 'cleared'));
});

test('eligibilityStatus is not computed for admins', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->where('eligibilityStatus', null));
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

test('filtering the dashboard by eligibility status narrows the pipeline-stage stats and charts', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $pendingAgent = User::factory()->create();
    $pendingAgent->assignRole('agent');
    EligibilityAttestation::factory()->for($pendingAgent)->create([
        'status' => EligibilityAttestation::STATUS_PENDING,
    ]);
    TrainingCompletion::factory()->for($pendingAgent)->create();

    $clearedAgent = User::factory()->create();
    $clearedAgent->assignRole('agent');
    EligibilityAttestation::factory()->for($clearedAgent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);
    TrainingCompletion::factory()->for($clearedAgent)->create();

    $this->actingAs($admin)
        ->get(route('dashboard', ['eligibility_status' => EligibilityAttestation::STATUS_PENDING]))
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('filters.eligibility_status', EligibilityAttestation::STATUS_PENDING)
            // Only the pending agent's records count now.
            ->where('stats.pending_eligibility_reviews', 1)
            ->where('stats.pending_training_reviews', 1)
            ->where('charts.eligibility_by_status.0.value', 1)
            ->where('charts.eligibility_by_status.2.value', 0));
});

test('combining two dashboard status filters narrows to agents matching both', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    // Matches both filters.
    $matching = User::factory()->create();
    $matching->assignRole('agent');
    EligibilityAttestation::factory()->for($matching)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);
    TrainingCompletion::factory()->for($matching)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
    ]);

    // Cleared, but training still pending — shouldn't count.
    $partial = User::factory()->create();
    $partial->assignRole('agent');
    EligibilityAttestation::factory()->for($partial)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);
    TrainingCompletion::factory()->for($partial)->create();

    $this->actingAs($admin)
        ->get(route('dashboard', [
            'eligibility_status' => EligibilityAttestation::STATUS_CLEARED,
            'training_status' => TrainingCompletion::STATUS_VERIFIED,
        ]))
        ->assertInertia(fn ($page) => $page
            ->where('stats.pending_eligibility_reviews', 0)
            ->where('charts.onboarding_stage_status.0.verified', 1));
});

test('clearing the dashboard filters restores the unfiltered totals', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $first = User::factory()->create();
    $first->assignRole('agent');
    EligibilityAttestation::factory()->for($first)->create();

    $second = User::factory()->create();
    $second->assignRole('agent');
    EligibilityAttestation::factory()->for($second)->create();

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('filters.eligibility_status', '')
            ->where('stats.pending_eligibility_reviews', 2));
});

test('a dashboard status filter does not affect the org-wide role or signup charts', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_NOT_ELIGIBLE,
    ]);

    $this->actingAs($admin)
        ->get(route('dashboard', ['eligibility_status' => EligibilityAttestation::STATUS_PENDING]))
        ->assertInertia(fn ($page) => $page
            // Both agent and admin still counted — users_by_role isn't a
            // pipeline-stage chart, so the filter shouldn't touch it.
            ->where('charts.users_by_role.0.value', 1)
            ->where('charts.users_by_role.1.value', 1));
});

test('the management dashboard reports the average score across scored roleplay calls', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    RoleplaySession::factory()->scored()->create(['overall_score' => 60]);
    RoleplaySession::factory()->scored()->create(['overall_score' => 81]);
    // Not scored yet — shouldn't count toward either stat.
    RoleplaySession::factory()->completed()->create();

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('stats.roleplay_sessions_scored', 2)
            ->where('stats.roleplay_avg_score', 70.5));
});

test('the management dashboard reports no average roleplay score when nothing has been scored yet', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('stats.roleplay_sessions_scored', 0)
            ->where('stats.roleplay_avg_score', null));
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
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $response = $this->actingAs($agent)->get(route('dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->component('dashboard-agent')
        ->where('eligibilityStatus', 'cleared')
        ->missing('stats')
        ->missing('recent')
        ->missing('charts')
        // The dashboard is blank apart from the "under review" notice and
        // the credential expiry banners — the full onboarding step tracker
        // lives on its own page now, see onboarding.journey tests below.
        ->missing('enrollmentCompleted')
        ->missing('trainingStatus'));
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

test('the under-review notice also shows on the onboarding journey page', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->flaggedForWaiver()->for($agent)->create();

    $this->actingAs($agent)
        ->get(route('onboarding.journey'))
        ->assertInertia(fn ($page) => $page
            ->component('onboarding-journey')
            ->where('eligibilityStatus', 'under_review'));
});

test('a cleared eligibility attestation shows the enrollment steps on the onboarding journey page', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $this->actingAs($agent)
        ->get(route('onboarding.journey'))
        ->assertInertia(fn ($page) => $page
            ->component('onboarding-journey')
            ->where('eligibilityStatus', 'cleared')
            ->where('enrollmentCompleted', false));
});

test('once enrollment is marked done, the onboarding journey page reflects that', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'enrollment_completed_at' => now(),
    ]);

    $this->actingAs($agent)
        ->get(route('onboarding.journey'))
        ->assertInertia(fn ($page) => $page
            ->component('onboarding-journey')
            ->where('eligibilityStatus', 'cleared')
            ->where('enrollmentCompleted', true));
});

test('an agent with no eligibility attestation is redirected to the eligibility form from the onboarding journey page', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('onboarding.journey'))
        ->assertRedirect(route('eligibility.create'));
});

test('an admin cannot view the onboarding journey page', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('onboarding.journey'))
        ->assertNotFound();
});

test('a not-eligible attestation is reflected on the onboarding journey page', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_NOT_ELIGIBLE,
    ]);

    $this->actingAs($agent)
        ->get(route('onboarding.journey'))
        ->assertInertia(fn ($page) => $page
            ->component('onboarding-journey')
            ->where('eligibilityStatus', 'not_eligible'));
});

test('the onboarding journey page reflects no training submission once enrollment is done', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'enrollment_completed_at' => now(),
    ]);

    $this->actingAs($agent)
        ->get(route('onboarding.journey'))
        ->assertInertia(fn ($page) => $page
            ->component('onboarding-journey')
            ->where('trainingStatus', null)
            ->where('trainingNote', null));
});

test('the onboarding journey page shows the rejection note only while training is rejected', function () {
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
        ->get(route('onboarding.journey'))
        ->assertInertia(fn ($page) => $page
            ->component('onboarding-journey')
            ->where('trainingStatus', 'rejected')
            ->where('trainingNote', 'Please re-upload a clearer scan.'));
});

test('the onboarding journey page reports verified training status', function () {
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
        ->get(route('onboarding.journey'))
        ->assertInertia(fn ($page) => $page
            ->component('onboarding-journey')
            ->where('trainingStatus', 'verified')
            ->where('trainingNote', null));
});
