<?php

use App\Models\User;
use App\Notifications\AgentInviteNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

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

test('super admin can create an admin directly with a password, active immediately', function () {
    Notification::fake();

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

    $newAdmin = User::whereEmail('new-admin@example.com')->first();

    $this->assertTrue($newAdmin?->hasRole('admin'));
    expect($newAdmin->is_active)->toBeTrue();
    expect(Hash::check('Password123!', $newAdmin->password))->toBeTrue();

    Notification::assertNothingSent();
});

test('creating an admin without a password is rejected', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $this->actingAs($superAdmin)
        ->post(route('users.store'), [
            'name' => 'New Admin',
            'email' => 'new-admin@example.com',
            'role' => 'admin',
        ])
        ->assertSessionHasErrors('password');

    $this->assertNull(User::whereEmail('new-admin@example.com')->first());
});

test('admin can create an agent but not an admin', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $referer = route('users.index', ['page' => 2]);

    $this->actingAs($admin)
        ->from($referer)
        ->post(route('users.store'), [
            'name' => 'New Agent',
            'email' => 'new-agent@example.com',
            'role' => 'agent',
        ])
        ->assertRedirect($referer);

    $newAgent = User::whereEmail('new-agent@example.com')->first();

    $this->assertTrue($newAgent?->hasRole('agent'));
    Notification::assertSentTo($newAgent, AgentInviteNotification::class);

    $this->actingAs($admin)
        ->post(route('users.store'), [
            'name' => 'New Admin',
            'email' => 'blocked-admin@example.com',
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
