# Users Page Pagination

This documents how pagination is implemented on the Users admin page, end to end:
backend query (`UserController`), shared `perPage` helper (`Controller`), the
`Paginator` TypeScript type, and the `DataPagination` React component.

## 1. Backend — `app/Http/Controllers/Controller.php`

Base controller exposes the allowed page sizes and a helper to safely read
`per_page` from the request (falls back to the first option if an invalid
value is passed).

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;

abstract class Controller
{
    use AuthorizesRequests;

    /**
     * @var list<int>
     */
    protected const PER_PAGE_OPTIONS = [10, 25, 50, 100];

    protected function perPage(Request $request): int
    {
        $perPage = (int) $request->query('per_page', self::PER_PAGE_OPTIONS[0]);

        return in_array($perPage, self::PER_PAGE_OPTIONS, true) ? $perPage : self::PER_PAGE_OPTIONS[0];
    }
}
```

## 2. Backend — `app/Http/Controllers/Admin/UserController.php`

`index()` builds the scoped/filtered query, then paginates it and preserves
the current query string (search, role, company_id, per_page) across page
links.

```php
public function index(Request $request): Response
{
    $this->authorize('viewAny', User::class);

    $actingUser = auth()->user();
    $isParentAdmin = $actingUser->hasRole('parent-admin');

    $search = trim((string) $request->query('search', ''));
    $role = $request->query('role');
    $companyId = $request->query('company_id');
    $viewUserId = $request->integer('view_user') ?: null;

    $scopedUsers = fn () => User::when($actingUser->company_id, fn ($query) => $query->where('company_id', $actingUser->company_id));

    return Inertia::render('admin/users/index', [
        'stats' => [
            'total' => $scopedUsers()->count(),
            'parent_admin' => $scopedUsers()->role('parent-admin')->count(),
            'child_admin' => $scopedUsers()->role('child-admin')->count(),
            'sales_rep' => $scopedUsers()->role('sales-rep')->count(),
        ],
        'users' => User::with(['roles', 'company'])
            ->when($actingUser->company_id, fn ($query) => $query->where('company_id', $actingUser->company_id))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }))
            ->when($role, fn ($query) => $query->whereHas('roles', fn ($query) => $query->where('name', $role)))
            ->when($isParentAdmin && $companyId, fn ($query) => $query->where('company_id', $companyId))
            ->latest()
            ->paginate($this->perPage($request))
            ->withQueryString(),
        'roles' => $isParentAdmin
            ? Role::pluck('name')
            : Role::where('name', '!=', 'parent-admin')->pluck('name'),
        'companies' => $isParentAdmin
            ? Company::where('is_active', true)->orderBy('name')->get(['id', 'name'])
            : [],
        'viewUser' => $viewUserId ? User::with('roles')->find($viewUserId) : null,
        'filters' => [
            'search' => $search,
            'role' => $role,
            'company_id' => $companyId,
        ],
    ]);
}
```

Notes:

- `->with(['roles', 'company'])` eager-loads relations to avoid N+1 queries when rendering each row.
- `->withQueryString()` keeps `search`, `role`, `company_id`, `per_page`, etc. attached to every pagination link.
- `paginate($this->perPage($request))` respects the `per_page` query param (10/25/50/100 only).

## 3. Frontend type — `resources/js/types/ui.ts`

```ts
export type Paginator<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    path: string;
    prev_page_url: string | null;
    next_page_url: string | null;
};
```

## 4. Frontend component — `resources/js/components/data-pagination.tsx`

Renders the "rows per page" selector, the "Showing X–Y of Z" summary, and the
page links, using Inertia's `router.get` to navigate without a full reload.

```tsx
import { router } from '@inertiajs/react';
import { Field, FieldLabel } from '@/components/ui/field';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Paginator } from '@/types';

const PER_PAGE_OPTIONS = ['10', '25', '50', '100'];

type Props = {
    paginator: Paginator<unknown>;
    /** Current filter query params to preserve when the per-page selection changes. */
    filters?: Record<string, string | number | string[] | undefined | null>;
};

export function DataPagination({ paginator, filters = {} }: Props) {
    const handlePerPageChange = (value: string) => {
        router.get(
            paginator.path,
            { ...filters, per_page: value },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const firstRow =
        paginator.total === 0
            ? 0
            : (paginator.current_page - 1) * paginator.per_page + 1;
    const lastRow = firstRow + paginator.data.length - 1;

    // Laravel's `links` array is [Previous, page 1, ..., page N, Next] —
    // the ends are already rendered separately via PaginationPrevious/Next.
    const pageLinks = paginator.links.slice(1, -1);

    return (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-4">
                <Field orientation="horizontal" className="w-fit">
                    <FieldLabel htmlFor="select-rows-per-page">
                        Rows per page
                    </FieldLabel>
                    <Select
                        defaultValue={String(paginator.per_page)}
                        onValueChange={handlePerPageChange}
                    >
                        <SelectTrigger
                            className="w-20"
                            id="select-rows-per-page"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="start">
                            <SelectGroup>
                                {PER_PAGE_OPTIONS.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>

                <p className="text-muted-foreground text-sm">
                    Showing {firstRow}–{lastRow} of {paginator.total}
                </p>
            </div>

            <Pagination className="mx-0 w-auto">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href={paginator.prev_page_url}
                            preserveScroll
                        />
                    </PaginationItem>
                    {pageLinks.map((link, index) => (
                        <PaginationItem key={index}>
                            {link.url === null ? (
                                <PaginationEllipsis />
                            ) : (
                                <PaginationLink
                                    href={link.url}
                                    isActive={link.active}
                                    preserveScroll
                                >
                                    {link.label}
                                </PaginationLink>
                            )}
                        </PaginationItem>
                    ))}
                    <PaginationItem>
                        <PaginationNext
                            href={paginator.next_page_url}
                            preserveScroll
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}
```

## 5. Usage — `resources/js/pages/admin/users/index.tsx`

```tsx
import { DataPagination } from '@/components/data-pagination';

// ...inside the page component's JSX:
<DataPagination paginator={users} filters={filters} />;
```

Where `users` is the `Paginator<User>` prop passed down from
`UserController::index()`, and `filters` is `{ search, role, company_id }` so
changing the page size preserves the active filters.
