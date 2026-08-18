<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Course;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the dashboard — the admin/super-admin management overview, or
     * (lacking courses.view) the agent's resource-focused landing page. Agents
     * only ever hold courses.browse, so nothing user-management-related is
     * ever queried or sent for them.
     */
    public function index(Request $request): Response
    {
        if ($request->user()->can('courses.view')) {
            return $this->managementDashboard();
        }

        return $this->agentDashboard();
    }

    /**
     * The admin/super-admin dashboard, with a few temporary at-a-glance charts.
     */
    private function managementDashboard(): Response
    {
        $usersByRole = collect(['agent', 'admin', 'super-admin'])
            ->map(fn (string $role) => [
                'key' => $role,
                'label' => match ($role) {
                    'agent' => 'Agents',
                    'admin' => 'Admins',
                    default => 'Super Admins',
                },
                // Not User::role() — Spatie's role() scope throws
                // RoleDoesNotExist if the role hasn't been seeded yet.
                'value' => User::whereHas('roles', fn ($query) => $query->where('name', $role))->count(),
            ])
            ->values();

        $coursesByStatus = collect(['published', 'draft'])
            ->map(fn (string $status) => [
                'key' => $status,
                'label' => ucfirst($status),
                'value' => Course::where('status', $status)->count(),
            ])
            ->values();

        $signupsPerDay = collect(range(6, 0))
            ->map(function (int $daysAgo) {
                $date = Carbon::today()->subDays($daysAgo);

                return [
                    'label' => $date->format('D'),
                    'value' => User::whereDate('created_at', $date)->count(),
                ];
            })
            ->values();

        return Inertia::render('dashboard', [
            'stats' => [
                'total_users' => User::count(),
                'total_resources' => Course::count(),
                'published_resources' => Course::where('status', 'published')->count(),
                'active_users' => User::where('is_active', true)->count(),
            ],
            'charts' => [
                'users_by_role' => $usersByRole,
                'resources_by_status' => $coursesByStatus,
                'signups_per_day' => $signupsPerDay,
            ],
        ]);
    }

    /**
     * The agent dashboard — resource-focused, no user-management data of any
     * kind ever touches this response.
     */
    private function agentDashboard(): Response
    {
        $published = Course::where('status', 'published');

        $categoryCount = Category::whereHas('courses', fn ($query) => $query->where('status', 'published'))->count();

        $recent = Course::query()
            ->with('category')
            ->where('status', 'published')
            ->latest()
            ->take(6)
            ->get()
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'title' => $course->title,
                'category' => $course->category,
                'resource_type' => $course->resource_type,
                'resource_url' => $course->resource_type === 'link'
                    ? $course->resource_url
                    : Storage::disk('public')->url($course->resource_path),
                'thumbnail_url' => $course->thumbnail_path
                    ? Storage::disk('public')->url($course->thumbnail_path)
                    : null,
            ]);

        return Inertia::render('dashboard-agent', [
            'stats' => [
                'available' => (clone $published)->count(),
                'categories' => $categoryCount,
                'added_this_week' => (clone $published)->where('created_at', '>=', now()->subDays(7))->count(),
            ],
            'recent' => $recent,
        ]);
    }
}
