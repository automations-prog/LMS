<?php

use App\Jobs\PullAgentsFromCustomerApiJob;
use App\Models\User;
use App\Notifications\RosterSyncCompletedNotification;
use App\Services\CustomerApiClient;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    config([
        'services.customer_api.domain' => 'https://api.test',
        'services.customer_api.key' => 'test-key',
        'services.customer_api.location_id' => '123',
    ]);
});

function fakeCustomerApiPage(array $students): void
{
    Http::fake([
        'api.test/*' => Http::response([
            'pagedResults' => [
                'pageNumber' => 1,
                'pageSize' => 50,
                'pagesCount' => 1,
                'resultsCount' => count($students),
            ],
            'students' => $students,
        ]),
    ]);
}

test('pulling a new agent creates an active account with the default password', function () {
    Notification::fake();

    fakeCustomerApiPage([
        ['id' => 'ext-1', 'email' => 'new.agent@example.com', 'firstName' => 'New', 'lastName' => 'Agent'],
    ]);

    (new PullAgentsFromCustomerApiJob)->handle(app(CustomerApiClient::class));

    $agent = User::where('email', 'new.agent@example.com')->firstOrFail();

    expect($agent->is_active)->toBeTrue();
    expect($agent->excel_id)->toBe('ext-1');
    expect($agent->hasRole('agent'))->toBeTrue();
    expect(Hash::check('password', $agent->password))->toBeTrue();
    expect($agent->must_change_password)->toBeTrue();
    expect($agent->source)->toBe(User::SOURCE_CUSTOMER_API);
});

test('pulling agents skips students without an email and existing users', function () {
    Notification::fake();

    User::factory()->create(['email' => 'existing@example.com']);

    fakeCustomerApiPage([
        ['id' => 'ext-2', 'firstName' => 'No', 'lastName' => 'Email'],
        ['id' => 'ext-3', 'email' => 'existing@example.com', 'firstName' => 'Existing', 'lastName' => 'User'],
    ]);

    $countBefore = User::count();

    (new PullAgentsFromCustomerApiJob)->handle(app(CustomerApiClient::class));

    expect(User::count())->toBe($countBefore);
});

test('a roster pull that creates new agents notifies every reviewer', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    fakeCustomerApiPage([
        ['id' => 'ext-4', 'email' => 'another.new.agent@example.com', 'firstName' => 'Another', 'lastName' => 'Agent'],
    ]);

    (new PullAgentsFromCustomerApiJob)->handle(app(CustomerApiClient::class));

    Notification::assertSentTo(
        $admin,
        RosterSyncCompletedNotification::class,
        fn ($notification, $channels, $notifiable) => $notification->toArray($notifiable)['body'] === '1 new agent was invited.',
    );
});

test('a roster pull that creates no new agents does not notify anyone', function () {
    Notification::fake();

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    User::factory()->create(['email' => 'existing@example.com']);

    fakeCustomerApiPage([
        ['id' => 'ext-5', 'email' => 'existing@example.com', 'firstName' => 'Existing', 'lastName' => 'User'],
    ]);

    (new PullAgentsFromCustomerApiJob)->handle(app(CustomerApiClient::class));

    Notification::assertNotSentTo($admin, RosterSyncCompletedNotification::class);
});

test('a manually triggered pull always confirms the result to whoever clicked, even at zero', function () {
    Notification::fake();

    $clicker = User::factory()->create();
    $clicker->assignRole('admin');

    User::factory()->create(['email' => 'existing@example.com']);

    fakeCustomerApiPage([
        ['id' => 'ext-6', 'email' => 'existing@example.com', 'firstName' => 'Existing', 'lastName' => 'User'],
    ]);

    (new PullAgentsFromCustomerApiJob($clicker))->handle(app(CustomerApiClient::class));

    Notification::assertSentTo(
        $clicker,
        RosterSyncCompletedNotification::class,
        fn ($notification, $channels, $notifiable) => $notification->toArray($notifiable)['body'] === '0 new agents were invited.',
    );
});

test('a manually triggered pull that finds new agents also notifies the other reviewers, but not twice to the clicker', function () {
    Notification::fake();

    $clicker = User::factory()->create();
    $clicker->assignRole('admin');

    $otherReviewer = User::factory()->create();
    $otherReviewer->assignRole('admin');

    fakeCustomerApiPage([
        ['id' => 'ext-7', 'email' => 'brand.new.agent@example.com', 'firstName' => 'Brand', 'lastName' => 'New'],
    ]);

    (new PullAgentsFromCustomerApiJob($clicker))->handle(app(CustomerApiClient::class));

    Notification::assertSentToTimes($clicker, RosterSyncCompletedNotification::class, 1);
    Notification::assertSentTo($otherReviewer, RosterSyncCompletedNotification::class);
});
