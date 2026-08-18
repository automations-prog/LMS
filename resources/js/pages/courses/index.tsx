import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import {
    Ban,
    ExternalLink,
    FileText,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CourseController from '@/actions/App/Http/Controllers/CourseController';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { brandButtonClass } from '@/lib/brand-theme';
import { create, edit, index } from '@/routes/courses';
import type { Auth, Paginator } from '@/types';

const STATUS_BADGE_CLASSES: Record<string, string> = {
    draft: 'border-transparent bg-muted text-muted-foreground',
    published:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

type Category = {
    id: number;
    name: string;
};

type CourseRow = {
    id: number;
    title: string;
    status: 'draft' | 'published';
    due_days: number | null;
    resource_type: 'pdf' | 'link';
    resource_url: string | null;
    category: Category | null;
};

type Counts = {
    total: number;
    draft: number;
    published: number;
};

type Filters = {
    search: string;
    category: string;
    status: string;
    per_page: number;
};

type Props = {
    courses: Paginator<CourseRow>;
    categories: Category[];
    filters: Filters;
    counts: Counts;
};

const COUNT_CARDS: { key: keyof Counts; label: string }[] = [
    { key: 'total', label: 'Total resources' },
    { key: 'draft', label: 'Draft' },
    { key: 'published', label: 'Published' },
];

function applyFilters(overrides: Partial<Filters>, filters: Filters) {
    router.get(
        index().url,
        { ...filters, ...overrides },
        { preserveState: true, preserveScroll: true, replace: true },
    );
}

export default function CoursesIndex({
    courses,
    categories,
    filters,
    counts,
}: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const canCreate = auth.user.permissions.includes('courses.create');
    const canUpdate = auth.user.permissions.includes('courses.update');
    const canDelete = auth.user.permissions.includes('courses.delete');

    const [deletingCourseId, setDeletingCourseId] = useState<number | null>(
        null,
    );

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkUnpublishOpen, setBulkUnpublishOpen] = useState(false);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    const selectableIds = courses.data.map((c) => c.id);
    const allSelected =
        selectableIds.length > 0 &&
        selectableIds.every((id) => selectedIds.includes(id));

    function toggleSelectAll() {
        setSelectedIds(allSelected ? [] : selectableIds);
    }

    function toggleSelectOne(id: number) {
        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((existing) => existing !== id)
                : [...current, id],
        );
    }

    const [search, setSearch] = useState(filters.search);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced directly from the input's onChange rather than a useEffect
    // watching `search`: React StrictMode double-invokes effects in dev
    // mode, and a ref-based "skip the first run" guard doesn't survive that
    // — the second (spurious) invocation would fire a stale, page-less
    // request that silently overwrote whatever page you'd just navigated to.
    function handleSearchChange(value: string) {
        setSearch(value);

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            applyFilters({ search: value }, filters);
        }, 300);
    }

    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, []);

    return (
        <>
            <Head title="Resources" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Resources"
                        description="Create and manage training resources"
                    />

                    <div className="flex gap-2">
                        {canCreate && (
                            <Button asChild className={brandButtonClass}>
                                <Link href={create()}>
                                    <Plus className="size-4" />
                                    New resource
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    {COUNT_CARDS.map((card) => (
                        <div
                            key={card.key}
                            className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
                        >
                            <p className="text-sm text-muted-foreground">
                                {card.label}
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                                {counts[card.key]}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) =>
                                handleSearchChange(e.target.value)
                            }
                            placeholder="Search by title..."
                            className="pl-9"
                        />
                    </div>

                    <Combobox
                        className="w-44"
                        value={
                            filters.category === '' ? 'all' : filters.category
                        }
                        onChange={(value) =>
                            applyFilters(
                                { category: value === 'all' ? '' : value },
                                filters,
                            )
                        }
                        placeholder="All categories"
                        searchPlaceholder="Search categories…"
                        emptyText="No categories found."
                        options={[
                            { value: 'all', label: 'All categories' },
                            ...categories.map((category) => ({
                                value: String(category.id),
                                label: category.name,
                            })),
                        ]}
                    />

                    <Select
                        value={filters.status === '' ? 'all' : filters.status}
                        onValueChange={(value) =>
                            applyFilters(
                                { status: value === 'all' ? '' : value },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">
                                Published
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-sidebar-border/70 bg-muted/50 px-4 py-2 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">
                            {selectedIds.length} selected
                        </p>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBulkUnpublishOpen(true)}
                            >
                                <Ban />
                                Unpublish
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setBulkDeleteOpen(true)}
                            >
                                <Trash2 />
                                Delete
                            </Button>
                        </div>
                    </div>
                )}

                <Dialog
                    open={bulkUnpublishOpen}
                    onOpenChange={setBulkUnpublishOpen}
                >
                    <DialogContent>
                        <DialogTitle>
                            Unpublish {selectedIds.length} resource
                            {selectedIds.length === 1 ? '' : 's'}?
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Already-draft resources in the selection are left
                            as-is.
                        </p>

                        <Form
                            {...CourseController.bulkUnpublish.form()}
                            onSuccess={() => {
                                setBulkUnpublishOpen(false);
                                setSelectedIds([]);
                            }}
                        >
                            {({ processing }) => (
                                <>
                                    {selectedIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="course_ids[]"
                                            value={id}
                                        />
                                    ))}
                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button variant="secondary">
                                                Cancel
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Unpublish
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>

                <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                    <DialogContent>
                        <DialogTitle>
                            Delete {selectedIds.length} resource
                            {selectedIds.length === 1 ? '' : 's'}?
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            This cannot be undone.
                        </p>

                        <Form
                            {...CourseController.bulkDestroy.form()}
                            onSuccess={() => {
                                setBulkDeleteOpen(false);
                                setSelectedIds([]);
                            }}
                        >
                            {({ processing }) => (
                                <>
                                    {selectedIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="course_ids[]"
                                            value={id}
                                        />
                                    ))}
                                    <DialogFooter className="gap-2">
                                        <DialogClose asChild>
                                            <Button variant="secondary">
                                                Cancel
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            type="submit"
                                            variant="destructive"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Delete
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="w-10 px-4 py-3">
                                    <Checkbox
                                        checked={allSelected}
                                        disabled={selectableIds.length === 0}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all resources"
                                    />
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Title
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Category
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Resource
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Due
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Status
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.data.map((course) => (
                                <tr
                                    key={course.id}
                                    className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                >
                                    <td className="px-4 py-3">
                                        <Checkbox
                                            checked={selectedIds.includes(
                                                course.id,
                                            )}
                                            onCheckedChange={() =>
                                                toggleSelectOne(course.id)
                                            }
                                            aria-label={`Select ${course.title}`}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        {course.title}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {course.category?.name ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {course.resource_type === 'pdf' ? (
                                            <span className="inline-flex items-center gap-1">
                                                <FileText className="size-4" />
                                                PDF
                                            </span>
                                        ) : (
                                            <a
                                                href={
                                                    course.resource_url ?? '#'
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 hover:text-foreground"
                                            >
                                                <ExternalLink className="size-4" />
                                                Link
                                            </a>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {course.due_days
                                            ? `${course.due_days} days`
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant="outline"
                                            className={
                                                STATUS_BADGE_CLASSES[
                                                    course.status
                                                ]
                                            }
                                        >
                                            {course.status === 'published'
                                                ? 'Published'
                                                : 'Draft'}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={
                                                        !canUpdate &&
                                                        !canDelete
                                                    }
                                                >
                                                    <MoreHorizontal className="size-4" />
                                                    <span className="sr-only">
                                                        Actions
                                                    </span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {canUpdate && (
                                                    <DropdownMenuItem
                                                        asChild
                                                    >
                                                        <Link
                                                            href={edit(
                                                                course.id,
                                                            )}
                                                        >
                                                            Edit
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                {canUpdate && (
                                                    <DropdownMenuItem
                                                        onSelect={() =>
                                                            router.patch(
                                                                CourseController.updateStatus.url(
                                                                    course.id,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        {course.status ===
                                                        'published'
                                                            ? 'Unpublish'
                                                            : 'Publish'}
                                                    </DropdownMenuItem>
                                                )}
                                                {canDelete && (
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        onSelect={(e) => {
                                                            e.preventDefault();
                                                            setDeletingCourseId(
                                                                course.id,
                                                            );
                                                        }}
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Dialog
                                            open={
                                                deletingCourseId === course.id
                                            }
                                            onOpenChange={(open) =>
                                                setDeletingCourseId(
                                                    open ? course.id : null,
                                                )
                                            }
                                        >
                                            <DialogContent>
                                                <DialogTitle>
                                                    Delete {course.title}?
                                                </DialogTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    This cannot be undone.
                                                </p>

                                                <Form
                                                    {...CourseController.destroy.form(
                                                        course.id,
                                                    )}
                                                    onSuccess={() =>
                                                        setDeletingCourseId(
                                                            null,
                                                        )
                                                    }
                                                >
                                                    {({ processing }) => (
                                                        <DialogFooter className="gap-2">
                                                            <DialogClose
                                                                asChild
                                                            >
                                                                <Button variant="secondary">
                                                                    Cancel
                                                                </Button>
                                                            </DialogClose>
                                                            <Button
                                                                type="submit"
                                                                variant="destructive"
                                                                disabled={
                                                                    processing
                                                                }
                                                            >
                                                                Delete
                                                            </Button>
                                                        </DialogFooter>
                                                    )}
                                                </Form>
                                            </DialogContent>
                                        </Dialog>
                                    </td>
                                </tr>
                            ))}

                            {courses.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No resources found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <DataPagination
                    paginator={courses}
                    filters={{
                        search: filters.search,
                        category: filters.category,
                        status: filters.status,
                    }}
                />
            </div>
        </>
    );
}

CoursesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Resources',
            href: index(),
        },
    ],
};
