<?php

use App\Models\EligibilityAttestation;
use App\Models\LicenseSubmission;
use App\Models\User;
use App\Notifications\LicenseDecisionNotification;
use App\Notifications\NewSubmissionForReviewNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    Storage::fake('local');
});

function licenseFile(string $name = 'license.pdf'): UploadedFile
{
    return UploadedFile::fake()->create($name, 100, 'application/pdf');
}

test('an agent with no record can submit a license copy', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->cleared()->for($agent)->create();

    $this->actingAs($agent)
        ->post(route('license.store'), ['license_file' => licenseFile()])
        ->assertRedirect(route('onboarding.journey'));

    $submission = $agent->licenseSubmission()->first();

    expect($submission->status)->toBe(LicenseSubmission::STATUS_PENDING_REVIEW);
    Storage::disk('local')->assertExists($submission->license_path);
});

test('submitting a license copy notifies every reviewer', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->cleared()->for($agent)->create();

    $this->actingAs($agent)
        ->post(route('license.store'), ['license_file' => licenseFile()])
        ->assertRedirect(route('onboarding.journey'));

    Notification::assertSentTo($admin, NewSubmissionForReviewNotification::class);
});

test('an agent cannot submit before eligibility is cleared', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('license.store'), ['license_file' => licenseFile()])
        ->assertForbidden();
});

test('an agent cannot submit while pending review or verified', function () {
    $pendingAgent = User::factory()->create();
    $pendingAgent->assignRole('agent');
    EligibilityAttestation::factory()->cleared()->for($pendingAgent)->create();
    LicenseSubmission::factory()->for($pendingAgent)->create();

    $this->actingAs($pendingAgent)
        ->post(route('license.store'), ['license_file' => licenseFile()])
        ->assertForbidden();

    $verifiedAgent = User::factory()->create();
    $verifiedAgent->assignRole('agent');
    EligibilityAttestation::factory()->cleared()->for($verifiedAgent)->create();
    LicenseSubmission::factory()->for($verifiedAgent)->create([
        'status' => LicenseSubmission::STATUS_VERIFIED,
    ]);

    $this->actingAs($verifiedAgent)
        ->post(route('license.store'), ['license_file' => licenseFile()])
        ->assertForbidden();
});

test('an agent can resubmit after a rejection, clearing the previous note', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->cleared()->for($agent)->create();
    $submission = LicenseSubmission::factory()->rejected()->for($agent)->create();
    $oldPath = $submission->license_path;
    Storage::disk('local')->put($oldPath, 'old license contents');

    $this->actingAs($agent)
        ->post(route('license.store'), ['license_file' => licenseFile('new-license.pdf')])
        ->assertRedirect(route('onboarding.journey'));

    $submission->refresh();

    expect($submission->status)->toBe(LicenseSubmission::STATUS_PENDING_REVIEW);
    expect($submission->note)->toBeNull();
    expect($submission->license_path)->not->toBe($oldPath);
    Storage::disk('local')->assertMissing($oldPath);
    Storage::disk('local')->assertExists($submission->license_path);
});

test('guests are redirected to login on all license routes', function () {
    $submission = LicenseSubmission::factory()->create();

    $this->post(route('license.store'), ['license_file' => licenseFile()])->assertRedirect(route('login'));
    $this->get(route('license.document', $submission))->assertRedirect(route('login'));
});

test('admin can download a license copy', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $submission = LicenseSubmission::factory()->for($agent)->create();
    Storage::disk('local')->put($submission->license_path, 'license contents');

    $this->actingAs($admin)
        ->get(route('license.document', $submission))
        ->assertOk();
});

test('rejecting without a note fails validation, with a note succeeds and notifies the agent', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $submission = LicenseSubmission::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('license.decision', $submission), ['status' => 'rejected'])
        ->assertSessionHasErrors('note');

    $this->actingAs($admin)
        ->post(route('license.decision', $submission), [
            'status' => 'rejected',
            'note' => 'The copy is blurry, please re-upload.',
        ])
        ->assertRedirect();

    $submission->refresh();

    expect($submission->status)->toBe(LicenseSubmission::STATUS_REJECTED);
    expect($submission->note)->toBe('The copy is blurry, please re-upload.');
    expect($submission->reviewed_by)->toBe($admin->id);

    Notification::assertSentTo($agent, LicenseDecisionNotification::class);
});

test('verifying notifies the agent, reopening to pending review does not', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $submission = LicenseSubmission::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('license.decision', $submission), ['status' => 'verified'])
        ->assertRedirect();

    expect($submission->fresh()->status)->toBe(LicenseSubmission::STATUS_VERIFIED);
    Notification::assertSentTo($agent, LicenseDecisionNotification::class);

    Notification::fake();

    $this->actingAs($admin)
        ->post(route('license.decision', $submission), ['status' => 'pending_review'])
        ->assertRedirect();

    expect($submission->fresh()->status)->toBe(LicenseSubmission::STATUS_PENDING_REVIEW);
    Notification::assertNothingSent();
});

test('verifying with an expiration date stores it, rejecting clears it', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $submission = LicenseSubmission::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('license.decision', $submission), [
            'status' => 'verified',
            'expires_at' => '2027-06-15',
        ])
        ->assertRedirect();

    expect($submission->fresh()->expires_at->toDateString())->toBe('2027-06-15');

    $this->actingAs($admin)
        ->post(route('license.decision', $submission), [
            'status' => 'rejected',
            'note' => 'Expired copy, please re-upload.',
        ])
        ->assertRedirect();

    expect($submission->fresh()->expires_at)->toBeNull();
});

test('a non-license-reviewer agent is forbidden from all admin license routes', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $submission = LicenseSubmission::factory()->create();

    $this->actingAs($agent)->get(route('license.document', $submission))->assertForbidden();
    $this->actingAs($agent)
        ->post(route('license.decision', $submission), ['status' => 'verified'])
        ->assertForbidden();
});
