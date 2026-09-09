<?php

use App\Models\TrainingProgress;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    config([
        'services.customer_api.domain' => 'https://api.test',
        'services.customer_api.key' => 'test-key',
    ]);
});

test('guests are redirected to login', function () {
    $this->get(route('training-progress.show'))->assertRedirect(route('login'));
});

test('an agent without an excel id sees an empty progress page', function () {
    $agent = User::factory()->create(['excel_id' => null]);
    $agent->assignRole('agent');

    Http::fake(fn () => Http::response([], 500));

    $this->actingAs($agent)
        ->get(route('training-progress.show'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('training-progress/show')
            ->where('isOwnProgress', true)
            ->has('programs', 0));

    Http::assertNotSent(fn ($request) => str_contains($request->url(), 'api.test'));
});

test('an agent viewing their own progress syncs and sees their programs', function () {
    $agent = User::factory()->create(['excel_id' => 'ext-1']);
    $agent->assignRole('agent');

    Http::fake([
        'api.test/services/CustomerApi.svc/users/ext-1/trainingprogress' => Http::response([
            'TrainingPrograms' => [
                ['EnrollmentId' => 'enr-1', 'Name' => 'Life Pre-Licensing'],
            ],
        ]),
    ]);

    $this->actingAs($agent)
        ->get(route('training-progress.show'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('training-progress/show')
            ->where('agent.id', $agent->id)
            ->where('isOwnProgress', true)
            ->has('programs', 1));

    expect(TrainingProgress::where('user_id', $agent->id)->where('enrollment_id', 'enr-1')->exists())->toBeTrue();
});

test('a failed sync falls back to the last synced data with a toast', function () {
    $agent = User::factory()->create(['excel_id' => 'ext-1']);
    $agent->assignRole('agent');

    TrainingProgress::factory()->for($agent)->create([
        'enrollment_id' => 'enr-old',
        'metadata' => ['Name' => 'Previously Synced Program'],
    ]);

    Http::fake(fn () => Http::response([], 500));

    $this->actingAs($agent)
        ->get(route('training-progress.show'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('training-progress/show')
            ->has('programs', 1)
            ->hasFlash('toast.type', 'error'));
});

test('a non-reviewer agent cannot view another agent progress', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $other = User::factory()->create();
    $other->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('training-progress.show-for-user', $other))
        ->assertForbidden();
});

test('an admin can view a verified agent progress', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create(['excel_id' => 'ext-2']);
    $agent->assignRole('agent');

    Http::fake([
        'api.test/services/CustomerApi.svc/users/ext-2/trainingprogress' => Http::response([
            'TrainingPrograms' => [],
        ]),
    ]);

    $this->actingAs($admin)
        ->get(route('training-progress.show-for-user', $agent))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('training-progress/show')
            ->where('agent.id', $agent->id)
            ->where('isOwnProgress', false));
});

test('an admin cannot view a non-agent user progress', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $anotherAdmin = User::factory()->create();
    $anotherAdmin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('training-progress.show-for-user', $anotherAdmin))
        ->assertNotFound();
});
