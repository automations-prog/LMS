import { Form, Head, Link } from '@inertiajs/react';
import { Clock, Lock, Mic, Phone } from 'lucide-react';
import RoleplayController from '@/actions/App/Http/Controllers/RoleplayController';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { dateFormatter } from '@/lib/onboarding-decisions';
import { index } from '@/routes/roleplay';
import { show } from '@/routes/roleplay/sessions';
import type { Paginator } from '@/types';
import type { RoleplaySession, RoleplaySessionStatus } from '@/types/roleplay';

const STATUS_LABELS: Record<RoleplaySessionStatus, string> = {
    in_progress: 'In progress',
    completed: 'Scoring…',
    scored: 'Scored',
    failed: 'Failed',
};

const STATUS_BADGE_CLASSES: Record<RoleplaySessionStatus, string> = {
    in_progress:
        'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    completed:
        'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    scored: 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    failed: 'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

type Props = {
    enabled: boolean;
    verticalAvailable: boolean;
    scenario: { title: string; summary: string } | null;
    sessions: Paginator<RoleplaySession>;
};

export default function RoleplayIndex({
    enabled,
    verticalAvailable,
    scenario,
    sessions,
}: Props) {
    return (
        <>
            <Head title="Sales Roleplay" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Sales Roleplay"
                    description="Practice live sales calls against an AI prospect and get scored on how you handle common objections."
                />

                <Card>
                    {scenario && (
                        <CardHeader>
                            <CardTitle>{scenario.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {scenario.summary}
                            </p>
                        </CardHeader>
                    )}
                    <CardContent>
                        {!verticalAvailable ? (
                            <div className="flex items-start gap-3 rounded-md border border-dashed border-sidebar-border/70 p-4 text-sm text-muted-foreground dark:border-sidebar-border">
                                <Clock className="mt-0.5 size-4 shrink-0" />
                                <p>
                                    Roleplay isn&apos;t available for your
                                    segment yet — we&apos;re starting with
                                    Medicare scripts and expanding from there.
                                </p>
                            </div>
                        ) : enabled ? (
                            <Form {...RoleplayController.store.form()}>
                                {({ processing }) => (
                                    <Button type="submit" disabled={processing}>
                                        {processing ? <Spinner /> : <Phone />}
                                        Start roleplay call
                                    </Button>
                                )}
                            </Form>
                        ) : (
                            <div className="flex items-start gap-3 rounded-md border border-dashed border-sidebar-border/70 p-4 text-sm text-muted-foreground dark:border-sidebar-border">
                                <Lock className="mt-0.5 size-4 shrink-0" />
                                <p>
                                    Roleplay access hasn&apos;t been enabled for
                                    your account yet. Ask an admin to turn it on
                                    for you.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Your calls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {sessions.data.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                {enabled
                                    ? "You haven't started a roleplay call yet."
                                    : 'No calls yet.'}
                            </p>
                        ) : (
                            <ul className="divide-y divide-sidebar-border/70 dark:divide-sidebar-border">
                                {sessions.data.map((session) => (
                                    <li key={session.id} className="py-3">
                                        <Link
                                            href={show(session.id)}
                                            className="flex items-center justify-between gap-4 hover:opacity-80"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Mic className="size-4 shrink-0 text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {dateFormatter.format(
                                                            new Date(
                                                                session.created_at,
                                                            ),
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {session.overall_score !==
                                                    null && (
                                                    <span className="text-sm font-semibold">
                                                        {session.overall_score}
                                                        /100
                                                    </span>
                                                )}
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        STATUS_BADGE_CLASSES[
                                                            session.status
                                                        ]
                                                    }
                                                >
                                                    {
                                                        STATUS_LABELS[
                                                            session.status
                                                        ]
                                                    }
                                                </Badge>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <DataPagination paginator={sessions} />
            </div>
        </>
    );
}

RoleplayIndex.layout = {
    breadcrumbs: [
        {
            title: 'Sales Roleplay',
            href: index(),
        },
    ],
};
