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
use Symfony\Component\HttpFoundation\StreamedResponse;

class EligibilityReviewController extends Controller
{
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
     * Record (or change) a coach/admin decision on an attestation. A
     * reviewer has free rein to set a case to any of the four statuses at
     * any time, including moving a decided case back to `pending` or
     * `flagged_for_waiver` to reopen it for review.
     */
    public function decision(Request $request, EligibilityAttestation $eligibilityAttestation): RedirectResponse
    {
        Gate::authorize('review', $eligibilityAttestation);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                EligibilityAttestation::STATUS_PENDING,
                EligibilityAttestation::STATUS_CLEARED,
                EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER,
                EligibilityAttestation::STATUS_NOT_ELIGIBLE,
            ])],
        ]);

        // No-op if the decision doesn't actually change anything — avoids
        // re-stamping reviewed_by/reviewed_at and re-notifying the agent for
        // a click that didn't alter the outcome.
        if ($eligibilityAttestation->status === $validated['status']) {
            return back();
        }

        $eligibilityAttestation->update([
            'status' => $validated['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Only cleared/not_eligible are decisions worth emailing the agent
        // about — reopening a case for further review isn't an outcome yet.
        if (! in_array($validated['status'], EligibilityAttestation::UNDER_REVIEW_STATUSES, true)) {
            $eligibilityAttestation->user->notify(new EligibilityDecisionNotification($validated['status']));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Decision recorded.')]);

        return back();
    }
}
