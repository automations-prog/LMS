<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Notifications\AgentInviteNotification;
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

        $perPage = $this->perPage($request);

        $search = $request->string('search')->trim()->toString();
        $role = $request->string('role')->trim()->toString();

        $users = User::query()
            ->with('roles')
            ->when($search !== '', fn ($query) => $query->where(
                fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"),
            ))
            ->when($role !== '', fn ($query) => $query->role($role))
            ->orderBy('name')
            ->paginate($perPage)
            // Not ->withQueryString(): Laravel's ConvertEmptyStringsToNull
            // middleware rewrites empty-string query params (search=, role=)
            // to null before we ever see them, and http_build_query() silently
            // drops null values — withQueryString() would read that already-
            // nulled request bag and lose these filters from every pagination
            // link. Appending our own sanitized (never-null) values instead.
            ->appends([
                'search' => $search,
                'role' => $role,
                'per_page' => $perPage,
            ]);

        return Inertia::render('users/index', [
            'users' => $users,
            'assignableRoles' => UserPolicy::assignableRoles($request->user()),
            'filters' => [
                'search' => $search,
                'role' => $role,
                'per_page' => $perPage,
            ],
            'counts' => [
                'total' => User::count(),
                'agent' => User::role('agent')->count(),
                'admin' => User::role('admin')->count(),
                'super-admin' => User::role('super-admin')->count(),
            ],
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        // Agents are invited via a signed "set your password" link and stay
        // inactive until they accept it. Admins/super admins are created
        // directly with the password the creator chose, active right away.
        $isInvited = $validated['role'] === 'agent';

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $isInvited ? 'password' : $validated['password'],
            'is_active' => ! $isInvited,
        ]);

        $user->syncRoles([$validated['role']]);

        if ($isInvited) {
            $user->notify(new AgentInviteNotification);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $isInvited ? __('User created and invited.') : __('User created.'),
        ]);

        return back();
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

        return back();
    }

    /**
     * Toggle the given user's active/suspended status.
     */
    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('update', $user);

        // Gate::before grants super-admins every ability, which would bypass
        // a self-suspend guard placed in the policy — enforce it here instead.
        abort_if($request->user()->id === $user->id, 403, __('You cannot change your own status.'));

        $user->update(['is_active' => ! $user->is_active]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $user->is_active
                ? __(':name has been activated.', ['name' => $user->name])
                : __(':name has been suspended.', ['name' => $user->name]),
        ]);

        return back();
    }

    /**
     * Remove the given user.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        Gate::authorize('delete', $user);

        // Gate::before grants super-admins every ability, which would bypass
        // the policy's self-delete guard for them — enforce it here instead.
        abort_if($request->user()->id === $user->id, 403, __('You cannot delete your own account.'));

        if ($user->hasRole('super-admin') && User::role('super-admin')->count() <= 1) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('You cannot delete the last super admin.')]);

            return back();
        }

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User deleted.')]);

        return back();
    }

    /**
     * Suspend a batch of users at once.
     */
    public function bulkSuspend(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('users.update'), 403);

        $validated = $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer'],
        ]);

        $suspended = 0;

        foreach (User::whereIn('id', $validated['user_ids'])->get() as $user) {
            // Same non-negotiable guards as the single-user action: skip
            // rather than fail the whole batch over one bad target.
            if ($request->user()->id === $user->id) {
                continue;
            }

            if (! Gate::allows('update', $user)) {
                continue;
            }

            $user->update(['is_active' => false]);
            $suspended++;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => trans_choice(':count user suspended.|:count users suspended.', $suspended, ['count' => $suspended]),
        ]);

        return back();
    }

    /**
     * Delete a batch of users at once.
     */
    public function bulkDestroy(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('users.delete'), 403);

        $validated = $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer'],
        ]);

        $deleted = 0;

        foreach (User::whereIn('id', $validated['user_ids'])->get() as $user) {
            if ($request->user()->id === $user->id) {
                continue;
            }

            if (! Gate::allows('delete', $user)) {
                continue;
            }

            // Recomputed on every iteration so deleting several super-admins
            // in one batch can't slip past this by all reading the same
            // stale count before any of them are actually removed.
            if ($user->hasRole('super-admin') && User::role('super-admin')->count() <= 1) {
                continue;
            }

            $user->delete();
            $deleted++;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => trans_choice(':count user deleted.|:count users deleted.', $deleted, ['count' => $deleted]),
        ]);

        return back();
    }
}
