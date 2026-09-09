<?php

use App\Models\EligibilityAttestation;
use App\Models\User;
use App\Notifications\EligibilityDecisionNotification;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('an eligibility decision writes a database notification the agent can see', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $agent->notify(new EligibilityDecisionNotification(EligibilityAttestation::STATUS_CLEARED));

    expect($agent->notifications()->count())->toBe(1);

    $notification = $agent->notifications()->first();

    expect($notification->data['level'])->toBe('success');
    expect($notification->data['title'])->toBe('Your eligibility review is complete');
    expect($notification->read_at)->toBeNull();
});

test('the dashboard shares the unread count and recent notifications', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create();

    $agent->notify(new EligibilityDecisionNotification(EligibilityAttestation::STATUS_CLEARED));
    $agent->notify(new EligibilityDecisionNotification(EligibilityAttestation::STATUS_NOT_ELIGIBLE));

    $this->actingAs($agent)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('notifications.unreadCount', 2)
            ->has('notifications.recent', 2));
});

test('an agent can mark a single notification as read', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $agent->notify(new EligibilityDecisionNotification(EligibilityAttestation::STATUS_CLEARED));
    $notification = $agent->notifications()->firstOrFail();

    $this->actingAs($agent)
        ->post(route('notifications.read', $notification->id))
        ->assertRedirect();

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('an agent can mark every notification as read at once', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $agent->notify(new EligibilityDecisionNotification(EligibilityAttestation::STATUS_CLEARED));
    $agent->notify(new EligibilityDecisionNotification(EligibilityAttestation::STATUS_NOT_ELIGIBLE));

    $this->actingAs($agent)
        ->post(route('notifications.read-all'))
        ->assertRedirect();

    expect($agent->unreadNotifications()->count())->toBe(0);
});

test('an agent cannot mark another agent notification as read', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $other = User::factory()->create();
    $other->assignRole('agent');
    $other->notify(new EligibilityDecisionNotification(EligibilityAttestation::STATUS_CLEARED));
    $notification = $other->notifications()->firstOrFail();

    $this->actingAs($agent)
        ->post(route('notifications.read', $notification->id))
        ->assertNotFound();

    expect($notification->fresh()->read_at)->toBeNull();
});
