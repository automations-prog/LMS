<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('guests are redirected to login on role management routes', function () {
    $role = Role::findByName('agent');

    $this->get(route('roles.index'))->assertRedirect(route('login'));
    $this->post(route('roles.store'))->assertRedirect(route('login'));
    $this->put(route('roles.update', $role))->assertRedirect(route('login'));
    $this->delete(route('roles.destroy', $role))->assertRedirect(route('login'));
});

test('a non-super-admin is forbidden from role management routes', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $role = Role::findByName('agent');

    $this->actingAs($admin)->get(route('roles.index'))->assertForbidden();
    $this->actingAs($admin)->post(route('roles.store'))->assertForbidden();
    $this->actingAs($admin)->put(route('roles.update', $role))->assertForbidden();
    $this->actingAs($admin)->delete(route('roles.destroy', $role))->assertForbidden();
});

test('a super admin can create a role with a subset of permissions', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->post(route('roles.store'), [
            'name' => 'coach',
            'permissions' => ['users.view', 'onboarding.review'],
        ])
        ->assertRedirect();

    $role = Role::findByName('coach');

    expect($role->permissions->pluck('name')->all())
        ->toEqualCanonicalizing(['users.view', 'onboarding.review']);
});

test('updating super-admin permissions always results in every permission', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $role = Role::findByName('super-admin');

    $this->actingAs($superAdmin)
        ->put(route('roles.update', $role), [
            'name' => 'super-admin',
            'permissions' => ['users.view'],
        ])
        ->assertRedirect();

    $role->refresh();

    expect($role->permissions->pluck('name')->all())
        ->toEqualCanonicalizing(Permission::pluck('name')->all());
});

test('system roles cannot be renamed or deleted', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $agentRole = Role::findByName('agent');

    $this->actingAs($superAdmin)
        ->put(route('roles.update', $agentRole), [
            'name' => 'renamed-agent',
            'permissions' => ['agents.view'],
        ])
        ->assertRedirect();

    expect($agentRole->refresh()->name)->toBe('agent');

    $this->actingAs($superAdmin)
        ->delete(route('roles.destroy', $agentRole))
        ->assertForbidden();

    expect(Role::where('name', 'agent')->exists())->toBeTrue();
});

test('a custom role with no assigned users can be deleted', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $role = Role::create(['name' => 'coach']);

    $this->actingAs($superAdmin)
        ->delete(route('roles.destroy', $role))
        ->assertRedirect();

    expect(Role::where('name', 'coach')->exists())->toBeFalse();
});

test('a custom role assigned to a user cannot be deleted', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $role = Role::create(['name' => 'coach']);

    $coach = User::factory()->create();
    $coach->assignRole('coach');

    $this->actingAs($superAdmin)
        ->delete(route('roles.destroy', $role))
        ->assertRedirect();

    expect(Role::where('name', 'coach')->exists())->toBeTrue();
});

test('the roles list can be searched by name', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    Role::create(['name' => 'coach']);

    $response = $this->actingAs($superAdmin)
        ->get(route('roles.index', ['search' => 'coach']))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('admin/roles/index')
        ->has('roles.data', 1)
        ->where('roles.data.0.name', 'coach'));
});

test('the roles list is paginated', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    // 3 seeded roles + 8 custom ones = 11, so a per_page of 10 should
    // split across two pages.
    for ($i = 0; $i < 8; $i++) {
        Role::create(['name' => "custom-role-{$i}"]);
    }

    $response = $this->actingAs($superAdmin)
        ->get(route('roles.index', ['per_page' => 10]))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->has('roles.data', 10)
        ->where('roles.total', 11)
        ->where('roles.last_page', 2));
});
