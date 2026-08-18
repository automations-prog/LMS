<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * @var list<int>
     */
    protected const PER_PAGE_OPTIONS = [10, 25, 50, 100];

    /**
     * Safely read `per_page` from the request, falling back to the first
     * allowed option if it's missing or not one of PER_PAGE_OPTIONS.
     */
    protected function perPage(Request $request): int
    {
        $perPage = (int) $request->query('per_page', self::PER_PAGE_OPTIONS[0]);

        return in_array($perPage, self::PER_PAGE_OPTIONS, true) ? $perPage : self::PER_PAGE_OPTIONS[0];
    }
}
