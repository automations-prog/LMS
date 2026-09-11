<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user() ? [
                    ...$request->user()->toArray(),
                    'roles' => $request->user()->getRoleNames(),
                    'permissions' => $request->user()->getAllPermissions()->pluck('name'),
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'impersonating' => $request->session()->has('impersonator_id'),
            // Only meaningful for agents — the sidebar uses this to hide
            // "My Onboarding" and "Sales Roleplay" until eligibility has
            // been decided (not just submitted — still under review hides
            // them too). Skip the query entirely for anyone else
            // (admins/super-admins never have an eligibility attestation).
            'eligibilityStatus' => $request->user()?->hasRole('agent')
                ? $request->user()->eligibilityDisplayStatus()
                : null,
            'notifications' => $request->user() ? [
                'unreadCount' => $request->user()->unreadNotifications()->count(),
                'recent' => $request->user()->notifications()->latest()->limit(10)->get(),
            ] : null,
        ];
    }
}
