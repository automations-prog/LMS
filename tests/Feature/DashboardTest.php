<?php

use App\Models\Course;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('admins and super admins see the management dashboard', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page->component('dashboard'));
});

test('agents see the agent dashboard, with no user-management data', function () {
    $this->seed(RolesAndPermissionsSeeder::class);

    $agent = User::factory()->create();
    $agent->assignRole('agent');

    Course::factory()->create(['status' => 'published']);
    Course::factory()->create(['status' => 'draft']);

    $response = $this->actingAs($agent)->get(route('dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->component('dashboard-agent')
        ->where('stats.available', 1)
        ->missing('stats.total_users')
        ->missing('charts'));
});