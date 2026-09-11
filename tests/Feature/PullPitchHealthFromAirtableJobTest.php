<?php

use App\Jobs\LinkPitchHealthUsersToXcelJob;
use App\Jobs\PullPitchHealthFromAirtableJob;
use App\Jobs\SyncPitchHealthRecordsBatchJob;
use App\Models\PitchHealthSubmission;
use App\Models\User;
use App\Notifications\PitchHealthSyncCompletedNotification;
use App\Services\AirtableClient;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    config([
        'services.airtable.token' => 'test-token',
        'services.airtable.pitch_health_base_id' => 'appTest',
        'services.airtable.pitch_health_table_id' => 'tblTest',
    ]);
});

function fakePitchHealthPage(array $records, ?string $offset = null): void
{
    Http::fake([
        'api.airtable.com/*' => Http::response(array_filter([
            'records' => $records,
            'offset' => $offset,
        ], fn ($value, $key) => $key !== 'offset' || $value !== null, ARRAY_FILTER_USE_BOTH)),
    ]);
}

test('pulling Pitch Health data saves each record as a submission', function () {
    Notification::fake();

    fakePitchHealthPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-09-03T21:33:00.000Z',
            'fields' => [
                'Email' => 'agent@example.com',
                'Full Name' => 'Agent Example',
                'Submitted At' => '2026-09-03T21:33:00.000Z',
                'Resident State' => 'Michigan - MI',
            ],
        ],
    ]);

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    $submission = PitchHealthSubmission::where('airtable_record_id', 'rec1')->firstOrFail();

    expect($submission->email)->toBe('agent@example.com');
    expect($submission->full_name)->toBe('Agent Example');
    expect($submission->submitted_at)->not->toBeNull();
    expect($submission->metadata)->toBe([
        'Email' => 'agent@example.com',
        'Full Name' => 'Agent Example',
        'Submitted At' => '2026-09-03T21:33:00.000Z',
        'Resident State' => 'Michigan - MI',
    ]);
    expect($submission->synced_at)->not->toBeNull();
});

test('pulling Pitch Health data again updates the same submission instead of duplicating it', function () {
    Notification::fake();

    Http::fake([
        'api.airtable.com/*' => Http::sequence()
            ->push(['records' => [
                ['id' => 'rec1', 'createdTime' => '2026-09-03T21:33:00.000Z', 'fields' => ['Email' => 'agent@example.com', 'Full Name' => 'Old Name']],
            ]])
            ->push(['records' => [
                ['id' => 'rec1', 'createdTime' => '2026-09-03T21:33:00.000Z', 'fields' => ['Email' => 'agent@example.com', 'Full Name' => 'New Name']],
            ]]),
        'api.customer-test/*' => Http::response(['students' => []]),
    ]);

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));
    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    expect(PitchHealthSubmission::count())->toBe(1);
    expect(PitchHealthSubmission::first()->full_name)->toBe('New Name');
});

test('pulling Pitch Health data follows the offset across multiple pages', function () {
    Notification::fake();

    Http::fake([
        'api.airtable.com/*' => Http::sequence()
            ->push([
                'records' => [
                    ['id' => 'rec1', 'createdTime' => '2026-09-03T21:33:00.000Z', 'fields' => ['Email' => 'first@example.com']],
                ],
                'offset' => 'itrOffset123',
            ])
            ->push([
                'records' => [
                    ['id' => 'rec2', 'createdTime' => '2026-09-03T21:33:00.000Z', 'fields' => ['Email' => 'second@example.com']],
                ],
            ]),
        'api.customer-test/*' => Http::response(['students' => []]),
    ]);

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    expect(PitchHealthSubmission::where('airtable_record_id', 'rec1')->exists())->toBeTrue();
    expect(PitchHealthSubmission::where('airtable_record_id', 'rec2')->exists())->toBeTrue();
});

test('pulling Pitch Health data creates an active agent account with the default password for a new email', function () {
    Notification::fake();

    fakePitchHealthPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-09-03T21:33:00.000Z',
            'fields' => [
                'Email' => 'new.agent@example.com',
                'Full Name' => 'New Agent',
                'Resident State' => 'Michigan - MI',
                'Phone Number' => '(313) 418-4646',
            ],
        ],
    ]);

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    $agent = User::where('email', 'new.agent@example.com')->firstOrFail();

    expect($agent->name)->toBe('New Agent');
    expect($agent->is_active)->toBeTrue();
    expect($agent->hasRole('agent'))->toBeTrue();
    expect(Hash::check('password', $agent->password))->toBeTrue();
    expect($agent->must_change_password)->toBeTrue();
    expect($agent->source)->toBe(User::SOURCE_PITCH_HEALTH);
    expect($agent->metadata)->toBe([
        'Full Name' => 'New Agent',
        'Resident State' => 'Michigan - MI',
        'Phone Number' => '(313) 418-4646',
    ]);
});

test('pulling Pitch Health data does not create a second account for an email that already exists', function () {
    Notification::fake();

    User::factory()->create(['email' => 'existing@example.com']);

    fakePitchHealthPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-09-03T21:33:00.000Z',
            'fields' => ['Email' => 'existing@example.com', 'Full Name' => 'Existing User'],
        ],
    ]);

    $countBefore = User::count();

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    expect(User::count())->toBe($countBefore);
});

test('pulling Pitch Health data treats emails that only differ by case as the same account', function () {
    Notification::fake();

    fakePitchHealthPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-09-03T21:33:00.000Z',
            'fields' => ['Email' => 'Jane.Doe@Example.com', 'Full Name' => 'Jane Doe'],
        ],
        [
            'id' => 'rec2',
            'createdTime' => '2026-09-03T21:34:00.000Z',
            'fields' => ['Email' => 'jane.doe@example.com', 'Full Name' => 'Jane Doe Again'],
        ],
    ]);

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    expect(User::whereRaw('lower(email) = ?', ['jane.doe@example.com'])->count())->toBe(1);
});

test('a case-only duplicate email does not stop the rest of its batch from being created', function () {
    Notification::fake();

    User::factory()->create(['email' => 'pamela_swain@yahoo.com']);

    $records = collect(range(1, 10))
        ->map(fn (int $i) => [
            'id' => "rec{$i}",
            'createdTime' => '2026-09-03T21:33:00.000Z',
            'fields' => ['Email' => "agent{$i}@example.com"],
        ])
        ->all();

    // Slot a case-variant of an email that already exists in the middle of
    // the chunk — this is what used to abort every record after it.
    $records[4]['fields']['Email'] = 'Pamela_Swain@yahoo.com';

    fakePitchHealthPage($records);

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    foreach ($records as $i => $record) {
        if ($i === 4) {
            continue;
        }

        expect(User::where('email', $record['fields']['Email'])->exists())->toBeTrue();
    }

    expect(User::whereRaw('lower(email) = ?', ['pamela_swain@yahoo.com'])->count())->toBe(1);
});

test('pulling Pitch Health data does not create two accounts for the same email appearing twice', function () {
    Notification::fake();

    fakePitchHealthPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-09-03T21:33:00.000Z',
            'fields' => ['Email' => 'duplicate@example.com', 'Full Name' => 'First Submission'],
        ],
        [
            'id' => 'rec2',
            'createdTime' => '2026-09-03T21:34:00.000Z',
            'fields' => ['Email' => 'duplicate@example.com', 'Full Name' => 'Second Submission'],
        ],
    ]);

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    expect(User::where('email', 'duplicate@example.com')->count())->toBe(1);
});

test('pulling Pitch Health data splits the writes across batch jobs instead of doing them all in one job', function () {
    Bus::fake();

    fakePitchHealthPage(
        collect(range(1, 120))
            ->map(fn (int $i) => [
                'id' => "rec{$i}",
                'createdTime' => '2026-09-03T21:33:00.000Z',
                'fields' => ['Email' => "agent{$i}@example.com"],
            ])
            ->all(),
    );

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    // 120 records at 50 per batch job is 3 chunk jobs (50, 50, 20), not
    // one job doing all 120 writes.
    Bus::assertBatched(fn ($batch) => $batch->jobs->count() === 3
        && $batch->jobs->every(fn ($job) => $job instanceof SyncPitchHealthRecordsBatchJob));
});

test('a pull no longer chains a Pitch Health to XCEL link pass afterwards', function () {
    Notification::fake();
    Bus::fake();

    fakePitchHealthPage([]);

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    // Disabled for now — the nightly schedule (routes/console.php) still
    // runs the link pass on its own, but a pull no longer triggers it
    // directly.
    Bus::assertNotDispatched(LinkPitchHealthUsersToXcelJob::class);
});

test('a manually triggered pull always confirms the result to whoever clicked, even at zero', function () {
    Notification::fake();

    $clicker = User::factory()->create();
    $clicker->assignRole('admin');

    fakePitchHealthPage([]);

    (new PullPitchHealthFromAirtableJob($clicker))->handle(app(AirtableClient::class));

    Notification::assertSentTo(
        $clicker,
        PitchHealthSyncCompletedNotification::class,
        fn ($notification, $channels, $notifiable) => $notification->toArray($notifiable)['body'] === '0 submissions were synced. 0 new agents were invited.',
    );
});

test('a Pitch Health pull that syncs submissions notifies every reviewer', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    fakePitchHealthPage([
        [
            'id' => 'rec4',
            'createdTime' => '2026-09-03T21:33:00.000Z',
            'fields' => ['Email' => 'agent2@example.com'],
        ],
    ]);

    (new PullPitchHealthFromAirtableJob)->handle(app(AirtableClient::class));

    Notification::assertSentTo($admin, PitchHealthSyncCompletedNotification::class);
});
