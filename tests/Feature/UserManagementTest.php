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

    $referer = route('users.index', ['page' => 2]);

    $this->actingAs($superAdmin)
        ->from($referer)
        ->post(route('users.store'), [
            'name' => 'New Admin',
            'email' => 'new-admin@example.com',
            'password' => 'Password123!',
            'role' => 'admin',
        ])
        ->assertRedirect($referer);

    $this->assertTrue(User::whereEmail('new-admin@example.com')->first()?->hasRole('admin'));
});

test('admin can create an agent but not an admin', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $referer = route('users.index', ['page' => 2]);

    $this->actingAs($admin)
        ->from($referer)
        ->post(route('users.store'), [
            'name' => 'New Agent',
            'email' => 'new-agent@example.com',
            'password' => 'Password123!',
            'role' => 'agent',
        ])
        ->assertRedirect($referer);

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

test('admin cannot update another admin', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->put(route('users.update', $otherAdmin), [
            'name' => $otherAdmin->name,
            'email' => $otherAdmin->email,
            'role' => 'admin',
        ])
        ->assertForbidden();
});

test('admin cannot delete another admin', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->delete(route('users.destroy', $otherAdmin))
        ->assertForbidden();
});

test('a user cannot delete themselves', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->delete(route('users.destroy', $superAdmin))
        ->assertForbidden();
});

test('agent cannot access user management', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('users.index'))
        ->assertForbidden();
});

test('pagination links preserve empty-string filters (regression: ConvertEmptyStringsToNull vs withQueryString)', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');
    User::factory(15)->create()->each(fn ($u) => $u->assignRole('agent'));

    $response = $this->actingAs($superAdmin)
        ->get(route('users.index', ['per_page' => 10, 'role' => '', 'search' => '']));

    $response->assertInertia(function ($page) {
        $links = collect($page->toArray()['props']['users']['links']);
        $nextLink = $links->firstWhere('label', 'Next &raquo;');

        expect($nextLink['url'])
            ->toContain('role=')
            ->toContain('search=')
            ->toContain('page=2');
    });
});
