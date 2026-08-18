<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEligibilityAttestationRequest;
use App\Models\EligibilityAttestation;
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
            return redirect($attestation->status === EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER
                ? route('eligibility.pending')
                : route('dashboard'));
        }

        return Inertia::render('onboarding/eligibility');
    }

    /**
     * Store the submitted eligibility attestation.
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
        $validated['status'] = $validated['has_felony_conviction']
            ? EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER
            : EligibilityAttestation::STATUS_CLEARED;

        $attestation = EligibilityAttestation::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Eligibility attestation submitted.')]);

        return redirect($attestation->status === EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER
            ? route('eligibility.pending')
            : route('dashboard'));
    }

    /**
     * Show the "your eligibility is under review" status page.
     */
    public function pending(Request $request): Response|RedirectResponse
    {
        $attestation = $request->user()->eligibilityAttestation;

        if (! $attestation || $attestation->status !== EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('onboarding/pending-review');
    }
}
