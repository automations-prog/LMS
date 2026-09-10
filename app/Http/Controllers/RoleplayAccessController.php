<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleplayAccessController extends Controller
{
    /**
     * List agents with their roleplay access state and a quick read on
     * their session history, for admins to grant access and coach from.
     */
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('roleplay.manage'), 403);

        $search = $request->string('search')->trim()->toString();

        $agents = User::query()
            ->role('agent')
            ->withCount('roleplaySessions')
            ->withMax('roleplaySessions', 'overall_score')
            ->when($search !== '', fn ($query) => $query->where(
                fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"),
            ))
            ->orderBy('name')
            ->paginate(25)
            ->appends(['search' => $search]);

        return Inertia::render('admin/roleplay/index', [
            'agents' => $agents,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Grant the given agent access to the roleplay feature.
     */
    public function grant(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->can('roleplay.manage'), 403);

        $user->update([
            'roleplay_enabled_at' => now(),
            'roleplay_enabled_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __(':name now has roleplay access.', ['name' => $user->name]),
        ]);

        return back();
    }

    /**
     * Revoke the given agent's access to the roleplay feature.
     */
    public function revoke(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()->can('roleplay.manage'), 403);

        $user->update([
            'roleplay_enabled_at' => null,
            'roleplay_enabled_by' => null,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Roleplay access revoked for :name.', ['name' => $user->name]),
        ]);

        return back();
    }
}
