import { Form, Head, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import RoleplayAccessController from '@/actions/App/Http/Controllers/RoleplayAccessController';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { index } from '@/routes/roleplay/access';
import type { Paginator } from '@/types';

type AgentRow = {
    id: number;
    name: string;
    email: string;
    roleplay_enabled_at: string | null;
    roleplay_sessions_count: number;
    roleplay_sessions_max_overall_score: number | null;
};

type Props = {
    agents: Paginator<AgentRow>;
    filters: { search: string };
};

export default function RoleplayAccessIndex({ agents, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    function handleSearchChange(value: string) {
        setSearch(value);

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            router.get(
                index().url,
                { search: value },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 300);
    }

    return (
        <>
            <Head title="Sales Roleplay Coaching" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Sales Roleplay Coaching"
                    description="Grant agents access to the AI voice roleplay and keep an eye on how they're scoring."
                />

                <div className="relative max-w-xs">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search by name or email..."
                        className="pl-9"
                    />
                </div>

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="px-4 py-3 font-medium">
                                    Name
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Email
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Sessions
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Best score
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Access
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.data.map((agent) => {
                                const hasAccess =
                                    agent.roleplay_enabled_at !== null;

                                return (
                                    <tr
                                        key={agent.id}
                                        className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                    >
                                        <td className="px-4 py-3">
                                            {agent.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {agent.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            {agent.roleplay_sessions_count}
                                        </td>
                                        <td className="px-4 py-3">
                                            {agent.roleplay_sessions_max_overall_score !==
                                            null ? (
                                                `${agent.roleplay_sessions_max_overall_score}/100`
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        hasAccess
                                                            ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                                            : 'border-transparent bg-muted text-muted-foreground'
                                                    }
                                                >
                                                    {hasAccess
                                                        ? 'Enabled'
                                                        : 'Disabled'}
                                                </Badge>
                                                <Form
                                                    {...(hasAccess
                                                        ? RoleplayAccessController.revoke.form(
                                                              agent.id,
                                                          )
                                                        : RoleplayAccessController.grant.form(
                                                              agent.id,
                                                          ))}
                                                >
                                                    {({ processing }) => (
                                                        <Button
                                                            type="submit"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={
                                                                processing
                                                            }
                                                        >
                                                            {processing && (
                                                                <Spinner />
                                                            )}
                                                            {hasAccess
                                                                ? 'Revoke'
                                                                : 'Grant'}
                                                        </Button>
                                                    )}
                                                </Form>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {agents.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
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
                    filters={{ search: filters.search }}
                />
            </div>
        </>
    );
}

RoleplayAccessIndex.layout = {
    breadcrumbs: [
        {
            title: 'Sales Roleplay Coaching',
            href: index(),
        },
    ],
};
