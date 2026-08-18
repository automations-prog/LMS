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
     * Display the dashboard, with a few temporary at-a-glance charts.
     */
    public function index(Request $request): Response
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
}
