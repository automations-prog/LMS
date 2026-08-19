<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAhipCertificationRequest;
use App\Models\AhipCertification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AhipCertificationController extends Controller
{
    /**
     * Store (or resubmit, after a rejection) the agent's AHIP/FWA
     * certification completion certificate.
     */
    public function store(StoreAhipCertificationRequest $request): RedirectResponse
    {
        $user = $request->user();
        $existing = $user->ahipCertification;

        if ($existing?->certificate_path) {
            Storage::disk('local')->delete($existing->certificate_path);
        }

        $path = $request->file('certificate_file')->store('ahip-certificates', 'local');

        AhipCertification::updateOrCreate(
            ['user_id' => $user->id],
            [
                'certificate_path' => $path,
                'status' => AhipCertification::STATUS_PENDING_REVIEW,
                'note' => null,
                'reviewed_by' => null,
                'reviewed_at' => null,
            ],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Certificate submitted.')]);

        return redirect()->route('dashboard');
    }
}
