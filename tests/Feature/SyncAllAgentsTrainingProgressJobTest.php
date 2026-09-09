<?php

use App\Actions\SyncTrainingProgressForUser;
use App\Jobs\SyncAllAgentsTrainingProgressJob;
use App\Models\TrainingProgress;
use App\Models\User;
use App\Services\CustomerApiClient;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    config([
        'services.customer_api.domain' => 'https://api.test',
        'services.customer_api.key' => 'test-key',
    ]);
});

test('the scheduled sync refreshes training progress for every linked agent', function () {
    $withProgress = User::factory()->create(['excel_id' => 'ext-1']);
    $withProgress->assignRole('agent');

    $withoutExcelId = User::factory()->create(['excel_id' => null]);
    $withoutExcelId->assignRole('agent');

    $admin = User::factory()->create(['excel_id' => 'ext-2']);
    $admin->assignRole('admin');

    Http::fake([
        'api.test/services/CustomerApi.svc/users/ext-1/trainingprogress' => Http::response([
            'TrainingPrograms' => [
                ['EnrollmentId' => 'enr-1', 'Name' => 'Life Pre-Licensing'],
            ],
        ]),
    ]);

    (new SyncAllAgentsTrainingProgressJob)->handle(app(CustomerApiClient::class), app(SyncTrainingProgressForUser::class));

    expect(TrainingProgress::where('user_id', $withProgress->id)->count())->toBe(1);

    Http::assertNotSent(fn ($request) => str_contains((string) $request->url(), 'ext-2'));
});

test('the scheduled sync logs and continues past a single agent failing', function () {
    $failing = User::factory()->create(['excel_id' => 'ext-fail']);
    $failing->assignRole('agent');

    $working = User::factory()->create(['excel_id' => 'ext-ok']);
    $working->assignRole('agent');

    Http::fake([
        'api.test/services/CustomerApi.svc/users/ext-fail/trainingprogress' => Http::response([], 500),
        'api.test/services/CustomerApi.svc/users/ext-ok/trainingprogress' => Http::response([
            'TrainingPrograms' => [
                ['EnrollmentId' => 'enr-ok', 'Name' => 'AHIP'],
            ],
        ]),
    ]);

    (new SyncAllAgentsTrainingProgressJob)->handle(app(CustomerApiClient::class), app(SyncTrainingProgressForUser::class));

    expect(TrainingProgress::where('user_id', $working->id)->count())->toBe(1);
    expect(TrainingProgress::where('user_id', $failing->id)->count())->toBe(0);
});
