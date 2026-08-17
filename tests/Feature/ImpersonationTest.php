<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('super admin can impersonate an agent and return', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($superAdmin)
        ->post(route('users.impersonate', $agent))
        ->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($agent);
    expect(session('impersonator_id'))->toBe($superAdmin->id);

    $this->delete(route('impersonate.stop'))
        ->assertRedirect(route('users.index'));

    $this->assertAuthenticatedAs($superAdmin);
    expect(session()->has('impersonator_id'))->toBeFalse();
});

test('admin can impersonate an agent but not another admin', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->post(route('users.impersonate', $agent))
        ->assertRedirect(route('dashboard'));

    $this->assertAuthenticatedAs($agent);

    $this->actingAs($admin)
        ->post(route('users.impersonate', $otherAdmin))
        ->assertForbidden();
});

test('a user cannot impersonate themselves', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->post(route('users.impersonate', $superAdmin))
        ->assertForbidden();
});

test('agent cannot impersonate anyone', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $otherAgent = User::factory()->create();
    $otherAgent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('users.impersonate', $otherAgent))
        ->assertForbidden();
});

test('cannot stop impersonation when not impersonating', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->delete(route('impersonate.stop'))
        ->assertForbidden();
});

test('cannot start a second impersonation while already impersonating', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $agentOne = User::factory()->create();
    $agentOne->assignRole('agent');

    $agentTwo = User::factory()->create();
    $agentTwo->assignRole('agent');

    $this->actingAs($superAdmin)
        ->post(route('users.impersonate', $agentOne))
        ->assertRedirect(route('dashboard'));

    $this->post(route('users.impersonate', $agentTwo))
        ->assertForbidden();
});
