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

        $agents = User::query()
            ->role('agent')
            ->with(['eligibilityAttestation', 'trainingCompletion'])
            ->when($search !== '', fn ($query) => $query->where(
                fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"),
            ))
            ->when($eligibilityStatus !== '', fn ($query) => $query
                ->whereHas('eligibilityAttestation', fn ($query) => $query->where('status', $eligibilityStatus)))
            ->when($trainingStatus !== '', fn ($query) => $query
                ->whereHas('trainingCompletion', fn ($query) => $query->where('status', $trainingStatus)))
            ->orderBy('name')
            ->paginate(25)
            ->appends([
                'search' => $search,
                'eligibility_status' => $eligibilityStatus,
                'training_status' => $trainingStatus,
            ]);

        return Inertia::render('admin/onboarding/index', [
            'agents' => $agents,
            'filters' => [
                'search' => $search,
                'eligibility_status' => $eligibilityStatus,
                'training_status' => $trainingStatus,
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

        $user->load(['eligibilityAttestation.reviewer', 'trainingCompletion.reviewer']);

        return Inertia::render('admin/onboarding/show', [
            'agent' => $user,
        ]);
    }
}
