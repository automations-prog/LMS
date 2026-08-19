<?php

namespace App\Http\Controllers;

use App\Models\AhipCertification;
use App\Notifications\AhipCertificationDecisionNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AhipCertificationReviewController extends Controller
{
    /**
     * Stream the uploaded AHIP completion certificate.
     */
    public function document(AhipCertification $ahipCertification): StreamedResponse
    {
        Gate::authorize('view', $ahipCertification);

        return Storage::disk('local')->response($ahipCertification->certificate_path);
    }

    /**
     * Record (or change) a coach/admin decision on an AHIP certification.
     */
    public function decision(Request $request, AhipCertification $ahipCertification): RedirectResponse
    {
        Gate::authorize('review', $ahipCertification);

        $validated = $request->validate([
            'status' => ['required', Rule::in([
                AhipCertification::STATUS_PENDING_REVIEW,
                AhipCertification::STATUS_VERIFIED,
                AhipCertification::STATUS_REJECTED,
            ])],
            'note' => [Rule::requiredIf($request->input('status') === AhipCertification::STATUS_REJECTED), 'nullable', 'string', 'max:2000'],
        ]);

        // No-op if the decision doesn't actually change anything.
        if ($ahipCertification->status === $validated['status']) {
            return back();
        }

        $ahipCertification->update([
            'status' => $validated['status'],
            'note' => $validated['note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Only verified/rejected are decisions worth emailing the agent
        // about — reopening a case for further review isn't an outcome yet.
        if ($validated['status'] !== AhipCertification::STATUS_PENDING_REVIEW) {
            $ahipCertification->user->notify(new AhipCertificationDecisionNotification($validated['status'], $validated['note'] ?? null));
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Decision recorded.')]);

        return back();
    }
}
