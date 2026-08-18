import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { show } from '@/actions/App/Http/Controllers/OnboardingReviewController';
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
import { index } from '@/routes/onboarding';
import type { Paginator } from '@/types';

const ELIGIBILITY_STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    flagged_for_waiver: 'Flagged for waiver',
    cleared: 'Eligible',
    not_eligible: 'Not eligible',
};

const ELIGIBILITY_BADGE_CLASSES: Record<string, string> = {
    pending:
        'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400',
    flagged_for_waiver:
        'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    cleared:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    not_eligible:
        'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const TRAINING_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

const TRAINING_BADGE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400',
    verified:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    rejected:
        'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const NOT_SUBMITTED_CLASSES =
    'border-transparent bg-muted text-muted-foreground';

function StatusBadge({
    status,
    labels,
    classes,
}: {
    status: string | null;
    labels: Record<string, string>;
    classes: Record<string, string>;
}) {
    if (!status) {
        return (
            <Badge variant="outline" className={NOT_SUBMITTED_CLASSES}>
                Not submitted
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className={classes[status]}>
            {labels[status] ?? status}
        </Badge>
    );
}

type AgentRow = {
    id: number;
    name: string;
    email: string;
    eligibility_attestation: { status: string } | null;
    training_completion: { status: string } | null;
};

type Filters = {
    search: string;
    eligibility_status: string;
    training_status: string;
};

type Props = {
    agents: Paginator<AgentRow>;
    filters: Filters;
};

function applyFilters(overrides: Partial<Filters>, filters: Filters) {
    router.get(
        index().url,
        { ...filters, ...overrides },
        { preserveState: true, preserveScroll: true, replace: true },
    );
}

export default function OnboardingIndex({ agents, filters }: Props) {
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
            <Head title="Onboarding review" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Onboarding review"
                    description="Review agent eligibility and training progress"
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
                        value={
                            filters.eligibility_status === ''
                                ? 'all'
                                : filters.eligibility_status
                        }
                        onValueChange={(status) =>
                            applyFilters(
                                {
                                    eligibility_status:
                                        status === 'all' ? '' : status,
                                },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="Eligibility status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All eligibility statuses
                            </SelectItem>
                            {Object.entries(ELIGIBILITY_STATUS_LABELS).map(
                                ([status, label]) => (
                                    <SelectItem key={status} value={status}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>

                    <Select
                        value={
                            filters.training_status === ''
                                ? 'all'
                                : filters.training_status
                        }
                        onValueChange={(status) =>
                            applyFilters(
                                {
                                    training_status:
                                        status === 'all' ? '' : status,
                                },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="Training status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All training statuses
                            </SelectItem>
                            {Object.entries(TRAINING_STATUS_LABELS).map(
                                ([status, label]) => (
                                    <SelectItem key={status} value={status}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="px-4 py-3 font-medium">Agent</th>
                                <th className="px-4 py-3 font-medium">
                                    Eligibility
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Training
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.data.map((agent) => (
                                <tr
                                    key={agent.id}
                                    className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                >
                                    <td className="px-4 py-3">
                                        <div>{agent.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {agent.email}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge
                                            status={
                                                agent.eligibility_attestation
                                                    ?.status ?? null
                                            }
                                            labels={ELIGIBILITY_STATUS_LABELS}
                                            classes={ELIGIBILITY_BADGE_CLASSES}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge
                                            status={
                                                agent.training_completion
                                                    ?.status ?? null
                                            }
                                            labels={TRAINING_STATUS_LABELS}
                                            classes={TRAINING_BADGE_CLASSES}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link href={show(agent.id)}>
                                                Review
                                            </Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {agents.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No agents found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <DataPagination
                    paginator={agents}
                    filters={{
                        search: filters.search,
                        eligibility_status: filters.eligibility_status,
                        training_status: filters.training_status,
                    }}
                />
            </div>
        </>
    );
}

OnboardingIndex.layout = {
    breadcrumbs: [
        {
            title: 'Onboarding review',
            href: index(),
        },
    ],
};
