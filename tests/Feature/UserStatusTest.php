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
