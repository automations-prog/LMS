import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import {
    ExternalLink,
    FileText,
    MoreHorizontal,
    Plus,
    Search,
    Settings,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CategoryController from '@/actions/App/Http/Controllers/CategoryController';
import CourseController from '@/actions/App/Http/Controllers/CourseController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { create, edit, index } from '@/routes/courses';
import type { Auth } from '@/types';

const STATUS_BADGE_CLASSES: Record<string, string> = {
    draft: 'border-transparent bg-muted text-muted-foreground',
    published:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
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
    courses: {
        data: CourseRow[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
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

function ManageCategoriesDialog({ categories }: { categories: Category[] }) {
    const [open, setOpen] = useState(false);
    const [renamingId, setRenamingId] = useState<number | null>(null);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Settings className="size-4" />
                    Manage categories
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>Manage categories</DialogTitle>

                <div className="space-y-2">
                    {categories.map((category) =>
                        renamingId === category.id ? (
                            <Form
                                key={category.id}
                                {...CategoryController.update.form(
                                    category.id,
                                )}
                                onSuccess={() => setRenamingId(null)}
                                className="flex items-center gap-2"
                            >
                                {({ processing, errors }) => (
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                name="name"
                                                required
                                                autoFocus
                                                defaultValue={category.name}
                                            />
                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={processing}
                                            >
                                                {processing && <Spinner />}
                                                Save
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    setRenamingId(null)
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                        <InputError message={errors.name} />
                                    </div>
                                )}
                            </Form>
                        ) : (
                            <div
                                key={category.id}
                                className="flex items-center justify-between rounded-md border border-sidebar-border/70 px-3 py-2 dark:border-sidebar-border"
                            >
                                <span className="text-sm">
                                    {category.name}
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setRenamingId(category.id)
                                        }
                                    >
                                        Rename
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => {
                                            if (
                                                confirm(
                                                    `Delete "${category.name}"? This only works if no resources use it.`,
                                                )
                                            ) {
                                                router.delete(
                                                    CategoryController.destroy.url(
                                                        category.id,
                                                    ),
                                                );
                                            }
                                        }}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        ),
                    )}

                    {categories.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                            No categories yet.
                        </p>
                    )}
                </div>

                <Form
                    {...CategoryController.store.form()}
                    resetOnSuccess
                    className="flex items-start gap-2 border-t border-sidebar-border/70 pt-4 dark:border-sidebar-border"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="flex-1">
                                <Input
                                    name="name"
                                    placeholder="New category name"
                                    required
                                />
                                <InputError message={errors.name} />
                            </div>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Add
                            </Button>
                        </>
                    )}
                </Form>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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

    const [search, setSearch] = useState(filters.search);
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            applyFilters({ search }, filters);
        }, 300);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

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
                        {canUpdate && (
                            <ManageCategoriesDialog categories={categories} />
                        )}
                        {canCreate && (
                            <Button asChild>
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
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by title..."
                            className="pl-9"
                        />
                    </div>

                    <Select
                        value={
                            filters.category === '' ? 'all' : filters.category
                        }
                        onValueChange={(value) =>
                            applyFilters(
                                { category: value === 'all' ? '' : value },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All categories
                            </SelectItem>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={String(category.id)}
                                >
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

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

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
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
                                        colSpan={6}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No resources found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {courses.total > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Rows per page
                                </span>
                                <Select
                                    value={String(filters.per_page)}
                                    onValueChange={(value) =>
                                        applyFilters(
                                            { per_page: Number(value) },
                                            filters,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PER_PAGE_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option}
                                                value={String(option)}
                                            >
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Showing {courses.from} to {courses.to} of{' '}
                                {courses.total} resources
                            </p>
                        </div>

                        {courses.last_page > 1 && (
                            <div className="flex flex-wrap gap-1">
                                {courses.links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={
                                            link.active
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        disabled={!link.url}
                                        asChild={!!link.url}
                                    >
                                        {link.url ? (
                                            <Link
                                                href={link.url}
                                                preserveScroll
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        ) : (
                                            <span
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
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
