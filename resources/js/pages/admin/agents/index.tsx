import { Head, router } from '@inertiajs/react';
import { Search, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { index } from '@/routes/agents';
import type { Paginator } from '@/types';
import type { OnboardingAgent } from '@/types/onboarding';

// Every row in this list has already cleared all four review stages, so
// there's nothing to badge conditionally here — just show the completion
// date for each stage (or a dash if a stage's timestamp isn't tracked).
const VERIFIED_BADGE_CLASSES =
    'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';

function VerifiedBadge() {
    return (
        <Badge variant="outline" className={VERIFIED_BADGE_CLASSES}>
            Verified
        </Badge>
    );
}

function formatDate(value: string | null) {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

type AgentRow = OnboardingAgent;

type Filters = {
    search: string;
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

// Both invite dialogs below are UI-only confirmations — there's no Slack
// API integration and nothing is persisted, so confirming just closes the
// dialog and surfaces a toast.

function InviteAgentDialog({
    agent,
    open,
    onOpenChange,
}: {
    agent: AgentRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    function handleConfirm() {
        if (agent) {
            toast.success(`Invited ${agent.name} to Slack.`);
        }

        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Invite {agent?.name} to Slack?</DialogTitle>
                <DialogDescription>
                    This sends {agent?.name} ({agent?.email}) a Slack
                    workspace invite.
                </DialogDescription>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </DialogClose>

                    <Button onClick={handleConfirm}>
                        <Send />
                        Invite to Slack
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BulkInviteDialog({
    agents,
    open,
    onOpenChange,
    onConfirmed,
}: {
    agents: AgentRow[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirmed: () => void;
}) {
    function handleConfirm() {
        toast.success(
            `Invited ${agents.length} agent${agents.length === 1 ? '' : 's'} to Slack.`,
        );

        onConfirmed();
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>
                    Invite {agents.length} agent
                    {agents.length === 1 ? '' : 's'} to Slack?
                </DialogTitle>
                <DialogDescription asChild>
                    {agents.length <= 5 ? (
                        <ul className="list-inside list-disc">
                            {agents.map((agent) => (
                                <li key={agent.id}>
                                    {agent.name} ({agent.email})
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <span>
                            This sends a Slack workspace invite to all{' '}
                            {agents.length} selected agents.
                        </span>
                    )}
                </DialogDescription>

                <DialogFooter className="gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary">Cancel</Button>
                    </DialogClose>

                    <Button onClick={handleConfirm}>
                        <Send />
                        Invite to Slack
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function VerifiedAgentsIndex({ agents, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [invitingAgent, setInvitingAgent] = useState<AgentRow | null>(null);
    const [bulkInviteOpen, setBulkInviteOpen] = useState(false);

    const selectedAgents = agents.data.filter((agent) =>
        selectedIds.includes(agent.id),
    );

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
            <Head title="Verified agents" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Verified agents"
                    description="Agents who have completed the full onboarding, licensing, and contracting pipeline"
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
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-sidebar-border/70 bg-muted/50 px-4 py-2 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">
                            {selectedIds.length} selected
                        </p>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBulkInviteOpen(true)}
                        >
                            <Send />
                            Invite to Slack
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
                                    XCEL Training
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    License Copy
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    AHIP Cert
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Contracting complete
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
                                        <VerifiedBadge />
                                    </td>
                                    <td className="px-4 py-3">
                                        <VerifiedBadge />
                                    </td>
                                    <td className="px-4 py-3">
                                        <VerifiedBadge />
                                    </td>
                                    <td className="px-4 py-3">
                                        <VerifiedBadge />
                                    </td>
                                    <td className="px-4 py-3">
                                        {formatDate(
                                            agent.eligibility_attestation
                                                ?.contracting_complete_at ??
                                                null,
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setInvitingAgent(agent)
                                            }
                                        >
                                            <Send />
                                            Invite to Slack
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {agents.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No verified agents found.
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
                    }}
                />
            </div>

            <InviteAgentDialog
                agent={invitingAgent}
                open={invitingAgent !== null}
                onOpenChange={(open) =>
                    setInvitingAgent(open ? invitingAgent : null)
                }
            />

            <BulkInviteDialog
                agents={selectedAgents}
                open={bulkInviteOpen}
                onOpenChange={setBulkInviteOpen}
                onConfirmed={() => setSelectedIds([])}
            />
        </>
    );
}

VerifiedAgentsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Verified agents',
            href: index(),
        },
    ],
};
