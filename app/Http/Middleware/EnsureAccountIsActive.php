<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    /**
     * Force-logout a user whose account was suspended while their session
     * was still active — the login-time check alone would only stop new
     * logins, not accounts suspended mid-session.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Strictly `=== false`, not `! $user->is_active` — a User instance that
        // never loaded/selected the column (e.g. one set directly on the guard
        // rather than freshly queried) would otherwise be misread as suspended.
        if ($user && $user->is_active === false) {
            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('status', __('Your account has been suspended.'));
        }

        return $next($request);
    }
}
