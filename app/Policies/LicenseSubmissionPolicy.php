<?php

namespace App\Policies;

use App\Models\LicenseSubmission;
use App\Models\User;

class LicenseSubmissionPolicy
{
    /**
     * Determine whether the user can view the list of license submissions.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('onboarding.review');
    }

    /**
     * Determine whether the user can view the given license submission.
     */
    public function view(User $user, LicenseSubmission $licenseSubmission): bool
    {
        return $user->can('onboarding.review');
    }

    /**
     * Determine whether the user can decide the given license submission.
     */
    public function review(User $user, LicenseSubmission $licenseSubmission): bool
    {
        return $user->can('onboarding.review');
    }
}
