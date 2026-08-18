import { Form, Head, router } from '@inertiajs/react';
import {
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import CategoryController from '@/actions/App/Http/Controllers/CategoryController';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
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
import { Spinner } from '@/components/ui/spinner';
import { brandButtonClass } from '@/lib/brand-theme';
import { index as categoriesIndex } from '@/routes/categories';
import { index as coursesIndex } from '@/routes/courses';
import type { Paginator } from '@/types';

type Category = {
    id: number;
    name: string;
    courses_count: number;
};

type Filters = {
    search: string;
    per_page: number;
};

type Props = {
    categories: Paginator<Category>;
    filters: Filters;
};

function applyFilters(overrides: Partial<Filters>, filters: Filters) {
    router.get(
        categoriesIndex().url,
        { ...filters, ...overrides },
        { preserveState: true, preserveScroll: true, replace: true },
    );
}

export default function CoursesCategories({ categories, filters }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

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
            <Head title="Categories" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div>
                    <div className="flex items-center justify-between">
                        <Heading
                            variant="small"
                            title="Categories"
                            description="Add, rename, or remove resource categories"
                        />

                        <Dialog
                            open={createOpen}
                            onOpenChange={setCreateOpen}
                        >
                            <DialogTrigger asChild>
                                <Button className={brandButtonClass}>
                                    <Plus className="size-4" />
                                    New category
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogTitle>Add category</DialogTitle>

                                <Form
                                    {...CategoryController.store.form()}
                                    resetOnSuccess
                                    onSuccess={() => setCreateOpen(false)}
                                    className="space-y-4"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="name">
                                                    Name
                                                </Label>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    required
                                                    autoFocus
                                                />
                                                <InputError
                                                    message={errors.name}
                                                />
                                            </div>

                                            <DialogFooter className="gap-2">
                                                <DialogClose asChild>
                                                    <Button variant="secondary">
                                                        Cancel
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    type="submit"
                                                    className={
                                                        brandButtonClass
                                                    }
                                                    disabled={processing}
                                                >
                                                    {processing && (
                                                        <Spinner />
                                                    )}
                                                    Create category
                                                </Button>
                                            </DialogFooter>
                                        </>
                                    )}
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) =>
                                handleSearchChange(e.target.value)
                            }
                            placeholder="Search by name..."
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="px-4 py-3 font-medium">
                                    Name
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Resources
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.data.map((category) => (
                                <tr
                                    key={category.id}
                                    className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                >
                                    <td className="px-4 py-3">
                                        {category.name}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {category.courses_count}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <MoreHorizontal className="size-4" />
                                                    <span className="sr-only">
                                                        Actions
                                                    </span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onSelect={(e) => {
                                                        e.preventDefault();
                                                        setEditingId(
                                                            category.id,
                                                        );
                                                    }}
                                                >
                                                    <Pencil />
                                                    Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    variant="destructive"
                                                    disabled={
                                                        category.courses_count >
                                                        0
                                                    }
                                                    onSelect={(e) => {
                                                        e.preventDefault();
                                                        setDeletingId(
                                                            category.id,
                                                        );
                                                    }}
                                                >
                                                    <Trash2 />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Dialog
                                            open={
                                                editingId === category.id
                                            }
                                            onOpenChange={(open) =>
                                                setEditingId(
                                                    open
                                                        ? category.id
                                                        : null,
                                                )
                                            }
                                        >
                                            <DialogContent>
                                                <DialogTitle>
                                                    Rename {category.name}
                                                </DialogTitle>

                                                <Form
                                                    {...CategoryController.update.form(
                                                        category.id,
                                                    )}
                                                    onSuccess={() =>
                                                        setEditingId(null)
                                                    }
                                                    className="space-y-4"
                                                >
                                                    {({
                                                        processing,
                                                        errors,
                                                    }) => (
                                                        <>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="name">
                                                                    Name
                                                                </Label>
                                                                <Input
                                                                    id="name"
                                                                    name="name"
                                                                    required
                                                                    autoFocus
                                                                    defaultValue={
                                                                        category.name
                                                                    }
                                                                />
                                                                <InputError
                                                                    message={
                                                                        errors.name
                                                                    }
                                                                />
                                                            </div>

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
                                                                    className={
                                                                        brandButtonClass
                                                                    }
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                >
                                                                    {processing && (
                                                                        <Spinner />
                                                                    )}
                                                                    Save
                                                                    changes
                                                                </Button>
                                                            </DialogFooter>
                                                        </>
                                                    )}
                                                </Form>
                                            </DialogContent>
                                        </Dialog>

                                        <Dialog
                                            open={
                                                deletingId === category.id
                                            }
                                            onOpenChange={(open) =>
                                                setDeletingId(
                                                    open
                                                        ? category.id
                                                        : null,
                                                )
                                            }
                                        >
                                            <DialogContent>
                                                <DialogTitle>
                                                    Delete {category.name}?
                                                </DialogTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    This cannot be undone.
                                                </p>

                                                <Form
                                                    {...CategoryController.destroy.form(
                                                        category.id,
                                                    )}
                                                    onSuccess={() =>
                                                        setDeletingId(null)
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

                            {categories.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No categories found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <DataPagination
                    paginator={categories}
                    filters={{ search: filters.search }}
                />
            </div>
        </>
    );
}

CoursesCategories.layout = {
    breadcrumbs: [
        {
            title: 'Resources',
            href: coursesIndex(),
        },
        {
            title: 'Categories',
            href: categoriesIndex(),
        },
    ],
};
