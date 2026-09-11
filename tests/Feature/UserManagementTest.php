<?php

use App\Models\PitchHealthSubmission;
use App\Models\PitchPerfectSubmission;
use App\Models\User;
use App\Notifications\AgentInviteNotification;
use App\Notifications\PitchHealthSyncCompletedNotification;
use App\Notifications\PitchPerfectSyncCompletedNotification;
use App\Notifications\RosterSyncCompletedNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

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
    expect($newAgent->source)->toBe(User::SOURCE_MANUAL);
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

test('super admin can view a user\'s details page', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    $agent = User::factory()->create(['metadata' => ['Territory' => 'West']]);
    $agent->assignRole('agent');

    $this->actingAs($superAdmin)
        ->get(route('users.show', $agent))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('users/show')
            ->where('targetUser.id', $agent->id)
            ->where('targetUser.metadata.Territory', 'West')
            ->where('canEdit', true));
});

test('admin cannot view another admin\'s details page', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $otherAdmin = User::factory()->create();
    $otherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('users.show', $otherAdmin))
        ->assertForbidden();
});

test('agent cannot view a user\'s details page', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $other = User::factory()->create();
    $other->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('users.show', $other))
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
        ->get(route('users.index', ['per_page' => 10, 'role' => '', 'search' => '', 'source' => '']));

    $response->assertInertia(function ($page) {
        $links = collect($page->toArray()['props']['users']['links']);
        $nextLink = $links->firstWhere('label', 'Next &raquo;');

        expect($nextLink['url'])
            ->toContain('role=')
            ->toContain('search=')
            ->toContain('source=')
            ->toContain('page=2');
    });
});

test('the source filter narrows the user list to accounts from that source', function () {
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole('super-admin');

    User::factory()->create(['source' => User::SOURCE_PITCH_HEALTH])->assignRole('agent');
    User::factory()->create(['source' => User::SOURCE_MANUAL])->assignRole('agent');

    $response = $this->actingAs($superAdmin)
        ->get(route('users.index', ['source' => User::SOURCE_PITCH_HEALTH]));

    $response->assertInertia(function ($page) {
        $users = collect($page->toArray()['props']['users']['data']);

        expect($users)->toHaveCount(1);
        expect($users->first()['source'])->toBe(User::SOURCE_PITCH_HEALTH);
    });
});

test('clicking pull agents notifies the clicking admin with exactly how many were pulled', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    config([
        'services.customer_api.domain' => 'https://api.test',
        'services.customer_api.key' => 'test-key',
        'services.customer_api.location_id' => '123',
    ]);

    Http::fake([
        'api.test/*' => Http::response([
            'pagedResults' => ['pageNumber' => 1, 'pageSize' => 50, 'pagesCount' => 1, 'resultsCount' => 1],
            'students' => [
                ['id' => 'ext-1', 'email' => 'pulled.agent@example.com', 'firstName' => 'Pulled', 'lastName' => 'Agent'],
            ],
        ]),
    ]);

    $this->actingAs($admin)
        ->post(route('users.pull-agents'))
        ->assertRedirect();

    Notification::assertSentTo(
        $admin,
        RosterSyncCompletedNotification::class,
        fn ($notification, $channels, $notifiable) => $notification->toArray($notifiable)['body'] === '1 new agent was invited.',
    );
});

test('a progress id sent with pull agents can be polled for status once the pull finishes', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    config([
        'services.customer_api.domain' => 'https://api.test',
        'services.customer_api.key' => 'test-key',
        'services.customer_api.location_id' => '123',
    ]);

    Http::fake([
        'api.test/*' => Http::response([
            'pagedResults' => ['pageNumber' => 1, 'pageSize' => 50, 'pagesCount' => 1, 'resultsCount' => 1],
            'students' => [
                ['id' => 'ext-1', 'email' => 'progress.agent@example.com', 'firstName' => 'Progress', 'lastName' => 'Agent'],
            ],
        ]),
    ]);

    $progressId = (string) Str::uuid();

    $this->actingAs($admin)
        ->post(route('users.pull-agents'), ['progress_id' => $progressId])
        ->assertRedirect();

    // The test queue connection runs jobs synchronously, so by the time
    // the redirect comes back the whole batch has already finished.
    $this->actingAs($admin)
        ->getJson(route('users.pull-status', $progressId))
        ->assertOk()
        ->assertJson(['status' => 'finished', 'progress' => 100]);
});

test('polling an unknown or expired progress id reports finished rather than hanging', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->getJson(route('users.pull-status', (string) Str::uuid()))
        ->assertOk()
        ->assertJson(['status' => 'finished', 'progress' => 100]);
});

test('clicking pull pitch health notifies the clicking admin with exactly how many were synced', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    config([
        'services.airtable.token' => 'test-token',
        'services.airtable.pitch_health_base_id' => 'appTest',
        'services.airtable.pitch_health_table_id' => 'tblTest',
    ]);

    Http::fake([
        'api.airtable.com/*' => Http::response([
            'records' => [
                [
                    'id' => 'rec1',
                    'createdTime' => '2026-09-03T21:33:00.000Z',
                    'fields' => ['Email' => 'pitch.agent@example.com'],
                ],
            ],
        ]),
    ]);

    $this->actingAs($admin)
        ->post(route('users.pull-pitch-health'))
        ->assertRedirect();

    expect(PitchHealthSubmission::where('airtable_record_id', 'rec1')->exists())->toBeTrue();

    Notification::assertSentTo(
        $admin,
        PitchHealthSyncCompletedNotification::class,
        fn ($notification, $channels, $notifiable) => $notification->toArray($notifiable)['body'] === '1 submission was synced. 1 new agent was invited.',
    );
});

test('clicking pull pitchperfect notifies the clicking admin with exactly how many were synced', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    config([
        'services.airtable.pitchperfect_token' => 'test-token',
        'services.airtable.pitchperfect_base_id' => 'appTest',
        'services.airtable.pitchperfect_table_id' => 'tblTest',
    ]);

    Http::fake([
        'api.airtable.com/*' => Http::response([
            'records' => [
                [
                    'id' => 'rec1',
                    'createdTime' => '2026-08-18T19:51:51.000Z',
                    'fields' => ['Personal email' => 'pitchperfect.agent@example.com', 'Status' => 'Active'],
                ],
            ],
        ]),
    ]);

    $this->actingAs($admin)
        ->post(route('users.pull-pitch-perfect'))
        ->assertRedirect();

    expect(PitchPerfectSubmission::where('airtable_record_id', 'rec1')->exists())->toBeTrue();

    Notification::assertSentTo(
        $admin,
        PitchPerfectSyncCompletedNotification::class,
        fn ($notification, $channels, $notifiable) => $notification->toArray($notifiable)['body'] === '1 submission was synced. 1 new agent was invited.',
    );
});
