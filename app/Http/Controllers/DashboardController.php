<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
     * The agent dashboard — a plain welcome landing page, no user-management
     * or resource data of any kind touches this response.
     */
    private function agentDashboard(): Response
    {
        return Inertia::render('dashboard-agent');
    }
}
