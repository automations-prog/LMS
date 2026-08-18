<?php

namespace App\Http\Controllers;

use App\Models\EligibilityAttestation;
use App\Notifications\EligibilityDecisionNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EligibilityReviewController extends Controller
{
    /**
     * List eligibility attestations for coach/admin review.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', EligibilityAttestation::class);

        $status = $request->string('status')->trim()->toString();

        $attestations = EligibilityAttestation::query()
            ->with('user')
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->when($status === '', fn ($query) => $query->where('status', EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER))
            ->orderByDesc('created_at')
            ->paginate(25)
            ->appends(['status' => $status]);

        return Inertia::render('admin/eligibility/index', [
            'attestations' => $attestations,
            'filters' => ['status' => $status],
        ]);
    }

    /**
     * Show a single attestation's details for review.
     */
    public function show(EligibilityAttestation $eligibilityAttestation): Response
    {
        Gate::authorize('view', $eligibilityAttestation);

        $eligibilityAttestation->load(['user', 'reviewer']);

        return Inertia::render('admin/eligibility/show', [
            'attestation' => $eligibilityAttestation,
        ]);
    }

    /**
     * Stream the uploaded work-authorization document.
     */
    public function document(EligibilityAttestation $eligibilityAttestation): StreamedResponse
    {
        Gate::authorize('view', $eligibilityAttestation);

        abort_if(! $eligibilityAttestation->work_authorization_path, 404);

        return Storage::disk('local')->response($eligibilityAttestation->work_authorization_path);
    }

    /**
     * Record a coach/admin decision on a flagged attestation.
     */
    public function decision(Request $request, EligibilityAttestation $eligibilityAttestation): RedirectResponse
    {
        Gate::authorize('review', $eligibilityAttestation);

        abort_unless($eligibilityAttestation->status === EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER, 409);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                EligibilityAttestation::STATUS_CLEARED,
                EligibilityAttestation::STATUS_NOT_ELIGIBLE,
            ])],
        ]);

        $eligibilityAttestation->update([
            'status' => $validated['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        $eligibilityAttestation->user->notify(new EligibilityDecisionNotification($validated['status']));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Decision recorded.')]);

        return back();
    }
}
