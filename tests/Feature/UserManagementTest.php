<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('super admin can view the user list', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->get(route('users.index'))
        ->assertOk();
});

test('super admin can create an admin', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->post(route('users.store'), [
            'name' => 'New Admin',
            'email' => 'new-admin@example.com',
            'password' => 'Password123!',
            'role' => 'admin',
        ])
        ->assertRedirect(route('users.index'));

    $this->assertTrue(User::whereEmail('new-admin@example.com')->first()?->hasRole('admin'));
});

test('admin can create an agent but not an admin', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->post(route('users.store'), [
            'name' => 'New Agent',
            'email' => 'new-agent@example.com',
            'password' => 'Password123!',
            'role' => 'agent',
        ])
        ->assertRedirect(route('users.index'));

    $this->assertTrue(User::whereEmail('new-agent@example.com')->first()?->hasRole('agent'));

    $this->actingAs($admin)
        ->post(route('users.store'), [
            'name' => 'New Admin',
            'email' => 'blocked-admin@example.com',
            'password' => 'Password123!',
            'role' => 'admin',
        ])
        ->assertSessionHasErrors('role');
});

test('admin cannot edit another admin', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('users.edit', $otherAdmin))
        ->assertForbidden();
});

test('agent cannot access user management', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('users.index'))
        ->assertForbidden();
});
