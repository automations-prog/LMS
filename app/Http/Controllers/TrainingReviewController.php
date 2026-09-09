<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\TrainingCompletion;
use App\Models\User;
use App\Notifications\TrainingDecisionNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TrainingReviewController extends Controller
{
    /**
     * Stream the uploaded training certificate.
     */
    public function document(TrainingCompletion $trainingCompletion): StreamedResponse
    {
        Gate::authorize('view', $trainingCompletion);

        return Storage::disk('local')->response($trainingCompletion->certificate_path);
    }

    /**
     * Record (or change) a coach/admin decision on a training completion.
     */
    public function decision(Request $request, TrainingCompletion $trainingCompletion): RedirectResponse
    {
        Gate::authorize('review', $trainingCompletion);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                TrainingCompletion::STATUS_PENDING_REVIEW,
                TrainingCompletion::STATUS_VERIFIED,
                TrainingCompletion::STATUS_REJECTED,
            ])],
            'note' => [Rule::requiredIf($request->input('status') === TrainingCompletion::STATUS_REJECTED), 'nullable', 'string', 'max:2000'],
        ]);

        // No-op if the decision doesn't actually change anything.
        if ($trainingCompletion->status === $validated['status']) {
            return back();
        }

        $previousStatus = $trainingCompletion->status;

        $trainingCompletion->update([
            'status' => $validated['status'],
            'note' => $validated['note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        AuditLog::record($trainingCompletion, $request->user(), 'training.decision', $previousStatus, $validated['status'], $validated['note'] ?? null);

        // Only verified/rejected are decisions worth emailing the agent
        // about — reopening a case for further review isn't an outcome yet.
        if ($validated['status'] !== TrainingCompletion::STATUS_PENDING_REVIEW) {
            $trainingCompletion->user->notify(new TrainingDecisionNotification($validated['status'], $validated['note'] ?? null));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Decision recorded.')]);

        return back();
    }

    /**
     * Record the same decision (and, when rejecting, the same shared note)
     * on a batch of agents' training completions at once. Agents who never
     * submitted a completion, or whose completion is already at the target
     * status, are silently skipped rather than failing the whole batch.
     */
    public function bulkDecision(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('onboarding.review'), 403);

        $validated = $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer'],
            'status' => ['required', Rule::in([
                TrainingCompletion::STATUS_PENDING_REVIEW,
                TrainingCompletion::STATUS_VERIFIED,
                TrainingCompletion::STATUS_REJECTED,
            ])],
            'note' => [Rule::requiredIf($request->input('status') === TrainingCompletion::STATUS_REJECTED), 'nullable', 'string', 'max:2000'],
        ]);

        $updated = 0;

        $users = User::whereIn('id', $validated['user_ids'])
            ->with('trainingCompletion')
            ->get();

        foreach ($users as $user) {
            $completion = $user->trainingCompletion;

            if (! $completion || $completion->status === $validated['status']) {
                continue;
            }

            $previousStatus = $completion->status;

            $completion->update([
                'status' => $validated['status'],
                'note' => $validated['note'] ?? null,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);

            AuditLog::record($completion, $request->user(), 'training.decision', $previousStatus, $validated['status'], $validated['note'] ?? null);

            if ($validated['status'] !== TrainingCompletion::STATUS_PENDING_REVIEW) {
                $user->notify(new TrainingDecisionNotification($validated['status'], $validated['note'] ?? null));
            }

            $updated++;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => trans_choice(':count training completion updated.|:count training completions updated.', $updated, ['count' => $updated]),
        ]);

        return back();
    }
}
