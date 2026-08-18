<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTrainingCompletionRequest;
use App\Models\TrainingCompletion;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TrainingController extends Controller
{
    /**
     * Store (or resubmit, after a rejection) the agent's training
     * completion certificate.
     */
    public function store(StoreTrainingCompletionRequest $request): RedirectResponse
    {
        $user = $request->user();
        $existing = $user->trainingCompletion;

        if ($existing?->certificate_path) {
            Storage::disk('local')->delete($existing->certificate_path);
        }

        $path = $request->file('certificate_file')->store('training-certificates', 'local');

        TrainingCompletion::updateOrCreate(
            ['user_id' => $user->id],
            [
                'certificate_path' => $path,
                'status' => TrainingCompletion::STATUS_PENDING_REVIEW,
                'note' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Certificate submitted.')]);

        return redirect()->route('dashboard');
    }
}
