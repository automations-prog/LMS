<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    /**
     * The roles considered "admin-level" — managing them requires the
     * users.manage-admins permission on top of the base CRUD permission.
     *
     * @var list<string>
     */
    private const ADMIN_LEVEL_ROLES = ['admin', 'super-admin'];

    /**
     * Determine whether the user can view the list of users.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('users.view');
    }

    /**
     * Determine whether the user can view a specific user.
     */
    public function view(User $user, User $target): bool
    {
        return $user->can('users.view') && $this->canManageTarget($user, $target);
    }

    /**
     * Determine whether the user can create users.
     */
    public function create(User $user): bool
    {
        return $user->can('users.create');
    }

    /**
     * Determine whether the user can update the given user.
     */
    public function update(User $user, User $target): bool
    {
        return $user->can('users.update') && $this->canManageTarget($user, $target);
    }

    /**
     * Determine whether the user can delete the given user.
     */
    public function delete(User $user, User $target): bool
    {
        return $user->id !== $target->id
            && $user->can('users.delete')
            && $this->canManageTarget($user, $target);
    }

    /**
     * Determine whether the user can impersonate the given user.
     */
    public function impersonate(User $user, User $target): bool
    {
        return $user->id !== $target->id
            && $user->can('users.impersonate')
            && $this->canManageTarget($user, $target);
    }

    /**
     * Determine whether the actor is allowed to touch the target account,
     * enforcing the role-hierarchy rule: admin-level accounts can only be
     * managed by someone with the users.manage-admins permission.
     */
    private function canManageTarget(User $user, User $target): bool
    {
        if (! $target->hasAnyRole(self::ADMIN_LEVEL_ROLES)) {
            return true;
        }

        return $user->can('users.manage-admins');
    }

    /**
     * The roles the given user is allowed to assign to other users.
     *
     * @return list<string>
     */
    public static function assignableRoles(User $user): array
    {
        if ($user->can('users.manage-admins')) {
            return ['agent', 'admin', 'super-admin'];
        }

        if ($user->can('users.create')) {
            return ['agent'];
        }

        return [];
    }
}
