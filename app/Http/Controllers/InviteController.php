<?php

namespace App\Http\Controllers;

use App\Http\Requests\SetInvitePasswordRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class InviteController extends Controller
{
    /**
     * Show the "set your password" form for an invited user.
     */
    public function show(Request $request, User $user): Response
    {
        return Inertia::render('auth/set-password', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            // expires/signature — round-tripped as hidden fields so the
            // subsequent POST carries the same signed query string.
            'query' => $request->query(),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    /**
     * Set the invited user's password and activate their account.
     */
    public function store(SetInvitePasswordRequest $request, User $user): RedirectResponse
    {
        $user->forceFill([
            'password' => $request->validated('password'),
            'is_active' => true,
            'email_verified_at' => now(),
        ])->save();

        Auth::login($user);

        $request->session()->regenerate();

        return redirect()->route($user->hasRole('agent') ? 'eligibility.create' : 'dashboard');
    }
}
