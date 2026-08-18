import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TrainingReviewController from '@/actions/App/Http/Controllers/TrainingReviewController';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { index } from '@/routes/training';
import type { Paginator } from '@/types';

const STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400',
    verified:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    rejected:
        'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const STATUS_OPTIONS = ['pending_review', 'verified', 'rejected'];

type CompletionRow = {
    id: number;
    status: string;
    created_at: string;
    user: { id: number; name: string; email: string };
};

type Filters = {
    status: string;
    search: string;
};

type Props = {
    completions: Paginator<CompletionRow>;
    filters: Filters;
};

const submittedFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
});

function applyFilters(overrides: Partial<Filters>, filters: Filters) {
    router.get(
        index().url,
        { ...filters, ...overrides },
        { preserveState: true, preserveScroll: true, replace: true },
    );
}

export default function TrainingIndex({ completions, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced directly from the input's onChange — see the identical note
    // in resources/js/pages/users/index.tsx for why not a useEffect.
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
            <Head title="Training review" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Training review"
                    description="Review agent XCEL training certificates"
                />

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search by name or email..."
                            className="pl-9"
                        />
                    </div>

                    <Select
                        value={filters.status === '' ? 'all' : filters.status}
                        onValueChange={(status) =>
                            applyFilters(
                                { status: status === 'all' ? '' : status },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                    {STATUS_LABELS[status]}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="px-4 py-3 font-medium">Agent</th>
                                <th className="px-4 py-3 font-medium">
                                    Submitted
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
                            {completions.data.map((completion) => (
                                <tr
                                    key={completion.id}
                                    className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                >
                                    <td className="px-4 py-3">
                                        <div>{completion.user.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {completion.user.email}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {submittedFormatter.format(
                                            new Date(completion.created_at),
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant="outline"
                                            className={
                                                STATUS_BADGE_CLASSES[
                                                    completion.status
                                                ]
                                            }
                                        >
                                            {STATUS_LABELS[
                                                completion.status
                                            ] ?? completion.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={TrainingReviewController.show(
                                                    completion.id,
                                                )}
                                            >
                                                Review
                                            </Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {completions.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No submissions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <DataPagination
                    paginator={completions}
                    filters={{ status: filters.status, search: filters.search }}
                />
            </div>
        </>
    );
}

TrainingIndex.layout = {
    breadcrumbs: [
        {
            title: 'Training review',
            href: index(),
        },
    ],
};
