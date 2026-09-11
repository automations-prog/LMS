<?php

use App\Models\User;
use App\Support\FeatureAccess;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('a feature with no toggle row is enabled by default', function () {
    $user = User::factory()->create(['agent_type' => 'fronter']);

    expect(FeatureAccess::enabledFor($user, 'roleplay'))->toBeTrue();
});

test('a user with no agent_type is never restricted', function () {
    $user = User::factory()->create(['agent_type' => null]);

    FeatureAccess::setEnabled('fronter', 'roleplay', false);

    expect(FeatureAccess::enabledFor($user, 'roleplay'))->toBeTrue();
});

test('disabling a feature for a segment blocks every user in that segment', function () {
    $user = User::factory()->create(['agent_type' => 'fronter']);

    FeatureAccess::setEnabled('fronter', 'roleplay', false);

    expect(FeatureAccess::enabledFor($user, 'roleplay'))->toBeFalse();

    FeatureAccess::setEnabled('fronter', 'roleplay', true);

    expect(FeatureAccess::enabledFor($user, 'roleplay'))->toBeTrue();
});

test('the feature grid covers every agent type x feature combination', function () {
    FeatureAccess::setEnabled('medicare_agent', 'roleplay', false);

    $grid = FeatureAccess::grid();

    expect($grid)->toHaveCount(count(User::AGENT_TYPES) * count(config('features')));

    $medicare = $grid->firstWhere('agent_type', 'medicare_agent');

    expect($medicare['enabled'])->toBeFalse();
});

test('only an admin with features.manage can view the feature access page', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('features.index'))
        ->assertForbidden();

    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->get(route('features.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/features/index'));
});

test('an admin without features.manage cannot toggle a feature', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->put(route('features.update'), [
            'agent_type' => 'fronter',
            'feature' => 'roleplay',
            'enabled' => false,
        ])
        ->assertForbidden();
});

test('a super admin can toggle a feature off for a segment', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->put(route('features.update'), [
            'agent_type' => 'fronter',
            'feature' => 'roleplay',
            'enabled' => false,
        ])
        ->assertRedirect();

    $agent = User::factory()->create(['agent_type' => 'fronter']);

    expect(FeatureAccess::enabledFor($agent, 'roleplay'))->toBeFalse();
});
