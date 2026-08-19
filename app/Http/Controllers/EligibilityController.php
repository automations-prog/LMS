<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEligibilityAttestationRequest;
use App\Models\EligibilityAttestation;
use App\Models\TrainingCompletion;
use App\Support\LinesOfAuthority;
use App\Support\ProctoringTypes;
use App\Support\UsStates;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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

        $validated = $request->validate([
            'line_of_authority' => ['required', Rule::in(LinesOfAuthority::ALL)],
        ]);

        $attestation->update([
            'enrollment_completed_at' => now(),
            'line_of_authority' => $validated['line_of_authority'],
        ]);

        return redirect()->route('dashboard');
    }

    /**
     * Record that the agent has scheduled their state exam. Only meaningful
     * — and only allowed — once their XCEL training certificate has been
     * verified.
     */
    public function scheduleExam(Request $request): RedirectResponse
    {
        $training = $request->user()->trainingCompletion;

        abort_unless($training?->status === TrainingCompletion::STATUS_VERIFIED, 403);

        $validated = $request->validate([
            'proctoring_type' => ['required', Rule::in(ProctoringTypes::ALL)],
        ]);

        $request->user()->eligibilityAttestation->update([
            'exam_scheduled_at' => now(),
            'proctoring_type' => $validated['proctoring_type'],
        ]);

        return redirect()->route('dashboard');
    }
}
