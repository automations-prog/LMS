<?php

namespace App\Policies;

use App\Models\Course;
use App\Models\User;

class CoursePolicy
{
    /**
     * Determine whether the user can view the list of courses.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('courses.view');
    }

    /**
     * Determine whether the user can browse published courses (the
     * read-only, agent-facing card view).
     */
    public function browse(User $user): bool
    {
        return $user->can('courses.browse');
    }

    /**
     * Determine whether the user can create courses.
     */
    public function create(User $user): bool
    {
        return $user->can('courses.create');
    }

    /**
     * Determine whether the user can update the given course.
     */
    public function update(User $user, Course $course): bool
    {
        return $user->can('courses.update');
    }

    /**
     * Determine whether the user can delete the given course.
     */
    public function delete(User $user, Course $course): bool
    {
        return $user->can('courses.delete');
    }
}
