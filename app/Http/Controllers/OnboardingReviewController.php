<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingReviewController extends Controller
{
    /**
     * List agents with their combined eligibility + training status for
     * coach/admin review.
     */
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('onboarding.review'), 403);

        $search = $request->string('search')->trim()->toString();
        $eligibilityStatus = $request->string('eligibility_status')->trim()->toString();
        $trainingStatus = $request->string('training_status')->trim()->toString();
        $licenseStatus = $request->string('license_status')->trim()->toString();
        $ahipStatus = $request->string('ahip_status')->trim()->toString();

        $agents = User::query()
            ->role('agent')
            // A Pitch Health agent isn't reviewable until they're linked to
            // an XCEL record (LinkPitchHealthUsersToXcelJob) — every other
            // source shows regardless.
            ->where(fn ($query) => $query
                ->where('source', '!=', User::SOURCE_PITCH_HEALTH)
                ->orWhereNull('source')
                ->orWhereNotNull('excel_id'))
            ->with([
                'eligibilityAttestation.reviewer',
                'trainingCompletion.reviewer',
                'licenseSubmission.reviewer',
                'ahipCertification.reviewer',
            ])
            ->when($search !== '', fn ($query) => $query->where(
                fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"),
            ))
            ->when($eligibilityStatus !== '', fn ($query) => $query
                ->whereHas('eligibilityAttestation', fn ($query) => $query->where('status', $eligibilityStatus)))
            ->when($trainingStatus !== '', fn ($query) => $query
                ->whereHas('trainingCompletion', fn ($query) => $query->where('status', $trainingStatus)))
            ->when($licenseStatus !== '', fn ($query) => $query
                ->whereHas('licenseSubmission', fn ($query) => $query->where('status', $licenseStatus)))
            ->when($ahipStatus !== '', fn ($query) => $query
                ->whereHas('ahipCertification', fn ($query) => $query->where('status', $ahipStatus)))
            ->orderByDesc('created_at')
            ->paginate(25)
            ->appends([
                'search' => $search,
                'eligibility_status' => $eligibilityStatus,
                'training_status' => $trainingStatus,
                'license_status' => $licenseStatus,
                'ahip_status' => $ahipStatus,
            ]);

        return Inertia::render('admin/onboarding/index', [
            'agents' => $agents,
            'filters' => [
                'search' => $search,
                'eligibility_status' => $eligibilityStatus,
                'training_status' => $trainingStatus,
                'license_status' => $licenseStatus,
                'ahip_status' => $ahipStatus,
            ],
        ]);
    }

    /**
     * Show a single agent's combined eligibility + training details for
     * review.
     */
    public function show(Request $request, User $user): Response
    {
        abort_unless($request->user()->can('onboarding.review'), 403);
        abort_unless($user->hasRole('agent'), 404);
        // Same visibility rule as the index: an unlinked Pitch Health agent
        // isn't reviewable yet, even via a direct link.
        abort_if($user->source === User::SOURCE_PITCH_HEALTH && ! $user->excel_id, 404);

        $user->load([
            'eligibilityAttestation.reviewer',
            'eligibilityAttestation.auditLogs.actor',
            'trainingCompletion.reviewer',
            'trainingCompletion.auditLogs.actor',
            'licenseSubmission.reviewer',
            'licenseSubmission.auditLogs.actor',
            'ahipCertification.reviewer',
            'ahipCertification.auditLogs.actor',
        ]);

        $auditLog = collect([
            $user->eligibilityAttestation?->auditLogs,
            $user->trainingCompletion?->auditLogs,
            $user->licenseSubmission?->auditLogs,
            $user->ahipCertification?->auditLogs,
        ])
            ->filter()
            ->flatten()
            ->sortByDesc('id')
            ->values();

        return Inertia::render('admin/onboarding/show', [
            'agent' => $user,
            'auditLog' => $auditLog,
        ]);
    }
}
