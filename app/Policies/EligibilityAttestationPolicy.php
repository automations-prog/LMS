<?php

namespace App\Policies;

use App\Models\EligibilityAttestation;
use App\Models\User;

class EligibilityAttestationPolicy
{
    /**
     * Determine whether the user can view the list of attestations.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('onboarding.review');
    }

    /**
     * Determine whether the user can view the given attestation.
     */
    public function view(User $user, EligibilityAttestation $eligibilityAttestation): bool
    {
        return $user->can('onboarding.review');
    }

    /**
     * Determine whether the user can decide the given attestation.
     */
    public function review(User $user, EligibilityAttestation $eligibilityAttestation): bool
    {
        return $user->can('onboarding.review');
    }
}
