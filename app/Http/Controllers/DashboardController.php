<?php

namespace App\Http\Controllers;

use App\Models\AhipCertification;
use App\Models\EligibilityAttestation;
use App\Models\LicenseSubmission;
use App\Models\RoleplaySession;
use App\Models\TrainingCompletion;
use App\Models\User;
use App\Support\ContractingStages;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
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
            return $this->managementDashboard($request);
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
    private function managementDashboard(Request $request): Response
    {
        $eligibilityStatus = $request->string('eligibility_status')->trim()->toString();
        $trainingStatus = $request->string('training_status')->trim()->toString();
        $licenseStatus = $request->string('license_status')->trim()->toString();
        $ahipStatus = $request->string('ahip_status')->trim()->toString();

        $anyFilterActive = $eligibilityStatus !== '' || $trainingStatus !== '' || $licenseStatus !== '' || $ahipStatus !== '';

        // Same "which agents match these statuses" query Onboarding Review
        // uses, just reduced to an id list — null (rather than an empty
        // Collection) when no filter is active, so every query below can
        // stay untouched on a normal, unfiltered dashboard load.
        $filteredAgentIds = $anyFilterActive
            ? User::query()
                ->role('agent')
                ->when($eligibilityStatus !== '', fn ($query) => $query
                    ->whereHas('eligibilityAttestation', fn ($query) => $query->where('status', $eligibilityStatus)))
                ->when($trainingStatus !== '', fn ($query) => $query
                    ->whereHas('trainingCompletion', fn ($query) => $query->where('status', $trainingStatus)))
                ->when($licenseStatus !== '', fn ($query) => $query
                    ->whereHas('licenseSubmission', fn ($query) => $query->where('status', $licenseStatus)))
                ->when($ahipStatus !== '', fn ($query) => $query
                    ->whereHas('ahipCertification', fn ($query) => $query->where('status', $ahipStatus)))
                ->pluck('id')
            : null;

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
            ->when($filteredAgentIds !== null, fn ($query) => $query->whereIn('user_id', $filteredAgentIds))
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
            ->map(function (array $stage) use ($filteredAgentIds) {
                /** @var class-string<TrainingCompletion|LicenseSubmission|AhipCertification> $model */
                $model = $stage['model'];

                $counts = $model::query()
                    ->when($filteredAgentIds !== null, fn ($query) => $query->whereIn('user_id', $filteredAgentIds))
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
            ->when($filteredAgentIds !== null, fn ($query) => $query->whereIn('user_id', $filteredAgentIds))
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

        $roleplayTotals = RoleplaySession::query()
            ->where('status', RoleplaySession::STATUS_SCORED)
            ->selectRaw('count(*) as scored, avg(overall_score) as avg_score')
            ->first();

        return Inertia::render('dashboard', [
            'filters' => [
                'eligibility_status' => $eligibilityStatus,
                'training_status' => $trainingStatus,
                'license_status' => $licenseStatus,
                'ahip_status' => $ahipStatus,
            ],
            'stats' => [
                'total_users' => (int) $userTotals->total,
                'active_users' => (int) $userTotals->active,
                'pending_eligibility_reviews' => EligibilityAttestation::query()
                    ->when($filteredAgentIds !== null, fn ($query) => $query->whereIn('user_id', $filteredAgentIds))
                    ->whereIn('status', EligibilityAttestation::UNDER_REVIEW_STATUSES)
                    ->count(),
                'pending_training_reviews' => TrainingCompletion::query()
                    ->when($filteredAgentIds !== null, fn ($query) => $query->whereIn('user_id', $filteredAgentIds))
                    ->where('status', TrainingCompletion::STATUS_PENDING_REVIEW)
                    ->count(),
                'roleplay_sessions_scored' => (int) $roleplayTotals->scored,
                'roleplay_avg_score' => $roleplayTotals->avg_score !== null
                    ? round((float) $roleplayTotals->avg_score, 1)
                    : null,
            ],
            'charts' => [
                'users_by_role' => $usersByRole,
                'eligibility_by_status' => $eligibilityByStatus,
                'signups_per_day' => $signupsPerDay,
                'onboarding_stage_status' => $onboardingStageStatus,
                'contracting_funnel' => $contractingFunnel,
                'onboarding_funnel' => $this->onboardingFunnel($filteredAgentIds),
            ],
        ]);
    }

    /**
     * How many agents have reached each checkpoint in the onboarding
     * sequence, and on average how many days after submitting their
     * eligibility attestation they got there. Walks the required chain
     * only (submission through contracting complete) — `carrier_certs` is
     * an optional side branch per ContractingStages::DEPENDENCIES, not a
     * step everyone passes through, so it's left out of this funnel.
     *
     * Computed in PHP rather than a database-side date diff so it behaves
     * the same on sqlite (tests) and whatever the app runs in production.
     *
     * @param  Collection<int, int>|null  $filteredAgentIds  Narrow the funnel to just these agents' attestations, or null for everyone.
     * @return array<int, array{key: string, label: string, count: int, avg_days: float}>
     */
    private function onboardingFunnel(?Collection $filteredAgentIds = null): array
    {
        $stages = [
            ['key' => 'submitted', 'label' => 'Submitted', 'column' => null],
            ['key' => 'enrollment', 'label' => 'Enrollment', 'column' => 'enrollment_completed_at'],
            ['key' => 'exam_scheduled', 'label' => 'Exam Scheduled', 'column' => 'exam_scheduled_at'],
            ['key' => 'fingerprinting', 'label' => 'Fingerprinting', 'column' => 'fingerprinting_completed_at'],
            ['key' => 'license_application', 'label' => 'License Application', 'column' => 'license_application_submitted_at'],
            ['key' => 'contracting_confirmed', 'label' => 'Contracting Confirmed', 'column' => 'contracting_confirmed_at'],
            ['key' => 'contracting_forwarded', 'label' => 'Forwarded', 'column' => 'contracting_forwarded_at'],
            ['key' => 'contracting_issued', 'label' => 'Issued', 'column' => 'contracting_issued_at'],
            ['key' => 'contracting_complete', 'label' => 'Complete', 'column' => 'contracting_complete_at'],
        ];

        $columns = collect($stages)->pluck('column')->filter()->values()->all();

        $attestations = EligibilityAttestation::query()
            ->when($filteredAgentIds !== null, fn ($query) => $query->whereIn('user_id', $filteredAgentIds))
            ->select(['id', 'created_at', ...$columns])
            ->get();

        return collect($stages)
            ->map(function (array $stage) use ($attestations) {
                if ($stage['column'] === null) {
                    return [
                        'key' => $stage['key'],
                        'label' => $stage['label'],
                        'count' => $attestations->count(),
                        'avg_days' => 0.0,
                    ];
                }

                $reached = $attestations->filter(fn ($row) => $row->{$stage['column']} !== null);

                return [
                    'key' => $stage['key'],
                    'label' => $stage['label'],
                    'count' => $reached->count(),
                    'avg_days' => $reached->isEmpty() ? 0.0 : round(
                        $reached->avg(fn ($row) => $row->created_at->diffInDays($row->{$stage['column']})),
                        1,
                    ),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * The agent dashboard — blank apart from the "eligibility under review"
     * notice (while that's the state) and the agent's own license/AHIP
     * expiry warnings; the full onboarding step tracker lives on its own
     * page now — see onboardingJourney().
     */
    private function agentDashboard(Request $request): Response
    {
        $data = $this->agentOnboardingData($request->user());

        return Inertia::render('dashboard-agent', [
            'eligibilityStatus' => $data['eligibilityStatus'],
            'licenseStatus' => $data['licenseStatus'],
            'licenseExpiresAt' => $data['licenseExpiresAt'],
            'ahipStatus' => $data['ahipStatus'],
            'ahipExpiresAt' => $data['ahipExpiresAt'],
        ]);
    }

    /**
     * The full onboarding step tracker — the journey path plus whichever
     * action card is next (enrollment, training, exam, fingerprinting,
     * license, AHIP, contracting). Split out of the dashboard so agents get
     * a light landing page there instead of the whole checklist every time.
     */
    public function onboardingJourney(Request $request): Response|RedirectResponse
    {
        // Agent-only data — an admin/super-admin has none of this. Checked
        // before the eligibility-attestation gate below, since an admin
        // never has one either and would otherwise get redirected to the
        // eligibility form instead of a 404.
        abort_if($request->user()->hasAnyRole(['admin', 'super-admin']), 404);

        // Same gate as index() applies before ever reaching agentDashboard()
        // — reachable directly by URL, so it needs its own copy of the check.
        if (! $request->user()->eligibilityAttestation) {
            return redirect()->route('eligibility.create');
        }

        return Inertia::render('onboarding-journey', $this->agentOnboardingData($request->user()));
    }

    /**
     * The agent's full eligibility/enrollment/training/license/AHIP/
     * contracting state — shared by the trimmed-down dashboard (which only
     * needs a slice of it for the expiry banners) and the full onboarding
     * journey page (which needs all of it).
     *
     * @return array<string, mixed>
     */
    private function agentOnboardingData(User $user): array
    {
        $attestation = $user->eligibilityAttestation;
        $training = $user->trainingCompletion;
        $license = $user->licenseSubmission;
        $ahip = $user->ahipCertification;

        return [
            'eligibilityStatus' => $user->eligibilityDisplayStatus(),
            'enrollmentCompleted' => $attestation?->enrollment_completed_at !== null,
            'trainingStatus' => $training?->status,
            'trainingNote' => $training?->status === TrainingCompletion::STATUS_REJECTED ? $training->note : null,
            'examScheduled' => $attestation?->exam_scheduled_at !== null,
            'fingerprintingCompleted' => $attestation?->fingerprinting_completed_at !== null,
            'licenseApplicationSubmitted' => $attestation?->license_application_submitted_at !== null,
            'licenseStatus' => $license?->status,
            'licenseNote' => $license?->status === LicenseSubmission::STATUS_REJECTED ? $license->note : null,
            'licenseExpiresAt' => $license?->expires_at?->toDateString(),
            'ahipStatus' => $ahip?->status,
            'ahipNote' => $ahip?->status === AhipCertification::STATUS_REJECTED ? $ahip->note : null,
            'ahipExpiresAt' => $ahip?->expires_at?->toDateString(),
            'contracting' => $ahip?->status === AhipCertification::STATUS_VERIFIED ? [
                'confirmed' => $attestation?->contracting_confirmed_at !== null,
                'forwarded' => $attestation?->contracting_forwarded_at !== null,
                'issued' => $attestation?->contracting_issued_at !== null,
                'carrier_certs' => $attestation?->contracting_carrier_certs_at !== null,
                'complete' => $attestation?->contracting_complete_at !== null,
            ] : null,
        ];
    }
}
