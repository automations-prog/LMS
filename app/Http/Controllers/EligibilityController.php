<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEligibilityAttestationRequest;
use App\Models\EligibilityAttestation;
use App\Support\UsStates;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EligibilityController extends Controller
{
    /**
     * Show the eligibility self-attestation form.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        $attestation = $request->user()->eligibilityAttestation;

        if ($attestation) {
            return redirect(in_array($attestation->status, EligibilityAttestation::UNDER_REVIEW_STATUSES, true)
                ? route('eligibility.pending')
                : route('dashboard'));
        }

        return Inertia::render('onboarding/eligibility', [
            'states' => UsStates::ALL,
        ]);
    }

    /**
     * Store the submitted eligibility attestation.
     *
     * Every submission starts out `pending` regardless of the felony
     * answer — a coach/admin reviews and decides every case; the felony
     * disclosure is information for that review, not an auto-router.
     */
    public function store(StoreEligibilityAttestationRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        if ($request->hasFile('work_authorization_file')) {
            $validated['work_authorization_path'] = $request->file('work_authorization_file')
                ->store('eligibility-documents', 'local');
        }

        unset($validated['work_authorization_file']);

        $validated['user_id'] = $request->user()->id;
        $validated['status'] = EligibilityAttestation::STATUS_PENDING;

        EligibilityAttestation::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Eligibility attestation submitted.')]);

        return redirect()->route('eligibility.pending');
    }

    /**
     * Show the "your eligibility is under review" status page.
     */
    public function pending(Request $request): Response|RedirectResponse
    {
        $attestation = $request->user()->eligibilityAttestation;

        if (! $attestation || ! in_array($attestation->status, EligibilityAttestation::UNDER_REVIEW_STATUSES, true)) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('onboarding/pending-review');
    }

    /**
     * Dismiss the "how to enroll" card on the dashboard once the agent has
     * completed XCEL enrollment. Only meaningful — and only allowed — once
     * the agent is cleared; there's nothing to mark done otherwise.
     */
    public function completeEnrollment(Request $request): RedirectResponse
    {
        $attestation = $request->user()->eligibilityAttestation;

        abort_unless($attestation?->status === EligibilityAttestation::STATUS_CLEARED, 403);

        $attestation->update(['enrollment_completed_at' => now()]);

        return redirect()->route('dashboard');
    }
}
