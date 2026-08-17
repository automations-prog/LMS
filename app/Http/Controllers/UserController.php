<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display the user management list.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $users = User::with('roles')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('users/index', [
            'users' => $users,
            'assignableRoles' => UserPolicy::assignableRoles($request->user()),
        ]);
    }

    /**
     * Show the form for creating a new user.
     */
    public function create(Request $request): Response
    {
        Gate::authorize('create', User::class);

        return Inertia::render('users/create', [
            'assignableRoles' => UserPolicy::assignableRoles($request->user()),
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'email_verified_at' => now(),
        ]);

        $user->syncRoles([$validated['role']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User created.')]);

        return to_route('users.index');
    }

    /**
     * Show the form for editing the given user.
     */
    public function edit(Request $request, User $user): Response
    {
        Gate::authorize('update', $user);

        return Inertia::render('users/edit', [
            'user' => $user->load('roles'),
            'assignableRoles' => UserPolicy::assignableRoles($request->user()),
        ]);
    }

    /**
     * Update the given user.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
        ]);

        if (! empty($validated['password'])) {
            $user->password = $validated['password'];
        }

        $user->save();

        $user->syncRoles([$validated['role']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User updated.')]);

        return to_route('users.index');
    }

    /**
     * Remove the given user.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('delete', $user);

        if ($user->hasRole('super-admin') && User::role('super-admin')->count() <= 1) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('You cannot delete the last super admin.')]);

            return to_route('users.index');
        }

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User deleted.')]);

        return to_route('users.index');
    }
}
