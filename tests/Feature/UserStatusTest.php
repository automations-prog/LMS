<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('suspended user cannot log in', function () {
    $user = User::factory()->create([
        'password' => 'password',
        'is_active' => false,
    ]);
    $user->assignRole('agent');

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ])->assertSessionHasErrors('email');

    $this->assertGuest();
});

test('an already logged-in user is logged out once suspended', function () {
    $user = User::factory()->create();
    $user->assignRole('agent');

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk();

    $user->update(['is_active' => false]);

    $this->get(route('dashboard'))
        ->assertRedirect(route('login'));

    $this->assertGuest();
});

test('admin can suspend and reactivate an agent', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $referer = route('users.index', ['page' => 2]);

    $this->actingAs($admin)
        ->from($referer)
        ->patch(route('users.update-status', $agent))
        ->assertRedirect($referer);

    expect($agent->fresh()->is_active)->toBeFalse();

    $this->actingAs($admin)
        ->from($referer)
        ->patch(route('users.update-status', $agent))
        ->assertRedirect($referer);

    expect($agent->fresh()->is_active)->toBeTrue();
});

test('a user cannot change their own status', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->patch(route('users.update-status', $superAdmin))
        ->assertForbidden();
});

test('admin cannot change another admin\'s status', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->patch(route('users.update-status', $otherAdmin))
        ->assertForbidden();
});

test('user list can be filtered by search and role', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $match = User::factory()->create(['name' => 'Findable Person']);
    $match->assignRole('agent');

    $other = User::factory()->create(['name' => 'Someone Else']);
    $other->assignRole('admin');

    $response = $this->actingAs($superAdmin)
        ->get(route('users.index', ['search' => 'Findable']))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->has('users.data', 1)
        ->where('users.data.0.name', 'Findable Person'));

    $response = $this->actingAs($superAdmin)
        ->get(route('users.index', ['role' => 'admin']))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->has('users.data', 1)
        ->where('users.data.0.name', 'Someone Else'));
});

test('admin can bulk suspend agents but not admins in the same batch', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agentOne = User::factory()->create();
    $agentOne->assignRole('agent');

    $agentTwo = User::factory()->create();
    $agentTwo->assignRole('agent');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->post(route('users.bulk-suspend'), [
            'user_ids' => [$agentOne->id, $agentTwo->id, $otherAdmin->id, $admin->id],
        ])
        ->assertRedirect();

    expect($agentOne->fresh()->is_active)->toBeFalse();
    expect($agentTwo->fresh()->is_active)->toBeFalse();
    expect($otherAdmin->fresh()->is_active)->toBeTrue();
    expect($admin->fresh()->is_active)->toBeTrue();
});

test('bulk suspend skips admins, self, and applies only to allowed targets', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)->post(route('users.bulk-suspend'), [
        'user_ids' => [$agent->id, $otherAdmin->id, $admin->id],
    ]);

    expect($agent->fresh()->is_active)->toBeFalse();
    expect($otherAdmin->fresh()->is_active)->toBeTrue();
    expect($admin->fresh()->is_active)->toBeTrue();
});

test('agent cannot bulk suspend anyone', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $otherAgent = User::factory()->create();
    $otherAgent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('users.bulk-suspend'), ['user_ids' => [$otherAgent->id]])
        ->assertForbidden();

    expect($otherAgent->fresh()->is_active)->toBeTrue();
});

test('admin can bulk delete agents but not admins or self', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agentOne = User::factory()->create();
    $agentOne->assignRole('agent');

    $agentTwo = User::factory()->create();
    $agentTwo->assignRole('agent');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)->post(route('users.bulk-destroy'), [
        'user_ids' => [$agentOne->id, $agentTwo->id, $otherAdmin->id, $admin->id],
    ]);

    expect(User::find($agentOne->id))->toBeNull();
    expect(User::find($agentTwo->id))->toBeNull();
    expect(User::find($otherAdmin->id))->not->toBeNull();
    expect(User::find($admin->id))->not->toBeNull();
});

test('bulk delete cannot wipe out the last super admin', function () {
    $superAdmin = User::whereHas('roles', fn ($q) => $q->where('name', 'super-admin'))->first();
    $secondSuperAdmin = User::factory()->create();
    $secondSuperAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)->post(route('users.bulk-destroy'), [
        'user_ids' => [$secondSuperAdmin->id],
    ]);

    expect(User::find($secondSuperAdmin->id))->toBeNull();

    // Only one super admin left now (the bootstrap seeded one) — deleting it
    // via a second bulk request must be blocked.
    $this->actingAs($superAdmin)->post(route('users.bulk-destroy'), [
        'user_ids' => [$superAdmin->id],
    ]);

    expect(User::find($superAdmin->id))->not->toBeNull();
});

test('agent cannot bulk delete anyone', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $otherAgent = User::factory()->create();
    $otherAgent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('users.bulk-destroy'), ['user_ids' => [$otherAgent->id]])
        ->assertForbidden();

    expect(User::find($otherAgent->id))->not->toBeNull();
});

test('last_login_at is recorded on a real login but not during impersonation', function () {
    $superAdmin = User::factory()->create(['password' => 'password']);
    $superAdmin->assignRole('super-admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    expect($superAdmin->last_login_at)->toBeNull();

    $this->post(route('login.store'), [
        'email' => $superAdmin->email,
        'password' => 'password',
    ]);

    expect($superAdmin->fresh()->last_login_at)->not->toBeNull();

    $this->actingAs($superAdmin)
        ->post(route('users.impersonate', $agent));

    expect($agent->fresh()->last_login_at)->toBeNull();
});
