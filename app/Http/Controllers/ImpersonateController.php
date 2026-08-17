<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class ImpersonateController extends Controller
{
    /**
     * Start impersonating the given user.
     */
    public function store(Request $request, User $user): RedirectResponse
    {
        abort_if($request->session()->has('impersonator_id'), 403, __('You are already impersonating a user.'));

        // Gate::before grants super-admins every ability, which would bypass
        // the policy's self-impersonation guard for them — enforce it here too.
        abort_if($request->user()->id === $user->id, 403, __('You cannot impersonate yourself.'));

        Gate::authorize('impersonate', $user);

        $request->session()->put('impersonator_id', $request->user()->id);

        Auth::login($user);

        $request->session()->regenerate();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('You are now impersonating :name.', ['name' => $user->name])]);

        return to_route('dashboard');
    }

    /**
     * Stop impersonating and return to the original account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $impersonatorId = $request->session()->pull('impersonator_id');

        abort_unless($impersonatorId, 403);

        Auth::loginUsingId($impersonatorId);

        $request->session()->regenerate();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('You have returned to your account.')]);

        return to_route('users.index');
    }
}
