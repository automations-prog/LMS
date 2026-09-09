<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\EligibilityAttestation;
use App\Models\User;
use App\Notifications\EligibilityDecisionNotification;
use App\Support\ContractingStages;
use App\Support\LinesOfAuthority;
use App\Support\ProctoringTypes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
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

        $previousStatus = $eligibilityAttestation->status;

        $eligibilityAttestation->update([
            'status' => $validated['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        AuditLog::record($eligibilityAttestation, $request->user(), 'eligibility.decision', $previousStatus, $validated['status']);

        // Only cleared/not_eligible are decisions worth emailing the agent
        // about — reopening a case for further review isn't an outcome yet.
        if (! in_array($validated['status'], EligibilityAttestation::UNDER_REVIEW_STATUSES, true)) {
            $eligibilityAttestation->user->notify(new EligibilityDecisionNotification($validated['status']));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Decision recorded.')]);

        return back();
    }

    /**
     * Record the same decision on a batch of agents' attestations at once.
     * Agents who never submitted an attestation, or whose attestation is
     * already at the target status, are silently skipped rather than
     * failing the whole batch.
     */
    public function bulkDecision(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('onboarding.review'), 403);

        $validated = $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer'],
            'status' => ['required', Rule::in([
                EligibilityAttestation::STATUS_PENDING,
                EligibilityAttestation::STATUS_CLEARED,
                EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER,
                EligibilityAttestation::STATUS_NOT_ELIGIBLE,
            ])],
        ]);

        $updated = 0;

        $users = User::whereIn('id', $validated['user_ids'])
            ->with('eligibilityAttestation')
            ->get();

        foreach ($users as $user) {
            $attestation = $user->eligibilityAttestation;

            if (! $attestation || $attestation->status === $validated['status']) {
                continue;
            }

            $previousStatus = $attestation->status;

            $attestation->update([
                'status' => $validated['status'],
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            AuditLog::record($attestation, $request->user(), 'eligibility.decision', $previousStatus, $validated['status']);

            if (! in_array($validated['status'], EligibilityAttestation::UNDER_REVIEW_STATUSES, true)) {
                $user->notify(new EligibilityDecisionNotification($validated['status']));
            }

            $updated++;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => trans_choice(':count attestation updated.|:count attestations updated.', $updated, ['count' => $updated]),
        ]);

        return back();
    }

    /**
     * Set or correct the agent's selected line of authority. Independent
     * of the eligibility decision — an admin can adjust this at any time.
     */
    public function updateLineOfAuthority(Request $request, EligibilityAttestation $eligibilityAttestation): RedirectResponse
    {
        Gate::authorize('review', $eligibilityAttestation);

        $validated = $request->validate([
            'line_of_authority' => ['required', Rule::in(LinesOfAuthority::ALL)],
        ]);

        $eligibilityAttestation->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Line of authority updated.')]);

        return back();
    }

    /**
     * Set or correct the agent's chosen proctoring type. Independent of the
     * eligibility decision — an admin can adjust this at any time.
     */
    public function updateExamSchedule(Request $request, EligibilityAttestation $eligibilityAttestation): RedirectResponse
    {
        Gate::authorize('review', $eligibilityAttestation);

        $validated = $request->validate([
            'proctoring_type' => ['required', Rule::in(ProctoringTypes::ALL)],
        ]);

        $eligibilityAttestation->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Exam schedule updated.')]);

        return back();
    }

    /**
     * Check or uncheck the agent's carrier contracting & sales training
     * stages. Purely admin-driven — the agent has no action to take here.
     *
     * Stages must be checked in order per `ContractingStages::DEPENDENCIES`
     * (confirmed -> forwarded -> issued -> complete); `carrier_certs` is an
     * optional side branch that only requires `forwarded` and isn't itself
     * required for `complete`. Each stage present in the submitted list gets
     * stamped with `now()` the first time it's checked (re-saving an
     * already-checked stage leaves its original timestamp untouched);
     * anything absent from the list is cleared back to null.
     */
    /**
     * Advance a batch of agents' contracting to (at least) the given stage
     * at once. Additive only — an agent already further along than the
     * target stage, or missing an attestation entirely, is left untouched
     * rather than rewound or failing the batch. Every stage in the target's
     * prerequisite chain (per ContractingStages::DEPENDENCIES) is stamped
     * too, so "advance to issued" also confirms and forwards agents who
     * hadn't been marked at those earlier stages yet.
     */
    public function bulkUpdateContractingStages(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('onboarding.review'), 403);

        $validated = $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer'],
            'stage' => ['required', Rule::in(ContractingStages::ALL)],
        ]);

        $chain = [$validated['stage']];
        $cursor = $validated['stage'];

        while (isset(ContractingStages::DEPENDENCIES[$cursor])) {
            $cursor = ContractingStages::DEPENDENCIES[$cursor];
            $chain[] = $cursor;
        }

        $attestations = EligibilityAttestation::query()
            ->whereIn('user_id', $validated['user_ids'])
            ->get();

        $updated = 0;

        foreach ($attestations as $attestation) {
            $updates = [];

            foreach ($chain as $stage) {
                $column = ContractingStages::column($stage);

                if ($attestation->{$column} === null) {
                    $updates[$column] = now();
                }
            }

            if ($updates === []) {
                continue;
            }

            $attestation->update($updates);
            $updated++;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => trans_choice(':count agent advanced.|:count agents advanced.', $updated, ['count' => $updated]),
        ]);

        return back();
    }

    public function updateContractingStages(Request $request, EligibilityAttestation $eligibilityAttestation): RedirectResponse
    {
        Gate::authorize('review', $eligibilityAttestation);

        $validated = $request->validate([
            'contracting_stages' => ['sometimes', 'array'],
            'contracting_stages.*' => [Rule::in(ContractingStages::ALL)],
        ]);

        $checked = $validated['contracting_stages'] ?? [];

        foreach (ContractingStages::DEPENDENCIES as $stage => $prerequisite) {
            if (in_array($stage, $checked, true) && ! in_array($prerequisite, $checked, true)) {
                throw ValidationException::withMessages([
                    'contracting_stages' => "\"{$stage}\" can't be checked before \"{$prerequisite}\".",
                ]);
            }
        }

        $updates = [];

        foreach (ContractingStages::ALL as $stage) {
            $column = ContractingStages::column($stage);

            if (in_array($stage, $checked, true)) {
                $updates[$column] = $eligibilityAttestation->{$column} ?? now();
            } else {
                $updates[$column] = null;
            }
        }

        $eligibilityAttestation->update($updates);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Contracting stages updated.')]);

        return back();
    }
}
