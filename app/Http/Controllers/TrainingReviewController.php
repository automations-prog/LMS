<?php

namespace App\Http\Controllers;

use App\Models\TrainingCompletion;
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

        $trainingCompletion->update([
            'status' => $validated['status'],
            'note' => $validated['note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Only verified/rejected are decisions worth emailing the agent
        // about — reopening a case for further review isn't an outcome yet.
        if ($validated['status'] !== TrainingCompletion::STATUS_PENDING_REVIEW) {
            $trainingCompletion->user->notify(new TrainingDecisionNotification($validated['status'], $validated['note'] ?? null));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Decision recorded.')]);

        return back();
    }
}
