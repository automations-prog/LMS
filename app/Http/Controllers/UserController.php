<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Jobs\PullAgentsFromCustomerApiJob;
use App\Jobs\PullPitchHealthFromAirtableJob;
use App\Jobs\PullPitchPerfectFromAirtableJob;
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
        $source = $request->string('source')->trim()->toString();

        // Shared by the listing query and the count cards so the cards
        // reflect the same search/source filters as the table below them.
        // Role is intentionally excluded: each card counts users of that
        // role within the current search/source scope, so switching roles
        // doesn't also zero out the other cards.
        $baseQuery = fn () => User::query()
            ->when($search !== '', fn ($query) => $query->where(
                fn ($query) => $query
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%"),
            ))
            ->when($source !== '', fn ($query) => $query->where('source', $source));

        $users = $baseQuery()
            ->with('roles')
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
                'source' => $source,
                'per_page' => $perPage,
            ]);

        return Inertia::render('users/index', [
            'users' => $users,
            'assignableRoles' => UserPolicy::assignableRoles($request->user()),
            'filters' => [
                'search' => $search,
                'role' => $role,
                'source' => $source,
                'per_page' => $perPage,
            ],
            'counts' => [
                'total' => $baseQuery()->count(),
                'agent' => $baseQuery()->role('agent')->count(),
                'admin' => $baseQuery()->role('admin')->count(),
                'super-admin' => $baseQuery()->role('super-admin')->count(),
            ],
        ]);
    }

    /**
     * Show a single user's account details.
     */
    public function show(Request $request, User $user): Response
    {
        Gate::authorize('view', $user);

        $user->load('roles.permissions');

        // The onboarding workflow (eligibility, training, license, AHIP)
        // already has its own dedicated review page — surface just enough
        // here to link over to it, not duplicate it.
        if ($user->hasRole('agent')) {
            $user->load([
                'eligibilityAttestation',
                'trainingCompletion',
                'licenseSubmission',
                'ahipCertification',
            ]);
        }

        return Inertia::render('users/show', [
            'targetUser' => $user,
            'canEdit' => $request->user()->can('update', $user),
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
            'source' => User::SOURCE_MANUAL,
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
     * Queue a pull of new agents from the Customer API.
     */
    public function pullAgents(Request $request): RedirectResponse
    {
        Gate::authorize('create', User::class);

        PullAgentsFromCustomerApiJob::dispatch($request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Pull started. New agents will appear shortly.'),
        ]);

        return back();
    }

    /**
     * Pull the latest Pitch Health submissions from Airtable, save them,
     * and create an agent account for each submitted email that isn't
     * already registered.
     */
    public function pullPitchHealth(Request $request): RedirectResponse
    {
        Gate::authorize('create', User::class);

        PullPitchHealthFromAirtableJob::dispatch($request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Pull started. Pitch Health data will update shortly.'),
        ]);

        return back();
    }

    /**
     * Pull the latest PitchPerfect submissions from Airtable, save them,
     * and create an agent account for each submitted email whose Status is
     * Active and isn't already registered.
     */
    public function pullPitchPerfect(Request $request): RedirectResponse
    {
        Gate::authorize('create', User::class);

        PullPitchPerfectFromAirtableJob::dispatch($request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Pull started. PitchPerfect data will update shortly.'),
        ]);

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

        foreach (User::whereIn('id', $validated['user_ids'])->with('roles')->get() as $user) {
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

        foreach (User::whereIn('id', $validated['user_ids'])->with('roles')->get() as $user) {
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
