<?php

use App\Models\AhipCertification;
use App\Models\EligibilityAttestation;
use App\Models\LicenseSubmission;
use App\Models\TrainingCompletion;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    Storage::fake('local');
});

test('guests are redirected to login', function () {
    $this->get(route('documents.index'))->assertRedirect(route('login'));
});

test('a brand new agent sees every document slot as not submitted', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('documents.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/index')
            ->where('documents.eligibility', null)
            ->where('documents.training', null)
            ->where('documents.license', null)
            ->where('documents.ahip', null));
});

test('an agent sees the status, note, expiry, and document link for each submission', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    EligibilityAttestation::factory()->for($agent)->create([
        'work_authorization_path' => 'work-authorization/agent.pdf',
    ]);
    Storage::disk('local')->put('work-authorization/agent.pdf', 'contents');

    TrainingCompletion::factory()->rejected()->for($agent)->create([
        'note' => 'Blurry scan, please redo.',
    ]);

    LicenseSubmission::factory()->verified()->for($agent)->create([
        'expires_at' => now()->addDays(10),
    ]);

    AhipCertification::factory()->verified()->for($agent)->create([
        'expires_at' => now()->addYear(),
    ]);

    $this->actingAs($agent)
        ->get(route('documents.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('documents/index')
            ->where('documents.eligibility.document_url', route('eligibility.document', $agent->eligibilityAttestation))
            ->where('documents.training.status', 'rejected')
            ->where('documents.training.note', 'Blurry scan, please redo.')
            ->where('documents.license.status', 'verified')
            ->where('documents.license.expires_at', now()->addDays(10)->toDateString())
            ->where('documents.ahip.status', 'verified'));
});

test('a verified submission with no note stays null even if an older note exists in the row', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    TrainingCompletion::factory()->for($agent)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
        'note' => null,
    ]);

    $this->actingAs($agent)
        ->get(route('documents.index'))
        ->assertInertia(fn ($page) => $page
            ->where('documents.training.status', 'verified')
            ->where('documents.training.note', null));
});
