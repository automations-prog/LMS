<?php

namespace App\Http\Controllers;

use App\Models\AhipCertification;
use App\Models\EligibilityAttestation;
use App\Models\LicenseSubmission;
use App\Models\TrainingCompletion;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VerifiedAgentController extends Controller
{
    /**
     * List agents who have fully cleared onboarding, licensing, and
     * contracting — i.e. every review stage is verified and contracting
     * is complete.
     */
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('agents.view'), 403);

        $search = $request->string('search')->trim()->toString();

        $agents = User::query()
            ->role('agent')
            ->with([
                'eligibilityAttestation.reviewer',
                'trainingCompletion.reviewer',
                'licenseSubmission.reviewer',
                'ahipCertification.reviewer',
            ])
            ->whereHas('eligibilityAttestation', fn ($query) => $query
                ->where('status', EligibilityAttestation::STATUS_CLEARED)
                ->whereNotNull('contracting_complete_at'))
            ->whereHas('trainingCompletion', fn ($query) => $query
                ->where('status', TrainingCompletion::STATUS_VERIFIED))
            ->whereHas('licenseSubmission', fn ($query) => $query
                ->where('status', LicenseSubmission::STATUS_VERIFIED))
            ->whereHas('ahipCertification', fn ($query) => $query
                ->where('status', AhipCertification::STATUS_VERIFIED))
            ->when($search !== '', fn ($query) => $query->where(
                fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"),
            ))
            ->orderByDesc(
                EligibilityAttestation::query()
                    ->select('contracting_complete_at')
                    ->whereColumn('user_id', 'users.id'),
            )
            ->paginate(25)
            ->appends([
                'search' => $search,
            ]);

        return Inertia::render('admin/agents/index', [
            'agents' => $agents,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }
}
