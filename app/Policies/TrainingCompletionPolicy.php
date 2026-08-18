<?php

namespace App\Policies;

use App\Models\TrainingCompletion;
use App\Models\User;

class TrainingCompletionPolicy
{
    /**
     * Determine whether the user can view the list of training completions.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('onboarding.review');
    }

    /**
     * Determine whether the user can view the given training completion.
     */
    public function view(User $user, TrainingCompletion $trainingCompletion): bool
    {
        return $user->can('onboarding.review');
    }

    /**
     * Determine whether the user can decide the given training completion.
     */
    public function review(User $user, TrainingCompletion $trainingCompletion): bool
    {
        return $user->can('onboarding.review');
    }
}
