<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * The three roles seeded by the app itself. Their names can't be
     * changed and they can't be deleted — renaming or removing them would
     * break the hardcoded role-name checks elsewhere in the app (e.g.
     * `UserPolicy`, the "last super-admin" guards in `UserController`).
     *
     * @var list<string>
     */
    private const SYSTEM_ROLES = ['super-admin', 'admin', 'agent'];

    /**
     * Display the role & permission management list.
     */
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('roles.manage'), 403);

        $perPage = $this->perPage($request);
        $search = $request->string('search')->trim()->toString();

        $roles = Role::query()
            ->with('permissions')
            ->withCount('users')
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate($perPage)
            // Not ->withQueryString(): see the identical note in
            // UserController::index — ConvertEmptyStringsToNull would null
            // out an empty search before withQueryString() ever reads it.
            ->appends([
                'search' => $search,
                'per_page' => $perPage,
            ]);

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'permissions' => Permission::query()->orderBy('name')->pluck('name'),
            'systemRoles' => self::SYSTEM_ROLES,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Create a new role with an initial set of permissions.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('roles.manage'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:roles,name'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::in(Permission::pluck('name'))],
        ]);

        $role = Role::create(['name' => $validated['name']]);
        $role->syncPermissions($validated['permissions'] ?? []);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role created.')]);

        return back();
    }

    /**
     * Rename a (non-system) role and/or update its permissions.
     *
     * `super-admin` is always force-synced to every permission regardless
     * of what's submitted, and system roles silently keep their existing
     * name — the frontend doesn't offer a name field for them, this is
     * just defense-in-depth.
     */
    public function update(Request $request, Role $role): RedirectResponse
    {
        abort_unless($request->user()->can('roles.manage'), 403);

        $isSystemRole = in_array($role->name, self::SYSTEM_ROLES, true);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles', 'name')->ignore($role->id)],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::in(Permission::pluck('name'))],
        ]);

        if (! $isSystemRole) {
            $role->update(['name' => $validated['name']]);
        }

        $role->syncPermissions(
            $role->name === 'super-admin'
                ? Permission::pluck('name')->all()
                : ($validated['permissions'] ?? []),
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role updated.')]);

        return back();
    }

    /**
     * Delete a custom (non-system) role, as long as no user currently
     * holds it.
     */
    public function destroy(Request $request, Role $role): RedirectResponse
    {
        abort_unless($request->user()->can('roles.manage'), 403);
        abort_if(in_array($role->name, self::SYSTEM_ROLES, true), 403);

        $userCount = $role->users()->count();

        if ($userCount > 0) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => trans_choice(
                    'Cannot delete this role — it is assigned to :count user.|Cannot delete this role — it is assigned to :count users.',
                    $userCount,
                    ['count' => $userCount],
                ),
            ]);

            return back();
        }

        $role->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role deleted.')]);

        return back();
    }
}
