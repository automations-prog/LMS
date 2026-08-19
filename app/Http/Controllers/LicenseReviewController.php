<?php

namespace App\Http\Controllers;

use App\Models\LicenseSubmission;
use App\Models\User;
use App\Notifications\LicenseDecisionNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LicenseReviewController extends Controller
{
    /**
     * Stream the uploaded license copy.
     */
    public function document(LicenseSubmission $licenseSubmission): StreamedResponse
    {
        Gate::authorize('view', $licenseSubmission);

        return Storage::disk('local')->response($licenseSubmission->license_path);
    }

    /**
     * Record (or change) a coach/admin decision on a license submission.
     */
    public function decision(Request $request, LicenseSubmission $licenseSubmission): RedirectResponse
    {
        Gate::authorize('review', $licenseSubmission);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                LicenseSubmission::STATUS_PENDING_REVIEW,
                LicenseSubmission::STATUS_VERIFIED,
                LicenseSubmission::STATUS_REJECTED,
            ])],
            'note' => [Rule::requiredIf($request->input('status') === LicenseSubmission::STATUS_REJECTED), 'nullable', 'string', 'max:2000'],
        ]);

        // No-op if the decision doesn't actually change anything.
        if ($licenseSubmission->status === $validated['status']) {
            return back();
        }

        $licenseSubmission->update([
            'status' => $validated['status'],
            'note' => $validated['note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Only verified/rejected are decisions worth emailing the agent
        // about — reopening a case for further review isn't an outcome yet.
        if ($validated['status'] !== LicenseSubmission::STATUS_PENDING_REVIEW) {
            $licenseSubmission->user->notify(new LicenseDecisionNotification($validated['status'], $validated['note'] ?? null));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Decision recorded.')]);

        return back();
    }

    /**
     * Record the same decision (and, when rejecting, the same shared note)
     * on a batch of agents' license submissions at once. Agents who never
     * submitted a license copy, or whose submission is already at the
     * target status, are silently skipped rather than failing the whole
     * batch.
     */
    public function bulkDecision(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('onboarding.review'), 403);

        $validated = $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer'],
            'status' => ['required', Rule::in([
                LicenseSubmission::STATUS_PENDING_REVIEW,
                LicenseSubmission::STATUS_VERIFIED,
                LicenseSubmission::STATUS_REJECTED,
            ])],
            'note' => [Rule::requiredIf($request->input('status') === LicenseSubmission::STATUS_REJECTED), 'nullable', 'string', 'max:2000'],
        ]);

        $updated = 0;

        $users = User::whereIn('id', $validated['user_ids'])
            ->with('licenseSubmission')
            ->get();

        foreach ($users as $user) {
            $submission = $user->licenseSubmission;

            if (! $submission || $submission->status === $validated['status']) {
                continue;
            }

            $submission->update([
                'status' => $validated['status'],
                'note' => $validated['note'] ?? null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            if ($validated['status'] !== LicenseSubmission::STATUS_PENDING_REVIEW) {
                $user->notify(new LicenseDecisionNotification($validated['status'], $validated['note'] ?? null));
            }

            $updated++;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => trans_choice(':count license submission updated.|:count license submissions updated.', $updated, ['count' => $updated]),
        ]);

        return back();
    }
}
