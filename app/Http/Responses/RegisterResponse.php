<?php

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fortify's RegisteredUserController logs the new user in immediately
 * after CreateNewUser::create() runs, before this response ever gets
 * control. A self-registered account lands inactive (pending admin
 * approval — see CreateNewUser), so that auto-login has to be undone here:
 * otherwise the agent would be signed in for one request and then bounced
 * straight back out by EnsureAccountIsActive on the very next one, with a
 * confusing "suspended" message right after they just signed up.
 */
class RegisterResponse implements RegisterResponseContract
{
    public function toResponse($request): JsonResponse|Response
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $status = __("Thanks for signing up! Your account is waiting on an admin's approval — we'll let you know once you're in.");

        return $request->wantsJson()
            ? new JsonResponse(['status' => $status], 201)
            : redirect()->route('login')->with('status', $status);
    }
}
