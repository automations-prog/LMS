<?php

namespace App\Policies;

use App\Models\RoleplaySession;
use App\Models\User;

class RoleplaySessionPolicy
{
    /**
     * Determine whether the user can start a new roleplay session —
     * requires access an admin explicitly granted.
     */
    public function create(User $user): bool
    {
        return $user->hasRoleplayAccess();
    }

    /**
     * Determine whether the user can view the given session — either the
     * agent it belongs to, or an admin coaching them.
     */
    public function view(User $user, RoleplaySession $roleplaySession): bool
    {
        return $user->id === $roleplaySession->user_id || $user->can('roleplay.manage');
    }

    /**
     * Determine whether the user can post a token request or complete the
     * given session — the owning agent only, and only while it's live.
     */
    public function update(User $user, RoleplaySession $roleplaySession): bool
    {
        return $user->id === $roleplaySession->user_id
            && $roleplaySession->status === RoleplaySession::STATUS_IN_PROGRESS;
    }
}
