<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\FeatureAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class FeatureAccessController extends Controller
{
    /**
     * The per-agent-segment feature toggle grid — every agent type
     * (User::AGENT_TYPES) x every togglable feature (config('features')).
     */
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('features.manage'), 403);

        return Inertia::render('admin/features/index', [
            'toggles' => FeatureAccess::grid(),
        ]);
    }

    /**
     * Turn one feature on/off for one agent segment.
     */
    public function update(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('features.manage'), 403);

        $validated = $request->validate([
            'agent_type' => ['required', Rule::in(array_keys(User::AGENT_TYPES))],
            'feature' => ['required', Rule::in(array_keys(config('features')))],
            'enabled' => ['required', 'boolean'],
        ]);

        FeatureAccess::setEnabled(
            $validated['agent_type'],
            $validated['feature'],
            $validated['enabled'],
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Feature access updated.')]);

        return back();
    }
}
