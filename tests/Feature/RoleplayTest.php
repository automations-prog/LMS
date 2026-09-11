<?php

use App\Jobs\ScoreRoleplaySessionJob;
use App\Models\RoleplaySession;
use App\Models\User;
use App\Notifications\RoleplaySessionScoredNotification;
use App\Services\OpenAiClient;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

test('the roleplay index shows a coming soon page while unlaunched, regardless of access', function () {
    config(['roleplay.launched' => false]);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $agent->update(['roleplay_enabled_at' => now()]);

    $this->actingAs($agent)
        ->get(route('roleplay.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('roleplay/coming-soon'));
});

test('starting a session is blocked while unlaunched even with access granted', function () {
    config(['roleplay.launched' => false]);

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $agent->update(['roleplay_enabled_at' => now()]);

    $this->actingAs($agent)
        ->post(route('roleplay.sessions.store'))
        ->assertNotFound();

    expect(RoleplaySession::count())->toBe(0);
});

test('an agent without granted access cannot start a session', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('roleplay.sessions.store'))
        ->assertForbidden();

    expect(RoleplaySession::count())->toBe(0);
});

test('the roleplay index reports access state and lists the agent\'s own sessions', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    RoleplaySession::factory()->scored()->for($agent)->create();

    $other = User::factory()->create();
    $other->assignRole('agent');
    RoleplaySession::factory()->scored()->for($other)->create();

    $this->actingAs($agent)
        ->get(route('roleplay.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('roleplay/index')
            ->where('enabled', false)
            ->where('sessions.data.0.user_id', $agent->id)
            ->where('sessions.total', 1));
});

test('an agent with granted access can start a session', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $agent->update(['roleplay_enabled_at' => now()]);

    $this->actingAs($agent)
        ->post(route('roleplay.sessions.store'))
        ->assertRedirect();

    $session = RoleplaySession::first();

    expect($session->user_id)->toBe($agent->id)
        ->and($session->status)->toBe(RoleplaySession::STATUS_IN_PROGRESS);
});

test('an agent cannot view another agent\'s session', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $owner = User::factory()->create();
    $owner->assignRole('agent');
    $session = RoleplaySession::factory()->for($owner)->create();

    $this->actingAs($agent)
        ->get(route('roleplay.sessions.show', $session))
        ->assertForbidden();
});

test('an admin with roleplay.manage can view any agent\'s session', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $session = RoleplaySession::factory()->scored()->for($agent)->create();

    $this->actingAs($admin)
        ->get(route('roleplay.sessions.show', $session))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('roleplay/show')
            ->where('session.id', $session->id)
            ->where('isOwner', false));
});

test('the owning agent can mint a realtime token for an in-progress session', function () {
    $this->mock(OpenAiClient::class, function ($mock) {
        $mock->shouldReceive('mintRealtimeClientSecret')
            ->once()
            ->andReturn(['value' => 'ek_test_123', 'expires_at' => now()->addMinutes(1)->timestamp]);
    });

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $agent->update(['roleplay_enabled_at' => now()]);
    $session = RoleplaySession::factory()->for($agent)->create();

    $this->actingAs($agent)
        ->post(route('roleplay.sessions.token', $session))
        ->assertOk()
        ->assertJson(['client_secret' => 'ek_test_123']);
});

test('a token cannot be minted for a session that already ended', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $agent->update(['roleplay_enabled_at' => now()]);
    $session = RoleplaySession::factory()->scored()->for($agent)->create();

    $this->actingAs($agent)
        ->post(route('roleplay.sessions.token', $session))
        ->assertForbidden();
});

test('completing a session stores the transcript and queues scoring', function () {
    Bus::fake();

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $agent->update(['roleplay_enabled_at' => now()]);
    $session = RoleplaySession::factory()->for($agent)->create();

    $transcript = [
        ['role' => 'assistant', 'text' => 'Hello?', 'at' => now()->toIso8601String()],
        ['role' => 'agent', 'text' => 'Hi there, got a minute?', 'at' => now()->toIso8601String()],
    ];

    $this->actingAs($agent)
        ->post(route('roleplay.sessions.complete', $session), ['transcript' => $transcript])
        ->assertRedirect(route('roleplay.sessions.show', $session));

    $session->refresh();

    expect($session->status)->toBe(RoleplaySession::STATUS_COMPLETED)
        ->and($session->transcript)->toHaveCount(2)
        ->and($session->ended_at)->not->toBeNull();

    Bus::assertDispatched(ScoreRoleplaySessionJob::class);
});

test('a completed session cannot be completed again', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $agent->update(['roleplay_enabled_at' => now()]);
    $session = RoleplaySession::factory()->completed()->for($agent)->create();

    $this->actingAs($agent)
        ->post(route('roleplay.sessions.complete', $session), [
            'transcript' => [['role' => 'agent', 'text' => 'hi', 'at' => null]],
        ])
        ->assertForbidden();
});

test('scoring a session records the score and notifies the agent', function () {
    Notification::fake();

    $this->mock(OpenAiClient::class, function ($mock) {
        $mock->shouldReceive('scoreTranscript')
            ->once()
            ->andReturn([
                'criteria' => collect(config('roleplay.rubric'))
                    ->map(fn (array $criterion) => [
                        'key' => $criterion['key'],
                        'score' => 3,
                        'feedback' => 'Fine.',
                    ])
                    ->all(),
                'overall_score' => 60,
                'summary' => 'Decent attempt.',
            ]);
    });

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $session = RoleplaySession::factory()->completed()->for($agent)->create();

    (new ScoreRoleplaySessionJob($session))->handle(app(OpenAiClient::class));

    $session->refresh();

    expect($session->status)->toBe(RoleplaySession::STATUS_SCORED)
        ->and($session->overall_score)->toBe(60)
        ->and($session->scored_at)->not->toBeNull();

    Notification::assertSentTo($agent, RoleplaySessionScoredNotification::class);
});

test('a scoring failure marks the session failed instead of leaving it stuck', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $session = RoleplaySession::factory()->completed()->for($agent)->create();

    (new ScoreRoleplaySessionJob($session))->failed(new RuntimeException('OpenAI timed out'));

    $session->refresh();

    expect($session->status)->toBe(RoleplaySession::STATUS_FAILED)
        ->and($session->failure_reason)->toBe('OpenAI timed out');
});

test('an agent without roleplay.manage cannot grant access', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $other = User::factory()->create();
    $other->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('roleplay.access.grant', $other))
        ->assertForbidden();

    expect($other->fresh()->hasRoleplayAccess())->toBeFalse();
});

test('an admin can grant and revoke roleplay access', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($admin)
        ->post(route('roleplay.access.grant', $agent))
        ->assertRedirect();

    expect($agent->fresh()->hasRoleplayAccess())->toBeTrue();

    $this->actingAs($admin)
        ->post(route('roleplay.access.revoke', $agent))
        ->assertRedirect();

    expect($agent->fresh()->hasRoleplayAccess())->toBeFalse();
});

test('the admin roleplay access list shows agents with their session counts', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    RoleplaySession::factory()->scored()->for($agent)->create();

    $this->actingAs($admin)
        ->get(route('roleplay.access.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/roleplay/index')
            ->where('agents.data.0.id', $agent->id)
            ->where('agents.data.0.roleplay_sessions_count', 1));
});
