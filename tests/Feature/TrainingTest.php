<?php

use App\Models\TrainingCompletion;
use App\Models\User;
use App\Notifications\TrainingDecisionNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    Storage::fake('local');
});

function certificateFile(string $name = 'certificate.pdf'): UploadedFile
{
    return UploadedFile::fake()->create($name, 100, 'application/pdf');
}

test('an agent with no record can submit a certificate', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->post(route('training.store'), ['certificate_file' => certificateFile()])
        ->assertRedirect(route('dashboard'));

    $completion = $agent->trainingCompletion()->first();

    expect($completion->status)->toBe(TrainingCompletion::STATUS_PENDING_REVIEW);
    Storage::disk('local')->assertExists($completion->certificate_path);
});

test('an agent cannot submit while pending review or verified', function () {
    $pendingAgent = User::factory()->create();
    $pendingAgent->assignRole('agent');
    TrainingCompletion::factory()->for($pendingAgent)->create();

    $this->actingAs($pendingAgent)
        ->post(route('training.store'), ['certificate_file' => certificateFile()])
        ->assertForbidden();

    $verifiedAgent = User::factory()->create();
    $verifiedAgent->assignRole('agent');
    TrainingCompletion::factory()->for($verifiedAgent)->create([
        'status' => TrainingCompletion::STATUS_VERIFIED,
    ]);

    $this->actingAs($verifiedAgent)
        ->post(route('training.store'), ['certificate_file' => certificateFile()])
        ->assertForbidden();
});

test('an agent can resubmit after a rejection, clearing the previous note', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $completion = TrainingCompletion::factory()->rejected()->for($agent)->create();
    $oldPath = $completion->certificate_path;
    Storage::disk('local')->put($oldPath, 'old certificate contents');

    $this->actingAs($agent)
        ->post(route('training.store'), ['certificate_file' => certificateFile('new-certificate.pdf')])
        ->assertRedirect(route('dashboard'));

    $completion->refresh();

    expect($completion->status)->toBe(TrainingCompletion::STATUS_PENDING_REVIEW);
    expect($completion->note)->toBeNull();
    expect($completion->certificate_path)->not->toBe($oldPath);
    Storage::disk('local')->assertMissing($oldPath);
    Storage::disk('local')->assertExists($completion->certificate_path);
});

test('guests are redirected to login on all training routes', function () {
    $completion = TrainingCompletion::factory()->create();

    $this->post(route('training.store'), ['certificate_file' => certificateFile()])->assertRedirect(route('login'));
    $this->get(route('training.index'))->assertRedirect(route('login'));
    $this->get(route('training.show', $completion))->assertRedirect(route('login'));
});

test('admin can list, search, view, and download a certificate', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create(['name' => 'Findable Person']);
    $agent->assignRole('agent');
    $completion = TrainingCompletion::factory()->for($agent)->create();
    Storage::disk('local')->put($completion->certificate_path, 'certificate contents');

    $this->actingAs($admin)
        ->get(route('training.index', ['search' => 'Findable']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/training/index')
            ->has('completions.data', 1));

    $this->actingAs($admin)
        ->get(route('training.show', $completion))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('admin/training/show'));

    $this->actingAs($admin)
        ->get(route('training.document', $completion))
        ->assertOk();
});

test('rejecting without a note fails validation, with a note succeeds and notifies the agent', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $completion = TrainingCompletion::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('training.decision', $completion), ['status' => 'rejected'])
        ->assertSessionHasErrors('note');

    $this->actingAs($admin)
        ->post(route('training.decision', $completion), [
            'status' => 'rejected',
            'note' => 'The certificate is blurry, please re-upload.',
        ])
        ->assertRedirect();

    $completion->refresh();

    expect($completion->status)->toBe(TrainingCompletion::STATUS_REJECTED);
    expect($completion->note)->toBe('The certificate is blurry, please re-upload.');
    expect($completion->reviewed_by)->toBe($admin->id);

    Notification::assertSentTo($agent, TrainingDecisionNotification::class);
});

test('verifying notifies the agent, reopening to pending review does not', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $completion = TrainingCompletion::factory()->for($agent)->create();

    $this->actingAs($admin)
        ->post(route('training.decision', $completion), ['status' => 'verified'])
        ->assertRedirect();

    expect($completion->fresh()->status)->toBe(TrainingCompletion::STATUS_VERIFIED);
    Notification::assertSentTo($agent, TrainingDecisionNotification::class);

    Notification::fake();

    $this->actingAs($admin)
        ->post(route('training.decision', $completion), ['status' => 'pending_review'])
        ->assertRedirect();

    expect($completion->fresh()->status)->toBe(TrainingCompletion::STATUS_PENDING_REVIEW);
    Notification::assertNothingSent();
});

test('a non-training-reviewer agent is forbidden from all admin training routes', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $completion = TrainingCompletion::factory()->create();

    $this->actingAs($agent)->get(route('training.index'))->assertForbidden();
    $this->actingAs($agent)->get(route('training.show', $completion))->assertForbidden();
    $this->actingAs($agent)->get(route('training.document', $completion))->assertForbidden();
    $this->actingAs($agent)
        ->post(route('training.decision', $completion), ['status' => 'verified'])
        ->assertForbidden();
});
