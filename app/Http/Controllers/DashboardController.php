<?php

namespace App\Http\Controllers;

use App\Models\EligibilityAttestation;
use App\Models\TrainingCompletion;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
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
    public function index(Request $request): Response|RedirectResponse
    {
        if ($request->user()->can('courses.view')) {
            return $this->managementDashboard();
        }

        // Newly activated agents must complete the eligibility form before
        // they can see anything else — even if they navigate straight to
        // /dashboard instead of following the invite-acceptance redirect.
        if (! $request->user()->eligibilityAttestation) {
            return redirect()->route('eligibility.create');
        }

        return $this->agentDashboard($request);
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

        $eligibilityByStatus = collect([
            EligibilityAttestation::STATUS_PENDING,
            EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER,
            EligibilityAttestation::STATUS_CLEARED,
            EligibilityAttestation::STATUS_NOT_ELIGIBLE,
        ])
            ->map(fn (string $status) => [
                'key' => $status,
                'label' => match ($status) {
                    EligibilityAttestation::STATUS_PENDING => 'Pending',
                    EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER => 'Flagged',
                    EligibilityAttestation::STATUS_CLEARED => 'Eligible',
                    default => 'Not eligible',
                },
                'value' => EligibilityAttestation::where('status', $status)->count(),
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
                'active_users' => User::where('is_active', true)->count(),
                'pending_eligibility_reviews' => EligibilityAttestation::whereIn(
                    'status', EligibilityAttestation::UNDER_REVIEW_STATUSES,
                )->count(),
                'pending_training_reviews' => TrainingCompletion::where(
                    'status', TrainingCompletion::STATUS_PENDING_REVIEW,
                )->count(),
            ],
            'charts' => [
                'users_by_role' => $usersByRole,
                'eligibility_by_status' => $eligibilityByStatus,
                'signups_per_day' => $signupsPerDay,
            ],
        ]);
    }

    /**
     * The agent dashboard — a plain welcome landing page, no user-management
     * or resource data of any kind touches this response. The one exception
     * is the agent's own eligibility/enrollment/training status, which the
     * page uses to decide which onboarding step (if any) to show.
     */
    private function agentDashboard(Request $request): Response
    {
        $attestation = $request->user()->eligibilityAttestation;
        $training = $request->user()->trainingCompletion;

        return Inertia::render('dashboard-agent', [
            'eligibilityStatus' => in_array($attestation?->status, EligibilityAttestation::UNDER_REVIEW_STATUSES, true)
                ? 'under_review'
                : $attestation?->status,
            'enrollmentCompleted' => $attestation?->enrollment_completed_at !== null,
            'trainingStatus' => $training?->status,
            'trainingNote' => $training?->status === TrainingCompletion::STATUS_REJECTED ? $training->note : null,
        ]);
    }
}
