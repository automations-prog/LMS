import { Head, Link, router } from '@inertiajs/react';
import { Eye, ListChecks, Pencil, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { show } from '@/actions/App/Http/Controllers/OnboardingReviewController';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import OnboardingBulkUpdateDialog from '@/components/onboarding-bulk-update-dialog';
import OnboardingUpdateDialog from '@/components/onboarding-update-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { OnboardingAgent } from '@/types/onboarding';

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

const LICENSE_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

const LICENSE_BADGE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400',
    verified:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    rejected:
        'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const AHIP_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

const AHIP_BADGE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400',
    verified:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    rejected:
        'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

const CONTRACTING_STAGE_LABELS: Record<string, string> = {
    confirmed: 'License & cert confirmed',
    forwarded: 'Forwarded for contracting',
    issued: 'Appointment issued',
    carrier_certs: 'Carrier certifications',
    complete: 'Verified',
};

const CONTRACTING_STAGE_CLASSES: Record<string, string> = {
    confirmed:
        'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400',
    forwarded:
        'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    issued: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    carrier_certs:
        'border-transparent bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
    complete:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

const CONTRACTING_STAGE_ORDER: {
    key: 'confirmed' | 'forwarded' | 'issued' | 'carrier_certs' | 'complete';
    column:
        | 'contracting_confirmed_at'
        | 'contracting_forwarded_at'
        | 'contracting_issued_at'
        | 'contracting_carrier_certs_at'
        | 'contracting_complete_at';
}[] = [
    { key: 'confirmed', column: 'contracting_confirmed_at' },
    { key: 'forwarded', column: 'contracting_forwarded_at' },
    { key: 'issued', column: 'contracting_issued_at' },
    { key: 'carrier_certs', column: 'contracting_carrier_certs_at' },
    { key: 'complete', column: 'contracting_complete_at' },
];

// Stages are independently checkable — the badge just reflects the
// furthest-along one that's been checked, regardless of order.
function highestContractingStage(
    attestation: AgentRow['eligibility_attestation'],
): string | null {
    if (!attestation) {
        return null;
    }

    let highest: string | null = null;

    for (const { key, column } of CONTRACTING_STAGE_ORDER) {
        if (attestation[column] !== null) {
            highest = key;
        }
    }

    return highest;
}

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

type AgentRow = OnboardingAgent;

function CompletionBadge({
    label,
    completedAt,
    ready,
}: {
    label: string;
    completedAt: string | null;
    ready: boolean;
}) {
    if (completedAt) {
        return (
            <Badge
                variant="outline"
                className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            >
                {label}
            </Badge>
        );
    }

    if (ready) {
        return (
            <Badge
                variant="outline"
                className={ELIGIBILITY_BADGE_CLASSES.pending}
            >
                Pending
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className={NOT_SUBMITTED_CLASSES}>
            Blocked
        </Badge>
    );
}

type Filters = {
    search: string;
    eligibility_status: string;
    training_status: string;
    license_status: string;
    ahip_status: string;
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

    // Only the id is tracked (not the row object) so that once a decision
    // form inside the dialog submits and Inertia refreshes `agents`, the
    // dialog picks up the fresh status/reviewed-by from current props
    // instead of showing a stale snapshot.
    const [updatingAgentId, setUpdatingAgentId] = useState<number | null>(null);
    const updatingAgent =
        agents.data.find((agent) => agent.id === updatingAgentId) ?? null;

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);

    const allSelected =
        agents.data.length > 0 &&
        agents.data.every((agent) => selectedIds.includes(agent.id));

    function toggleSelectAll() {
        setSelectedIds(allSelected ? [] : agents.data.map((agent) => agent.id));
    }

    function toggleSelectOne(id: number) {
        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((existing) => existing !== id)
                : [...current, id],
        );
    }

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
                            <SelectValue placeholder="XCEL Training status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All XCEL Training statuses
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

                    <Select
                        value={
                            filters.license_status === ''
                                ? 'all'
                                : filters.license_status
                        }
                        onValueChange={(status) =>
                            applyFilters(
                                {
                                    license_status:
                                        status === 'all' ? '' : status,
                                },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="License copy status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All license copy statuses
                            </SelectItem>
                            {Object.entries(LICENSE_STATUS_LABELS).map(
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
                            filters.ahip_status === ''
                                ? 'all'
                                : filters.ahip_status
                        }
                        onValueChange={(status) =>
                            applyFilters(
                                {
                                    ahip_status: status === 'all' ? '' : status,
                                },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="AHIP cert status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All AHIP cert statuses
                            </SelectItem>
                            {Object.entries(AHIP_STATUS_LABELS).map(
                                ([status, label]) => (
                                    <SelectItem key={status} value={status}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-sidebar-border/70 bg-muted/50 px-4 py-2 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">
                            {selectedIds.length} selected
                        </p>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBulkUpdateOpen(true)}
                        >
                            <ListChecks />
                            Bulk update
                        </Button>
                    </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="w-10 px-4 py-3">
                                    <Checkbox
                                        checked={allSelected}
                                        disabled={agents.data.length === 0}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all agents"
                                    />
                                </th>
                                <th className="px-4 py-3 font-medium">Agent</th>
                                <th className="px-4 py-3 font-medium">
                                    Eligibility
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Enrollment
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    XCEL Training
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Exam Scheduled
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Fingerprinting
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    License App
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    License Copy
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    AHIP Cert
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Contracting Stage
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
                                        <Checkbox
                                            checked={selectedIds.includes(
                                                agent.id,
                                            )}
                                            onCheckedChange={() =>
                                                toggleSelectOne(agent.id)
                                            }
                                            aria-label={`Select ${agent.name}`}
                                        />
                                    </td>
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
                                        <CompletionBadge
                                            label="Enrolled"
                                            completedAt={
                                                agent.eligibility_attestation
                                                    ?.enrollment_completed_at ??
                                                null
                                            }
                                            ready={
                                                agent.eligibility_attestation
                                                    ?.status === 'cleared'
                                            }
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
                                    <td className="px-4 py-3">
                                        <CompletionBadge
                                            label="Scheduled"
                                            completedAt={
                                                agent.eligibility_attestation
                                                    ?.exam_scheduled_at ?? null
                                            }
                                            ready={
                                                agent.training_completion
                                                    ?.status === 'verified'
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <CompletionBadge
                                            label="Completed"
                                            completedAt={
                                                agent.eligibility_attestation
                                                    ?.fingerprinting_completed_at ??
                                                null
                                            }
                                            ready={
                                                agent.eligibility_attestation
                                                    ?.exam_scheduled_at !== null
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <CompletionBadge
                                            label="Submitted"
                                            completedAt={
                                                agent.eligibility_attestation
                                                    ?.license_application_submitted_at ??
                                                null
                                            }
                                            ready={
                                                agent.eligibility_attestation
                                                    ?.fingerprinting_completed_at !==
                                                null
                                            }
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge
                                            status={
                                                agent.license_submission
                                                    ?.status ?? null
                                            }
                                            labels={LICENSE_STATUS_LABELS}
                                            classes={LICENSE_BADGE_CLASSES}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge
                                            status={
                                                agent.ahip_certification
                                                    ?.status ?? null
                                            }
                                            labels={AHIP_STATUS_LABELS}
                                            classes={AHIP_BADGE_CLASSES}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge
                                            status={highestContractingStage(
                                                agent.eligibility_attestation,
                                            )}
                                            labels={CONTRACTING_STAGE_LABELS}
                                            classes={CONTRACTING_STAGE_CLASSES}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setUpdatingAgentId(agent.id)
                                                }
                                            >
                                                <Pencil />
                                                Update
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link href={show(agent.id)}>
                                                    <Eye />
                                                    Review
                                                </Link>
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {agents.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={12}
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
                        license_status: filters.license_status,
                        ahip_status: filters.ahip_status,
                    }}
                />
            </div>

            <OnboardingUpdateDialog
                agent={updatingAgent}
                open={updatingAgentId !== null}
                onOpenChange={(open) =>
                    setUpdatingAgentId(open ? updatingAgentId : null)
                }
            />

            <OnboardingBulkUpdateDialog
                selectedCount={selectedIds.length}
                selectedIds={selectedIds}
                open={bulkUpdateOpen}
                onOpenChange={setBulkUpdateOpen}
                onSuccess={() => setSelectedIds([])}
            />
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
