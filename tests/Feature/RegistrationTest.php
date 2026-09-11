<?php

use App\Models\User;
use App\Notifications\AccountApprovedNotification;
use App\Notifications\NewAgentRegistrationNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('the registration page is reachable', function () {
    $this->get(route('register'))->assertOk();
});

test('registering creates an inactive agent account pending approval', function () {
    Notification::fake();

    $this->post(route('register.store'), [
        'name' => 'New Agent',
        'email' => 'new-agent@example.com',
        'company_name' => 'Acme Insurance',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertRedirect(route('login'));

    $user = User::whereEmail('new-agent@example.com')->first();

    expect($user)->not->toBeNull()
        ->and($user->is_active)->toBeFalse()
        ->and($user->source)->toBe(User::SOURCE_SELF_REGISTERED)
        ->and($user->company_name)->toBe('Acme Insurance')
        ->and($user->hasRole('agent'))->toBeTrue();
});

test('registering does not leave the visitor logged in', function () {
    $this->post(route('register.store'), [
        'name' => 'New Agent',
        'email' => 'new-agent@example.com',
        'company_name' => 'Acme Insurance',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $this->assertGuest();
});

test('registering notifies every account approver', function () {
    Notification::fake();

    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->post(route('register.store'), [
        'name' => 'New Agent',
        'email' => 'new-agent@example.com',
        'company_name' => 'Acme Insurance',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $newUser = User::whereEmail('new-agent@example.com')->first();

    Notification::assertSentTo($superAdmin, NewAgentRegistrationNotification::class);
    Notification::assertNotSentTo($agent, NewAgentRegistrationNotification::class);
    Notification::assertNotSentTo($newUser, NewAgentRegistrationNotification::class);
});

test('a pending self-registered account cannot log in', function () {
    $this->post(route('register.store'), [
        'name' => 'New Agent',
        'email' => 'new-agent@example.com',
        'company_name' => 'Acme Insurance',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ]);

    $this->post(route('login'), [
        'email' => 'new-agent@example.com',
        'password' => 'Password123!',
    ]);

    $this->assertGuest();
});

test('company name is optional when registering', function () {
    $this->post(route('register.store'), [
        'name' => 'New Agent',
        'email' => 'new-agent@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertSessionDoesntHaveErrors('company_name');

    $user = User::whereEmail('new-agent@example.com')->first();

    expect($user)->not->toBeNull()
        ->and($user->company_name)->toBeNull();
});

test('approving a pending self-registered agent notifies them and activates the account', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create([
        'source' => User::SOURCE_SELF_REGISTERED,
        'is_active' => false,
        'company_name' => 'Acme Insurance',
    ]);
    $agent->assignRole('agent');

    $this->actingAs($admin)
        ->patch(route('users.update-status', $agent))
        ->assertRedirect();

    expect($agent->fresh()->is_active)->toBeTrue();

    Notification::assertSentTo($agent, AccountApprovedNotification::class);
});

test('reactivating a previously-suspended (already-approved) agent does not resend the approval email', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    // Already logged in once before — this is a suspend/reactivate cycle,
    // not a first approval.
    $agent = User::factory()->create([
        'source' => User::SOURCE_SELF_REGISTERED,
        'is_active' => false,
        'company_name' => 'Acme Insurance',
        'last_login_at' => now()->subDay(),
    ]);
    $agent->assignRole('agent');

    $this->actingAs($admin)
        ->patch(route('users.update-status', $agent))
        ->assertRedirect();

    expect($agent->fresh()->is_active)->toBeTrue();

    Notification::assertNotSentTo($agent, AccountApprovedNotification::class);
});

test('approving a manually-created user never sends the self-registration approval email', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create([
        'source' => User::SOURCE_MANUAL,
        'is_active' => false,
    ]);
    $agent->assignRole('agent');

    $this->actingAs($admin)
        ->patch(route('users.update-status', $agent))
        ->assertRedirect();

    Notification::assertNotSentTo($agent, AccountApprovedNotification::class);
});
