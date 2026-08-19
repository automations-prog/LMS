<?php

namespace App\Policies;

use App\Models\AhipCertification;
use App\Models\User;

class AhipCertificationPolicy
{
    /**
     * Determine whether the user can view the list of AHIP certifications.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('onboarding.review');
    }

    /**
     * Determine whether the user can view the given AHIP certification.
     */
    public function view(User $user, AhipCertification $ahipCertification): bool
    {
        return $user->can('onboarding.review');
    }

    /**
     * Determine whether the user can decide the given AHIP certification.
     */
    public function review(User $user, AhipCertification $ahipCertification): bool
    {
        return $user->can('onboarding.review');
    }
}
