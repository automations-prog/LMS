<?php

use App\Models\EligibilityAttestation;
use App\Models\TrainingCompletion;
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
        'home_state' => 'California',
        'has_felony_conviction' => false,
        'is_us_citizen' => true,
    ], $overrides);
}

test('a submission with no felony still starts pending, not auto-cleared', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('eligibility.store'), eligibilityPayload())
        ->assertRedirect(route('eligibility.pending'));

    $attestation = $agent->eligibilityAttestation()->first();

    expect($attestation->status)->toBe(EligibilityAttestation::STATUS_PENDING);
});

test('a submission with a felony disclosed also starts pending, and stores the details', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('eligibility.store'), eligibilityPayload([
            'has_felony_conviction' => true,
            'felony_details' => 'Details about the conviction.',
        ]))
        ->assertRedirect(route('eligibility.pending'));

    $attestation = $agent->eligibilityAttestation()->first();

    expect($attestation->status)->toBe(EligibilityAttestation::STATUS_PENDING);
    expect($attestation->felony_details)->toBe('Details about the conviction.');
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
        ->assertRedirect(route('eligibility.pending'));

    $attestation = $agent->eligibilityAttestation()->first();

    expect($attestation->work_authorization_path)->not->toBeNull();
    Storage::disk('local')->assertExists($attestation->work_authorization_path);
});

test('guests are redirected to login on onboarding and admin eligibility routes', function () {
    $attestation = EligibilityAttestation::factory()->flaggedForWaiver()->create();

    $this->get(route('eligibility.create'))->assertRedirect(route('login'));
    $this->post(route('eligibility.store'), eligibilityPayload())->assertRedirect(route('login'));
    $this->get(route('eligibility.pending'))->assertRedirect(route('login'));
    $this->get(route('eligibility.document', $attestation))->assertRedirect(route('login'));
});

test('an agent with a decided attestation is redirected to the dashboard from the form', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $this->actingAs($agent)
        ->get(route('eligibility.create'))
        ->assertRedirect(route('dashboard'));

    $this->actingAs($agent)
        ->post(route('eligibility.store'), eligibilityPayload())
        ->assertForbidden();
});

test('an agent with a pending or flagged attestation is redirected to the pending page from the form', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create();

    $this->actingAs($agent)
        ->get(route('eligibility.create'))
        ->assertRedirect(route('eligibility.pending'));

    $flaggedAgent = User::factory()->create();
    $flaggedAgent->assignRole('agent');
    EligibilityAttestation::factory()->flaggedForWaiver()->for($flaggedAgent)->create();

    $this->actingAs($flaggedAgent)
        ->get(route('eligibility.create'))
        ->assertRedirect(route('eligibility.pending'));
});

test('the pending-review page is only reachable while under review', function () {
    $pendingAgent = User::factory()->create();
    $pendingAgent->assignRole('agent');
    EligibilityAttestation::factory()->for($pendingAgent)->create();

    $this->actingAs($pendingAgent)
        ->get(route('eligibility.pending'))
        ->assertOk();

    $clearedAgent = User::factory()->create();
    $clearedAgent->assignRole('agent');
    EligibilityAttestation::factory()->for($clearedAgent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $this->actingAs($clearedAgent)
        ->get(route('eligibility.pending'))
        ->assertRedirect(route('dashboard'));
});

test('a cleared agent can mark enrollment as done with a line of authority', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $this->actingAs($agent)
        ->post(route('eligibility.complete-enrollment'), ['line_of_authority' => 'life'])
        ->assertRedirect(route('dashboard'));

    $attestation->refresh();
    expect($attestation->enrollment_completed_at)->not->toBeNull();
    expect($attestation->line_of_authority)->toBe('life');
});

test('marking enrollment as done requires a valid line of authority', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $this->actingAs($agent)
        ->post(route('eligibility.complete-enrollment'), [])
        ->assertInvalid('line_of_authority');

    $this->actingAs($agent)
        ->post(route('eligibility.complete-enrollment'), ['line_of_authority' => 'not-a-real-option'])
        ->assertInvalid('line_of_authority');
});

test('an agent who is not cleared cannot mark enrollment as done', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create();

    $this->actingAs($agent)
        ->post(route('eligibility.complete-enrollment'), ['line_of_authority' => 'life'])
        ->assertForbidden();
});

test('an agent with no attestation cannot mark enrollment as done', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('eligibility.complete-enrollment'), ['line_of_authority' => 'life'])
        ->assertForbidden();
});

test('a guest cannot mark enrollment as done', function () {
    $this->post(route('eligibility.complete-enrollment'))
        ->assertRedirect(route('login'));
});

test('an agent with verified training can schedule their exam with a proctoring type', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);
    TrainingCompletion::factory()->for($agent)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
    ]);

    $this->actingAs($agent)
        ->post(route('eligibility.schedule-exam'), ['proctoring_type' => 'remote'])
        ->assertRedirect(route('dashboard'));

    $attestation->refresh();
    expect($attestation->exam_scheduled_at)->not->toBeNull();
    expect($attestation->proctoring_type)->toBe('remote');
});

test('scheduling the exam requires a valid proctoring type', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);
    TrainingCompletion::factory()->for($agent)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
    ]);

    $this->actingAs($agent)
        ->post(route('eligibility.schedule-exam'), [])
        ->assertInvalid('proctoring_type');

    $this->actingAs($agent)
        ->post(route('eligibility.schedule-exam'), ['proctoring_type' => 'not-a-real-option'])
        ->assertInvalid('proctoring_type');
});

test('an agent without verified training cannot schedule their exam', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);
    TrainingCompletion::factory()->for($agent)->create();

    $this->actingAs($agent)
        ->post(route('eligibility.schedule-exam'), ['proctoring_type' => 'remote'])
        ->assertForbidden();
});

test('an agent with no training completion cannot schedule their exam', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $this->actingAs($agent)
        ->post(route('eligibility.schedule-exam'), ['proctoring_type' => 'remote'])
        ->assertForbidden();
});

test('a guest cannot schedule an exam', function () {
    $this->post(route('eligibility.schedule-exam'))
        ->assertRedirect(route('login'));
});

test('admin can decide a flagged case', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->flaggedForWaiver()->for($agent)->create();

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

    $this->actingAs($agent)->get(route('eligibility.document', $attestation))->assertForbidden();
    $this->actingAs($agent)
        ->post(route('eligibility.decision', $attestation), ['status' => 'cleared'])
        ->assertForbidden();
    $this->actingAs($agent)
        ->post(route('eligibility.line-of-authority.update', $attestation), ['line_of_authority' => 'life'])
        ->assertForbidden();
    $this->actingAs($agent)
        ->post(route('eligibility.exam-schedule.update', $attestation), ['proctoring_type' => 'remote'])
        ->assertForbidden();
    $this->actingAs($agent)
        ->post(route('eligibility.contracting-stages.update', $attestation), ['contracting_stages' => ['forwarded']])
        ->assertForbidden();
});

test('admin can set and change an agent\'s line of authority', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'line_of_authority' => 'life',
    ]);

    $this->actingAs($admin)
        ->post(route('eligibility.line-of-authority.update', $attestation), ['line_of_authority' => 'life_and_health'])
        ->assertRedirect();

    expect($attestation->fresh()->line_of_authority)->toBe('life_and_health');
});

test('updating line of authority requires a valid option', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('eligibility.line-of-authority.update', $attestation), [])
        ->assertInvalid('line_of_authority');

    $this->actingAs($admin)
        ->post(route('eligibility.line-of-authority.update', $attestation), ['line_of_authority' => 'not-a-real-option'])
        ->assertInvalid('line_of_authority');
});

test('admin can set and change an agent\'s proctoring type', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'proctoring_type' => 'remote',
    ]);

    $this->actingAs($admin)
        ->post(route('eligibility.exam-schedule.update', $attestation), ['proctoring_type' => 'in_person'])
        ->assertRedirect();

    expect($attestation->fresh()->proctoring_type)->toBe('in_person');
});

test('updating the exam schedule requires a valid proctoring type', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('eligibility.exam-schedule.update', $attestation), [])
        ->assertInvalid('proctoring_type');

    $this->actingAs($admin)
        ->post(route('eligibility.exam-schedule.update', $attestation), ['proctoring_type' => 'not-a-real-option'])
        ->assertInvalid('proctoring_type');
});

test('admin can check contracting stages independently, in any order', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    // Check "issued" without touching "confirmed" or "forwarded" first.
    $this->actingAs($admin)
        ->post(route('eligibility.contracting-stages.update', $attestation), ['contracting_stages' => ['issued']])
        ->assertRedirect();

    $attestation->refresh();
    expect($attestation->contracting_confirmed_at)->toBeNull();
    expect($attestation->contracting_forwarded_at)->toBeNull();
    expect($attestation->contracting_issued_at)->not->toBeNull();
    expect($attestation->contracting_carrier_certs_at)->toBeNull();

    // Now also check "confirmed" and "carrier_certs".
    $this->actingAs($admin)
        ->post(route('eligibility.contracting-stages.update', $attestation), [
            'contracting_stages' => ['confirmed', 'issued', 'carrier_certs'],
        ])
        ->assertRedirect();

    $attestation->refresh();
    expect($attestation->contracting_confirmed_at)->not->toBeNull();
    expect($attestation->contracting_forwarded_at)->toBeNull();
    expect($attestation->contracting_issued_at)->not->toBeNull();
    expect($attestation->contracting_carrier_certs_at)->not->toBeNull();
});

test('an already-checked stage keeps its original timestamp when re-saved', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'contracting_confirmed_at' => now()->subDay(),
    ]);
    $originalTimestamp = $attestation->contracting_confirmed_at;

    $this->actingAs($admin)
        ->post(route('eligibility.contracting-stages.update', $attestation), [
            'contracting_stages' => ['confirmed', 'forwarded'],
        ])
        ->assertRedirect();

    $attestation->refresh();
    expect($attestation->contracting_confirmed_at->equalTo($originalTimestamp))->toBeTrue();
    expect($attestation->contracting_forwarded_at)->not->toBeNull();
});

test('unchecking a stage clears its timestamp', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
        'contracting_confirmed_at' => now(),
        'contracting_forwarded_at' => now(),
    ]);

    $this->actingAs($admin)
        ->post(route('eligibility.contracting-stages.update', $attestation), [
            'contracting_stages' => ['confirmed'],
        ])
        ->assertRedirect();

    $attestation->refresh();
    expect($attestation->contracting_confirmed_at)->not->toBeNull();
    expect($attestation->contracting_forwarded_at)->toBeNull();
});

test('unchecking every stage is valid', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'contracting_confirmed_at' => now(),
    ]);

    $this->actingAs($admin)
        ->post(route('eligibility.contracting-stages.update', $attestation), [])
        ->assertRedirect();

    expect($attestation->fresh()->contracting_confirmed_at)->toBeNull();
});

test('updating contracting stages rejects an invalid stage key', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('eligibility.contracting-stages.update', $attestation), [
            'contracting_stages' => ['not-a-real-option'],
        ])
        ->assertInvalid('contracting_stages.0');
});

test('a decision can be changed after it was already made', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->flaggedForWaiver()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('eligibility.decision', $attestation), ['status' => 'cleared'])
        ->assertRedirect();

    expect($attestation->fresh()->status)->toBe(EligibilityAttestation::STATUS_CLEARED);

    $this->actingAs($admin)
        ->post(route('eligibility.decision', $attestation), ['status' => 'not_eligible'])
        ->assertRedirect();

    $attestation->refresh();

    expect($attestation->status)->toBe(EligibilityAttestation::STATUS_NOT_ELIGIBLE);
    Notification::assertSentToTimes($agent, EligibilityDecisionNotification::class, 2);
});

test('an admin can reopen a decided case back to flagged for waiver without notifying the agent', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $attestation = EligibilityAttestation::factory()->for($agent)->create([
        'status' => EligibilityAttestation::STATUS_CLEARED,
    ]);

    $this->actingAs($admin)
        ->post(route('eligibility.decision', $attestation), ['status' => 'flagged_for_waiver'])
        ->assertRedirect();

    expect($attestation->fresh()->status)->toBe(EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER);

    Notification::assertNothingSent();
});
