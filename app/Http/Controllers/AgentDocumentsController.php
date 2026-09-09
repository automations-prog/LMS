<?php

namespace App\Http\Controllers;

use App\Models\AhipCertification;
use App\Models\LicenseSubmission;
use App\Models\TrainingCompletion;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AgentDocumentsController extends Controller
{
    /**
     * A single page for an agent to see every document they've submitted —
     * training certificate, license copy, AHIP certification — with its
     * current status, reviewer note, and a link to view the file, instead
     * of that status being spread across separate dashboard sections.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $attestation = $user->eligibilityAttestation;
        $training = $user->trainingCompletion;
        $license = $user->licenseSubmission;
        $ahip = $user->ahipCertification;

        return Inertia::render('documents/index', [
            'documents' => [
                'eligibility' => $attestation ? [
                    'status' => $attestation->status,
                    'submitted_at' => $attestation->created_at,
                    'reviewed_at' => $attestation->reviewed_at,
                    'note' => null,
                    'expires_at' => null,
                    'document_url' => $attestation->work_authorization_path
                        ? route('eligibility.document', $attestation)
                        : null,
                ] : null,
                'training' => $training ? [
                    'status' => $training->status,
                    'submitted_at' => $training->created_at,
                    'reviewed_at' => $training->reviewed_at,
                    'note' => $training->status === TrainingCompletion::STATUS_REJECTED ? $training->note : null,
                    'expires_at' => null,
                    'document_url' => route('training.document', $training),
                ] : null,
                'license' => $license ? [
                    'status' => $license->status,
                    'submitted_at' => $license->created_at,
                    'reviewed_at' => $license->reviewed_at,
                    'note' => $license->status === LicenseSubmission::STATUS_REJECTED ? $license->note : null,
                    'expires_at' => $license->expires_at?->toDateString(),
                    'document_url' => route('license.document', $license),
                ] : null,
                'ahip' => $ahip ? [
                    'status' => $ahip->status,
                    'submitted_at' => $ahip->created_at,
                    'reviewed_at' => $ahip->reviewed_at,
                    'note' => $ahip->status === AhipCertification::STATUS_REJECTED ? $ahip->note : null,
                    'expires_at' => $ahip->expires_at?->toDateString(),
                    'document_url' => route('ahip-certification.document', $ahip),
                ] : null,
            ],
        ]);
    }
}
