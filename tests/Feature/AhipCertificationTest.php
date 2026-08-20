<?php

use App\Models\AhipCertification;
use App\Models\EligibilityAttestation;
use App\Models\User;
use App\Notifications\AhipCertificationDecisionNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    Storage::fake('local');
});

function ahipCertificateFile(string $name = 'ahip-certificate.pdf'): UploadedFile
{
    return UploadedFile::fake()->create($name, 100, 'application/pdf');
}

test('an agent with no record can submit an AHIP certificate', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->cleared()->for($agent)->create();

    $this->actingAs($agent)
        ->post(route('ahip-certification.store'), ['certificate_file' => ahipCertificateFile()])
        ->assertRedirect(route('dashboard'));

    $certification = $agent->ahipCertification()->first();

    expect($certification->status)->toBe(AhipCertification::STATUS_PENDING_REVIEW);
    Storage::disk('local')->assertExists($certification->certificate_path);
});

test('an agent cannot submit before eligibility is cleared', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('ahip-certification.store'), ['certificate_file' => ahipCertificateFile()])
        ->assertForbidden();
});

test('an agent cannot submit while pending review or verified', function () {
    $pendingAgent = User::factory()->create();
    $pendingAgent->assignRole('agent');
    EligibilityAttestation::factory()->cleared()->for($pendingAgent)->create();
    AhipCertification::factory()->for($pendingAgent)->create();

    $this->actingAs($pendingAgent)
        ->post(route('ahip-certification.store'), ['certificate_file' => ahipCertificateFile()])
        ->assertForbidden();

    $verifiedAgent = User::factory()->create();
    $verifiedAgent->assignRole('agent');
    EligibilityAttestation::factory()->cleared()->for($verifiedAgent)->create();
    AhipCertification::factory()->for($verifiedAgent)->create([
        'status' => AhipCertification::STATUS_VERIFIED,
    ]);

    $this->actingAs($verifiedAgent)
        ->post(route('ahip-certification.store'), ['certificate_file' => ahipCertificateFile()])
        ->assertForbidden();
});

test('an agent can resubmit after a rejection, clearing the previous note', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    EligibilityAttestation::factory()->cleared()->for($agent)->create();
    $certification = AhipCertification::factory()->rejected()->for($agent)->create();
    $oldPath = $certification->certificate_path;
    Storage::disk('local')->put($oldPath, 'old certificate contents');

    $this->actingAs($agent)
        ->post(route('ahip-certification.store'), ['certificate_file' => ahipCertificateFile('new-certificate.pdf')])
        ->assertRedirect(route('dashboard'));

    $certification->refresh();

    expect($certification->status)->toBe(AhipCertification::STATUS_PENDING_REVIEW);
    expect($certification->note)->toBeNull();
    expect($certification->certificate_path)->not->toBe($oldPath);
    Storage::disk('local')->assertMissing($oldPath);
    Storage::disk('local')->assertExists($certification->certificate_path);
});

test('guests are redirected to login on all AHIP certification routes', function () {
    $certification = AhipCertification::factory()->create();

    $this->post(route('ahip-certification.store'), ['certificate_file' => ahipCertificateFile()])->assertRedirect(route('login'));
    $this->get(route('ahip-certification.document', $certification))->assertRedirect(route('login'));
});

test('admin can download an AHIP certificate', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $certification = AhipCertification::factory()->for($agent)->create();
    Storage::disk('local')->put($certification->certificate_path, 'certificate contents');

    $this->actingAs($admin)
        ->get(route('ahip-certification.document', $certification))
        ->assertOk();
});

test('rejecting without a note fails validation, with a note succeeds and notifies the agent', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $certification = AhipCertification::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('ahip-certification.decision', $certification), ['status' => 'rejected'])
        ->assertSessionHasErrors('note');

    $this->actingAs($admin)
        ->post(route('ahip-certification.decision', $certification), [
            'status' => 'rejected',
            'note' => 'The certificate is blurry, please re-upload.',
        ])
        ->assertRedirect();

    $certification->refresh();

    expect($certification->status)->toBe(AhipCertification::STATUS_REJECTED);
    expect($certification->note)->toBe('The certificate is blurry, please re-upload.');
    expect($certification->reviewed_by)->toBe($admin->id);

    Notification::assertSentTo($agent, AhipCertificationDecisionNotification::class);
});

test('verifying notifies the agent, reopening to pending review does not', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $certification = AhipCertification::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('ahip-certification.decision', $certification), ['status' => 'verified'])
        ->assertRedirect();

    expect($certification->fresh()->status)->toBe(AhipCertification::STATUS_VERIFIED);
    Notification::assertSentTo($agent, AhipCertificationDecisionNotification::class);

    Notification::fake();

    $this->actingAs($admin)
        ->post(route('ahip-certification.decision', $certification), ['status' => 'pending_review'])
        ->assertRedirect();

    expect($certification->fresh()->status)->toBe(AhipCertification::STATUS_PENDING_REVIEW);
    Notification::assertNothingSent();
});

test('a non-reviewer agent is forbidden from all admin AHIP certification routes', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $certification = AhipCertification::factory()->create();

    $this->actingAs($agent)->get(route('ahip-certification.document', $certification))->assertForbidden();
    $this->actingAs($agent)
        ->post(route('ahip-certification.decision', $certification), ['status' => 'verified'])
        ->assertForbidden();
});
