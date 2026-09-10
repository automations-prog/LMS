<?php

use App\Jobs\PullPitchPerfectFromAirtableJob;
use App\Jobs\SyncPitchPerfectRecordsBatchJob;
use App\Models\PitchPerfectSubmission;
use App\Models\User;
use App\Notifications\PitchPerfectSyncCompletedNotification;
use App\Services\AirtableClient;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    config([
        'services.airtable.pitchperfect_token' => 'test-token',
        'services.airtable.pitchperfect_base_id' => 'appTest',
        'services.airtable.pitchperfect_table_id' => 'tblTest',
    ]);
});

function fakePitchPerfectPage(array $records, ?string $offset = null): void
{
    Http::fake([
        'api.airtable.com/*' => Http::response(array_filter([
            'records' => $records,
            'offset' => $offset,
        ], fn ($value, $key) => $key !== 'offset' || $value !== null, ARRAY_FILTER_USE_BOTH)),
    ]);
}

test('pulling PitchPerfect data saves each record as a submission', function () {
    Notification::fake();

    fakePitchPerfectPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-08-18T19:51:51.000Z',
            'fields' => [
                'Personal email' => 'agent@example.com',
                'Full Name' => 'Agent Example',
                'Status' => 'Active',
                'Created' => '2026-08-18T19:51:51.000Z',
                'City' => 'Margate',
            ],
        ],
    ]);

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    $submission = PitchPerfectSubmission::where('airtable_record_id', 'rec1')->firstOrFail();

    expect($submission->email)->toBe('agent@example.com');
    expect($submission->full_name)->toBe('Agent Example');
    expect($submission->status)->toBe('Active');
    expect($submission->submitted_at)->not->toBeNull();
    expect($submission->metadata)->toBe([
        'Personal email' => 'agent@example.com',
        'Full Name' => 'Agent Example',
        'Status' => 'Active',
        'Created' => '2026-08-18T19:51:51.000Z',
        'City' => 'Margate',
    ]);
    expect($submission->synced_at)->not->toBeNull();
});

test('pulling PitchPerfect data falls back to the record createdTime when there is no Created field', function () {
    Notification::fake();

    fakePitchPerfectPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-08-18T19:51:51.000Z',
            'fields' => ['Personal email' => 'agent@example.com'],
        ],
    ]);

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    expect(PitchPerfectSubmission::first()->submitted_at)->not->toBeNull();
});

test('pulling PitchPerfect data again updates the same submission instead of duplicating it', function () {
    Notification::fake();

    Http::fake([
        'api.airtable.com/*' => Http::sequence()
            ->push(['records' => [
                ['id' => 'rec1', 'createdTime' => '2026-08-18T19:51:51.000Z', 'fields' => ['Personal email' => 'agent@example.com', 'Full Name' => 'Old Name']],
            ]])
            ->push(['records' => [
                ['id' => 'rec1', 'createdTime' => '2026-08-18T19:51:51.000Z', 'fields' => ['Personal email' => 'agent@example.com', 'Full Name' => 'New Name']],
            ]]),
    ]);

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));
    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    expect(PitchPerfectSubmission::count())->toBe(1);
    expect(PitchPerfectSubmission::first()->full_name)->toBe('New Name');
});

test('pulling PitchPerfect data follows the offset across multiple pages', function () {
    Notification::fake();

    Http::fake([
        'api.airtable.com/*' => Http::sequence()
            ->push([
                'records' => [
                    ['id' => 'rec1', 'createdTime' => '2026-08-18T19:51:51.000Z', 'fields' => ['Personal email' => 'first@example.com']],
                ],
                'offset' => 'itrOffset123',
            ])
            ->push([
                'records' => [
                    ['id' => 'rec2', 'createdTime' => '2026-08-18T19:51:51.000Z', 'fields' => ['Personal email' => 'second@example.com']],
                ],
            ]),
    ]);

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    expect(PitchPerfectSubmission::where('airtable_record_id', 'rec1')->exists())->toBeTrue();
    expect(PitchPerfectSubmission::where('airtable_record_id', 'rec2')->exists())->toBeTrue();
});

test('pulling PitchPerfect data creates an active agent account for a new Active email', function () {
    Notification::fake();

    fakePitchPerfectPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-08-18T19:51:51.000Z',
            'fields' => [
                'Personal email' => 'new.agent@example.com',
                'Full Name' => 'New Agent',
                'Status' => 'Active',
                'City' => 'Margate',
                'Phone Number' => '(954) 288-4291',
            ],
        ],
    ]);

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    $agent = User::where('email', 'new.agent@example.com')->firstOrFail();

    expect($agent->name)->toBe('New Agent');
    expect($agent->is_active)->toBeTrue();
    expect($agent->hasRole('agent'))->toBeTrue();
    expect(Hash::check('password', $agent->password))->toBeTrue();
    expect($agent->must_change_password)->toBeTrue();
    expect($agent->source)->toBe(User::SOURCE_PITCH_PERFECT);
    expect($agent->metadata)->toBe([
        'Full Name' => 'New Agent',
        'Status' => 'Active',
        'City' => 'Margate',
        'Phone Number' => '(954) 288-4291',
    ]);
});

test('pulling PitchPerfect data does not create an account for a Non-active submission', function () {
    Notification::fake();

    fakePitchPerfectPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-08-13T14:46:13.000Z',
            'fields' => ['Personal email' => 'inactive.agent@example.com', 'Full Name' => 'Inactive Agent', 'Status' => 'Non-active'],
        ],
    ]);

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    expect(PitchPerfectSubmission::where('airtable_record_id', 'rec1')->exists())->toBeTrue();
    expect(User::where('email', 'inactive.agent@example.com')->exists())->toBeFalse();
});

test('pulling PitchPerfect data does not create a second account for an email that already exists', function () {
    Notification::fake();

    User::factory()->create(['email' => 'existing@example.com']);

    fakePitchPerfectPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-08-18T19:51:51.000Z',
            'fields' => ['Personal email' => 'existing@example.com', 'Full Name' => 'Existing User', 'Status' => 'Active'],
        ],
    ]);

    $countBefore = User::count();

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    expect(User::count())->toBe($countBefore);
});

test('pulling PitchPerfect data treats emails that only differ by case as the same account', function () {
    Notification::fake();

    fakePitchPerfectPage([
        [
            'id' => 'rec1',
            'createdTime' => '2026-08-18T19:51:51.000Z',
            'fields' => ['Personal email' => 'Jane.Doe@Example.com', 'Full Name' => 'Jane Doe', 'Status' => 'Active'],
        ],
        [
            'id' => 'rec2',
            'createdTime' => '2026-08-18T19:52:51.000Z',
            'fields' => ['Personal email' => 'jane.doe@example.com', 'Full Name' => 'Jane Doe Again', 'Status' => 'Active'],
        ],
    ]);

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    expect(User::whereRaw('lower(email) = ?', ['jane.doe@example.com'])->count())->toBe(1);
});

test('a case-only duplicate email does not stop the rest of its batch from being created', function () {
    Notification::fake();

    User::factory()->create(['email' => 'pamela_swain@yahoo.com']);

    $records = collect(range(1, 10))
        ->map(fn (int $i) => [
            'id' => "rec{$i}",
            'createdTime' => '2026-08-18T19:51:51.000Z',
            'fields' => ['Personal email' => "agent{$i}@example.com", 'Status' => 'Active'],
        ])
        ->all();

    // Slot a case-variant of an email that already exists in the middle of
    // the chunk — this is what used to abort every record after it.
    $records[4]['fields']['Personal email'] = 'Pamela_Swain@yahoo.com';

    fakePitchPerfectPage($records);

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    foreach ($records as $i => $record) {
        if ($i === 4) {
            continue;
        }

        expect(User::where('email', $record['fields']['Personal email'])->exists())->toBeTrue();
    }

    expect(User::whereRaw('lower(email) = ?', ['pamela_swain@yahoo.com'])->count())->toBe(1);
});

test('pulling PitchPerfect data splits the writes across batch jobs instead of doing them all in one job', function () {
    Bus::fake();

    fakePitchPerfectPage(
        collect(range(1, 120))
            ->map(fn (int $i) => [
                'id' => "rec{$i}",
                'createdTime' => '2026-08-18T19:51:51.000Z',
                'fields' => ['Personal email' => "agent{$i}@example.com", 'Status' => 'Active'],
            ])
            ->all(),
    );

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    // 120 records at 50 per batch job is 3 chunk jobs (50, 50, 20), not
    // one job doing all 120 writes.
    Bus::assertBatched(fn ($batch) => $batch->jobs->count() === 3
        && $batch->jobs->every(fn ($job) => $job instanceof SyncPitchPerfectRecordsBatchJob));
});

test('a manually triggered pull always confirms the result to whoever clicked, even at zero', function () {
    Notification::fake();

    $clicker = User::factory()->create();
    $clicker->assignRole('admin');

    fakePitchPerfectPage([]);

    (new PullPitchPerfectFromAirtableJob($clicker))->handle(app(AirtableClient::class));

    Notification::assertSentTo(
        $clicker,
        PitchPerfectSyncCompletedNotification::class,
        fn ($notification, $channels, $notifiable) => $notification->toArray($notifiable)['body'] === '0 submissions were synced. 0 new agents were invited.',
    );
});

test('a PitchPerfect pull that syncs submissions notifies every reviewer', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    fakePitchPerfectPage([
        [
            'id' => 'rec4',
            'createdTime' => '2026-08-18T19:51:51.000Z',
            'fields' => ['Personal email' => 'agent2@example.com', 'Status' => 'Active'],
        ],
    ]);

    (new PullPitchPerfectFromAirtableJob)->handle(app(AirtableClient::class));

    Notification::assertSentTo($admin, PitchPerfectSyncCompletedNotification::class);
});
