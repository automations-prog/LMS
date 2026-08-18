import { Head, Link, router } from '@inertiajs/react';
import EligibilityReviewController from '@/actions/App/Http/Controllers/EligibilityReviewController';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { index } from '@/routes/eligibility';
import type { Paginator } from '@/types';

const STATUS_LABELS: Record<string, string> = {
    flagged_for_waiver: 'Flagged for waiver',
    cleared: 'Cleared',
    not_eligible: 'Not eligible',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
    flagged_for_waiver:
        'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    cleared:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    not_eligible:
        'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const STATUS_OPTIONS = ['flagged_for_waiver', 'cleared', 'not_eligible'];

type AttestationRow = {
    id: number;
    status: string;
    created_at: string;
    user: { id: number; name: string; email: string };
};

type Filters = {
    status: string;
};

type Props = {
    attestations: Paginator<AttestationRow>;
    filters: Filters;
};

const submittedFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
});

export default function EligibilityIndex({ attestations, filters }: Props) {
    function applyStatus(status: string) {
        router.get(
            index().url,
            { status: status === 'all' ? '' : status },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    return (
        <>
            <Head title="Eligibility review" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Eligibility review"
                    description="Review agent eligibility attestations flagged for a waiver decision"
                />

                <div className="flex items-center gap-3">
                    <Select
                        value={filters.status === '' ? 'flagged_for_waiver' : filters.status}
                        onValueChange={applyStatus}
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
                                <th className="px-4 py-3 font-medium">
                                    Agent
                                </th>
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
                            {attestations.data.map((attestation) => (
                                <tr
                                    key={attestation.id}
                                    className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                >
                                    <td className="px-4 py-3">
                                        <div>{attestation.user.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {attestation.user.email}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {submittedFormatter.format(
                                            new Date(attestation.created_at),
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Badge
                                            variant="outline"
                                            className={
                                                STATUS_BADGE_CLASSES[
                                                    attestation.status
                                                ]
                                            }
                                        >
                                            {STATUS_LABELS[
                                                attestation.status
                                            ] ?? attestation.status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link
                                                href={EligibilityReviewController.show(
                                                    attestation.id,
                                                )}
                                            >
                                                Review
                                            </Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {attestations.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No attestations found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <DataPagination
                    paginator={attestations}
                    filters={{ status: filters.status }}
                />
            </div>
        </>
    );
}

EligibilityIndex.layout = {
    breadcrumbs: [
        {
            title: 'Eligibility review',
            href: index(),
        },
    ],
};
