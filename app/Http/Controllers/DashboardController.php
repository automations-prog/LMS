<?php

namespace App\Http\Controllers;

use App\Models\AhipCertification;
use App\Models\EligibilityAttestation;
use App\Models\LicenseSubmission;
use App\Models\TrainingCompletion;
use App\Models\User;
use App\Support\ContractingStages;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class DashboardController extends Controller
{
    /**
     * Display the dashboard — the admin/super-admin management overview, or
     * (for anyone without that role) the agent's resource-focused landing
     * page. Agents hold no admin-level permissions, so nothing
     * user-management-related is ever queried or sent for them.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        if ($request->user()->hasAnyRole(['admin', 'super-admin'])) {
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
        // One query for all 3 role counts (via Spatie's Role::users()
        // relation) instead of one User::whereHas(...)->count() per role.
        $roleCounts = Role::whereIn('name', ['agent', 'admin', 'super-admin'])
            ->withCount('users')
            ->pluck('users_count', 'name');

        $usersByRole = collect(['agent', 'admin', 'super-admin'])
            ->map(fn (string $role) => [
                'key' => $role,
                'label' => match ($role) {
                    'agent' => 'Agents',
                    'admin' => 'Admins',
                    default => 'Super Admins',
                },
                'value' => $roleCounts->get($role, 0),
            ])
            ->values();

        // One grouped query for all 4 eligibility statuses instead of one
        // EligibilityAttestation::where('status', ...)->count() per status.
        $eligibilityCounts = EligibilityAttestation::query()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

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
                'value' => $eligibilityCounts->get($status, 0),
            ])
            ->values();

        // One grouped query for the last 7 days of signups instead of one
        // User::whereDate('created_at', ...)->count() per day.
        $signupCounts = User::query()
            ->where('created_at', '>=', Carbon::today()->subDays(6))
            ->selectRaw('DATE(created_at) as date, count(*) as aggregate')
            ->groupBy('date')
            ->pluck('aggregate', 'date');

        $signupsPerDay = collect(range(6, 0))
            ->map(function (int $daysAgo) use ($signupCounts) {
                $date = Carbon::today()->subDays($daysAgo);

                return [
                    'label' => $date->format('D'),
                    'value' => $signupCounts->get($date->toDateString(), 0),
                ];
            })
            ->values();

        // One grouped query per model (3 total) instead of one
        // Model::where('status', ...)->count() per status per model (9 total).
        $onboardingStageStatus = collect([
            ['key' => 'training', 'label' => 'XCEL Training', 'model' => TrainingCompletion::class],
            ['key' => 'license', 'label' => 'License', 'model' => LicenseSubmission::class],
            ['key' => 'ahip', 'label' => 'AHIP', 'model' => AhipCertification::class],
        ])
            ->map(function (array $stage) {
                /** @var class-string<TrainingCompletion|LicenseSubmission|AhipCertification> $model */
                $model = $stage['model'];

                $counts = $model::query()
                    ->selectRaw('status, count(*) as aggregate')
                    ->groupBy('status')
                    ->pluck('aggregate', 'status');

                return [
                    'key' => $stage['key'],
                    'label' => $stage['label'],
                    'pending_review' => $counts->get($model::STATUS_PENDING_REVIEW, 0),
                    'verified' => $counts->get($model::STATUS_VERIFIED, 0),
                    'rejected' => $counts->get($model::STATUS_REJECTED, 0),
                ];
            })
            ->values();

        // One query with a conditional-aggregate column per stage instead of
        // one EligibilityAttestation::whereNotNull(...)->count() per stage.
        $contractingCounts = EligibilityAttestation::query()
            ->selectRaw(
                collect(ContractingStages::ALL)
                    ->map(fn (string $stage) => sprintf(
                        'count(%s) as %s',
                        ContractingStages::column($stage),
                        $stage,
                    ))
                    ->implode(', '),
            )
            ->first();

        $contractingFunnel = collect(ContractingStages::ALL)
            ->map(fn (string $stage) => [
                'key' => $stage,
                'label' => match ($stage) {
                    ContractingStages::CONFIRMED => 'Confirmed',
                    ContractingStages::FORWARDED => 'Forwarded',
                    ContractingStages::ISSUED => 'Issued',
                    ContractingStages::CARRIER_CERTS => 'Carrier Certs',
                    default => 'Complete',
                },
                'value' => (int) $contractingCounts->{$stage},
            ])
            ->values();

        // One query for total/active users instead of two separate counts.
        $userTotals = User::query()
            ->selectRaw('count(*) as total, sum(case when is_active then 1 else 0 end) as active')
            ->first();

        return Inertia::render('dashboard', [
            'stats' => [
                'total_users' => (int) $userTotals->total,
                'active_users' => (int) $userTotals->active,
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
                'onboarding_stage_status' => $onboardingStageStatus,
                'contracting_funnel' => $contractingFunnel,
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
        $license = $request->user()->licenseSubmission;
        $ahip = $request->user()->ahipCertification;

        return Inertia::render('dashboard-agent', [
            'eligibilityStatus' => in_array($attestation?->status, EligibilityAttestation::UNDER_REVIEW_STATUSES, true)
                ? 'under_review'
                : $attestation?->status,
            'enrollmentCompleted' => $attestation?->enrollment_completed_at !== null,
            'trainingStatus' => $training?->status,
            'trainingNote' => $training?->status === TrainingCompletion::STATUS_REJECTED ? $training->note : null,
            'examScheduled' => $attestation?->exam_scheduled_at !== null,
            'fingerprintingCompleted' => $attestation?->fingerprinting_completed_at !== null,
            'licenseApplicationSubmitted' => $attestation?->license_application_submitted_at !== null,
            'licenseStatus' => $license?->status,
            'licenseNote' => $license?->status === LicenseSubmission::STATUS_REJECTED ? $license->note : null,
            'ahipStatus' => $ahip?->status,
            'ahipNote' => $ahip?->status === AhipCertification::STATUS_REJECTED ? $ahip->note : null,
            'contracting' => $ahip?->status === AhipCertification::STATUS_VERIFIED ? [
                'confirmed' => $attestation?->contracting_confirmed_at !== null,
                'forwarded' => $attestation?->contracting_forwarded_at !== null,
                'issued' => $attestation?->contracting_issued_at !== null,
                'carrier_certs' => $attestation?->contracting_carrier_certs_at !== null,
                'complete' => $attestation?->contracting_complete_at !== null,
            ] : null,
        ]);
    }
}
