<?php

use App\Models\EligibilityAttestation;
use App\Models\User;
use App\Notifications\EligibilityDecisionNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    Storage::fake('local');
});

function eligibilityPayload(array $overrides = []): array
{
    return array_merge([
        'date_of_birth' => '1990-01-01',
        'home_state' => 'CA',
        'has_felony_conviction' => false,
        'is_us_citizen' => true,
    ], $overrides);
}

test('agent with no felony is cleared and redirected to the dashboard', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('eligibility.store'), eligibilityPayload())
        ->assertRedirect(route('dashboard'));

    $attestation = $agent->eligibilityAttestation()->first();

    expect($attestation->status)->toBe(EligibilityAttestation::STATUS_CLEARED);
});

test('agent with a felony disclosed is flagged and redirected to the pending page', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('eligibility.store'), eligibilityPayload([
            'has_felony_conviction' => true,
            'felony_details' => 'Details about the conviction.',
        ]))
        ->assertRedirect(route('eligibility.pending'));

    $attestation = $agent->eligibilityAttestation()->first();

    expect($attestation->status)->toBe(EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER);
});

test('an underage date of birth is rejected', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('eligibility.store'), eligibilityPayload([
            'date_of_birth' => now()->subYears(16)->format('Y-m-d'),
        ]))
        ->assertSessionHasErrors('date_of_birth');

    expect($agent->eligibilityAttestation()->exists())->toBeFalse();
});

test('a non-citizen must upload a work authorization file', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('eligibility.store'), eligibilityPayload(['is_us_citizen' => false]))
        ->assertSessionHasErrors('work_authorization_file');

    $this->actingAs($agent)
        ->post(route('eligibility.store'), eligibilityPayload([
            'is_us_citizen' => false,
            'work_authorization_file' => UploadedFile::fake()->create('work-auth.pdf', 100, 'application/pdf'),
        ]))
        ->assertRedirect(route('dashboard'));

    $attestation = $agent->eligibilityAttestation()->first();

    expect($attestation->work_authorization_path)->not->toBeNull();
    Storage::disk('local')->assertExists($attestation->work_authorization_path);
});

test('guests are redirected to login on onboarding and admin eligibility routes', function () {
    $attestation = EligibilityAttestation::factory()->flaggedForWaiver()->create();

    $this->get(route('eligibility.create'))->assertRedirect(route('login'));
    $this->post(route('eligibility.store'), eligibilityPayload())->assertRedirect(route('login'));
    $this->get(route('eligibility.pending'))->assertRedirect(route('login'));
    $this->get(route('eligibility.index'))->assertRedirect(route('login'));
    $this->get(route('eligibility.show', $attestation))->assertRedirect(route('login'));
});

test('an agent with an existing attestation is redirected away from the form', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create();

    $this->actingAs($agent)
        ->get(route('eligibility.create'))
        ->assertRedirect(route('dashboard'));

    $this->actingAs($agent)
        ->post(route('eligibility.store'), eligibilityPayload())
        ->assertForbidden();
});

test('an agent with a flagged attestation is redirected to the pending page from the form', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->flaggedForWaiver()->for($agent)->create();

    $this->actingAs($agent)
        ->get(route('eligibility.create'))
        ->assertRedirect(route('eligibility.pending'));
});

test('admin can view the flagged list and decide a case', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->flaggedForWaiver()->for($agent)->create();

    $this->actingAs($admin)
        ->get(route('eligibility.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/eligibility/index')
            ->has('attestations.data', 1));

    $this->actingAs($admin)
        ->post(route('eligibility.decision', $attestation), ['status' => 'cleared'])
        ->assertRedirect();

    $attestation->refresh();

    expect($attestation->status)->toBe(EligibilityAttestation::STATUS_CLEARED);
    expect($attestation->reviewed_by)->toBe($admin->id);
    expect($attestation->reviewed_at)->not->toBeNull();

    Notification::assertSentTo($agent, EligibilityDecisionNotification::class);
});

test('agent cannot access admin eligibility routes', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->flaggedForWaiver()->for($agent)->create();

    $this->actingAs($agent)->get(route('eligibility.index'))->assertForbidden();
    $this->actingAs($agent)->get(route('eligibility.show', $attestation))->assertForbidden();
    $this->actingAs($agent)
        ->post(route('eligibility.decision', $attestation), ['status' => 'cleared'])
        ->assertForbidden();
});

test('a decision cannot be issued twice on the same case', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $attestation = EligibilityAttestation::factory()->flaggedForWaiver()->create();

    $this->actingAs($admin)
        ->post(route('eligibility.decision', $attestation), ['status' => 'cleared'])
        ->assertRedirect();

    $this->actingAs($admin)
        ->post(route('eligibility.decision', $attestation), ['status' => 'not_eligible'])
        ->assertStatus(409);

    expect($attestation->fresh()->status)->toBe(EligibilityAttestation::STATUS_CLEARED);
});
