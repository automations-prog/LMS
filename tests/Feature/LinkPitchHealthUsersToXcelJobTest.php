<?php

use App\Actions\SyncTrainingProgressForUser;
use App\Jobs\LinkPitchHealthUsersToXcelJob;
use App\Models\TrainingProgress;
use App\Models\User;
use App\Services\CustomerApiClient;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.customer_api.domain' => 'https://api.test',
        'services.customer_api.key' => 'test-key',
        'services.customer_api.location_id' => '123',
    ]);
});

function fakeXcelRoster(array $students): void
{
    Http::fake([
        'api.test/*/users/*/trainingprogress' => Http::response([
            'TrainingPrograms' => [
                ['EnrollmentId' => 'enr-1', 'Status' => 'In Progress'],
            ],
        ]),
        'api.test/*/locations/*/trainingprogress*' => Http::response([
            'pagedResults' => ['pageNumber' => 1, 'pageSize' => 50, 'pagesCount' => 1, 'resultsCount' => count($students)],
            'students' => $students,
        ]),
    ]);
}

test('a Pitch Health user is linked to their XCEL record by email', function () {
    $user = User::factory()->create([
        'email' => 'agent@example.com',
        'source' => User::SOURCE_PITCH_HEALTH,
    ]);

    fakeXcelRoster([
        ['id' => 'xcel-1', 'email' => 'agent@example.com', 'firstName' => 'Agent', 'lastName' => 'Example'],
    ]);

    (new LinkPitchHealthUsersToXcelJob)->handle(app(CustomerApiClient::class), app(SyncTrainingProgressForUser::class));

    expect($user->fresh()->excel_id)->toBe('xcel-1');
    expect(TrainingProgress::where('user_id', $user->id)->exists())->toBeTrue();
});

test('matching is case-insensitive', function () {
    $user = User::factory()->create([
        'email' => 'Agent@Example.com',
        'source' => User::SOURCE_PITCH_HEALTH,
    ]);

    fakeXcelRoster([
        ['id' => 'xcel-1', 'email' => 'agent@example.com'],
    ]);

    (new LinkPitchHealthUsersToXcelJob)->handle(app(CustomerApiClient::class), app(SyncTrainingProgressForUser::class));

    expect($user->fresh()->excel_id)->toBe('xcel-1');
});

test('a Pitch Health user with no matching XCEL email is left unmatched', function () {
    $user = User::factory()->create([
        'email' => 'nobody@example.com',
        'source' => User::SOURCE_PITCH_HEALTH,
    ]);

    fakeXcelRoster([
        ['id' => 'xcel-1', 'email' => 'someone.else@example.com'],
    ]);

    (new LinkPitchHealthUsersToXcelJob)->handle(app(CustomerApiClient::class), app(SyncTrainingProgressForUser::class));

    expect($user->fresh()->excel_id)->toBeNull();
});

test('a non-Pitch-Health user is never touched', function () {
    $user = User::factory()->create([
        'email' => 'agent@example.com',
        'source' => User::SOURCE_MANUAL,
    ]);

    fakeXcelRoster([
        ['id' => 'xcel-1', 'email' => 'agent@example.com'],
    ]);

    (new LinkPitchHealthUsersToXcelJob)->handle(app(CustomerApiClient::class), app(SyncTrainingProgressForUser::class));

    expect($user->fresh()->excel_id)->toBeNull();
});

test('a Pitch Health user already linked to XCEL is not re-fetched', function () {
    $user = User::factory()->create([
        'email' => 'agent@example.com',
        'source' => User::SOURCE_PITCH_HEALTH,
        'excel_id' => 'already-linked',
    ]);

    Http::fake();

    (new LinkPitchHealthUsersToXcelJob)->handle(app(CustomerApiClient::class), app(SyncTrainingProgressForUser::class));

    Http::assertNothingSent();
    expect($user->fresh()->excel_id)->toBe('already-linked');
});
