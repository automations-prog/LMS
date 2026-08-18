<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function inviteUrl(User $user): string
{
    return URL::temporarySignedRoute('invite.accept', now()->addDays(7), ['user' => $user->id]);
}

test('invite acceptance page renders for a valid signed url', function () {
    $agent = User::factory()->create(['is_active' => false]);
    $agent->assignRole('agent');

    $this->get(inviteUrl($agent))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('auth/set-password')
            ->where('user.email', $agent->email));
});

test('invite acceptance page rejects a tampered signature', function () {
    $agent = User::factory()->create(['is_active' => false]);
    $agent->assignRole('agent');

    $tampered = inviteUrl($agent).'x';

    $this->get($tampered)->assertForbidden();
});

test('invite acceptance page rejects an expired signature', function () {
    $agent = User::factory()->create(['is_active' => false]);
    $agent->assignRole('agent');

    $expired = URL::temporarySignedRoute('invite.accept', now()->subDay(), ['user' => $agent->id]);

    $this->get($expired)->assertForbidden();
});

test('an already authenticated user cannot visit an invite link', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create(['is_active' => false]);
    $agent->assignRole('agent');

    $this->actingAs($admin)
        ->get(inviteUrl($agent))
        ->assertRedirect();
});

test('accepting the invite sets the password, activates, verifies, and logs the user in', function () {
    $agent = User::factory()->create([
        'is_active' => false,
        'email_verified_at' => null,
    ]);
    $agent->assignRole('agent');

    $url = inviteUrl($agent);
    $query = parse_url($url, PHP_URL_QUERY);

    $this->post(route('invite.store', $agent).'?'.$query, [
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ])->assertRedirect(route('eligibility.create'));

    $agent->refresh();

    expect($agent->is_active)->toBeTrue();
    expect($agent->email_verified_at)->not->toBeNull();
    expect(Hash::check('NewPassword123!', $agent->password))->toBeTrue();

    $this->assertAuthenticatedAs($agent);
});

test('accepting the invite with an invalid signature is rejected', function () {
    $agent = User::factory()->create(['is_active' => false]);
    $agent->assignRole('agent');

    $this->post(route('invite.store', $agent), [
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ])->assertForbidden();

    expect($agent->fresh()->is_active)->toBeFalse();
});
