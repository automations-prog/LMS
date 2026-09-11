<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLicenseSubmissionRequest;
use App\Models\LicenseSubmission;
use App\Models\User;
use App\Notifications\NewSubmissionForReviewNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class LicenseController extends Controller
{
    /**
     * Store (or resubmit, after a rejection) the agent's copy of their
     * issued license.
     */
    public function store(StoreLicenseSubmissionRequest $request): RedirectResponse
    {
        $user = $request->user();
        $existing = $user->licenseSubmission;

        if ($existing?->license_path) {
            Storage::disk('local')->delete($existing->license_path);
        }

        $path = $request->file('license_file')->store('license-documents', 'local');

        LicenseSubmission::updateOrCreate(
            ['user_id' => $user->id],
            [
                'license_path' => $path,
                'status' => LicenseSubmission::STATUS_PENDING_REVIEW,
                'note' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
            ],
        );

        Notification::send(User::onboardingReviewers(), new NewSubmissionForReviewNotification($user, 'license copy'));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('License copy submitted.')]);

        return redirect()->route('onboarding.journey');
    }
}
