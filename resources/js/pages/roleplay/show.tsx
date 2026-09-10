import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useRoleplayCall } from '@/hooks/use-roleplay-call';
import { dateFormatter } from '@/lib/onboarding-decisions';
import { index } from '@/routes/roleplay';
import type {
    RoleplayRubricCriterion,
    RoleplaySession,
} from '@/types/roleplay';

type Props = {
    session: RoleplaySession;
    scenario: { title: string; rubric: RoleplayRubricCriterion[] };
    isOwner: boolean;
};

function TranscriptList({
    entries,
}: {
    entries: RoleplaySession['transcript'];
}) {
    if (!entries || entries.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                No transcript captured for this call.
            </p>
        );
    }

    return (
        <ol className="space-y-3">
            {entries.map((entry, index) => (
                <li
                    key={index}
                    className={
                        entry.role === 'agent'
                            ? 'ml-auto max-w-[85%] rounded-lg bg-primary/10 px-3 py-2 text-sm'
                            : 'mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm'
                    }
                >
                    <p className="mb-0.5 text-xs font-medium text-muted-foreground">
                        {entry.role === 'agent' ? 'You' : 'Prospect'}
                    </p>
                    <p>{entry.text}</p>
                </li>
            ))}
        </ol>
    );
}

function LiveCall({ session }: { session: RoleplaySession }) {
    const { status, transcript, errorMessage, connect, hangUp, audioRef } =
        useRoleplayCall(session.id);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <CardTitle>Live call</CardTitle>
                    {status === 'connected' && (
                        <Badge
                            variant="outline"
                            className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        >
                            <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
                            Connected
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <audio ref={audioRef} autoPlay hidden />

                {errorMessage && (
                    <Alert variant="destructive">
                        <AlertTitle>Something went wrong</AlertTitle>
                        <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                )}

                {status === 'idle' || status === 'error' ? (
                    <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-sidebar-border/70 p-6 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">
                            You&apos;ll be connected with an AI prospect over
                            voice. Make sure your microphone is ready, then
                            start the call.
                        </p>
                        <Button onClick={connect}>
                            <Mic />
                            Start call
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between rounded-md border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {status === 'requesting_mic' && (
                                    <>
                                        <Spinner />
                                        Requesting microphone access…
                                    </>
                                )}
                                {status === 'connecting' && (
                                    <>
                                        <Spinner />
                                        Connecting…
                                    </>
                                )}
                                {status === 'connected' && (
                                    <>
                                        <Mic className="size-4" />
                                        Call in progress — speak naturally.
                                    </>
                                )}
                                {(status === 'ending' ||
                                    status === 'ended') && (
                                    <>
                                        <MicOff className="size-4" />
                                        Ending call…
                                    </>
                                )}
                            </div>

                            {status === 'connected' && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={hangUp}
                                >
                                    <PhoneOff />
                                    Hang up
                                </Button>
                            )}
                        </div>

                        <div className="max-h-96 overflow-y-auto rounded-md border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                            <TranscriptList entries={transcript} />
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function ScoringInProgress({ session }: { session: RoleplaySession }) {
    // Scoring runs in a background job — poll for the session to move to
    // `scored` (or `failed`) instead of leaving the agent on a dead page.
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['session'] });
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    return (
        <Card>
            <CardContent className="flex items-center gap-3 py-8">
                <Spinner className="size-5" />
                <div>
                    <p className="text-sm font-medium">
                        Scoring your call…
                    </p>
                    <p className="text-sm text-muted-foreground">
                        This usually takes a few seconds. This page will
                        update automatically.
                    </p>
                </div>
            </CardContent>
            <CardContent className="border-t border-sidebar-border/70 pt-6 dark:border-sidebar-border">
                <TranscriptList entries={session.transcript} />
            </CardContent>
        </Card>
    );
}

function ScoreBreakdown({
    session,
    rubric,
}: {
    session: RoleplaySession;
    rubric: RoleplayRubricCriterion[];
}) {
    if (!session.score) {
        return null;
    }

    const { score } = session;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-4">
                    <CardTitle>Score</CardTitle>
                    <span className="text-2xl font-semibold">
                        {score.overall_score}
                        <span className="text-sm font-normal text-muted-foreground">
                            /100
                        </span>
                    </span>
                </div>
                <p className="text-sm text-muted-foreground">
                    {score.summary}
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {score.criteria.map((criterion) => {
                    const label =
                        rubric.find((r) => r.key === criterion.key)?.label ??
                        criterion.key;

                    return (
                        <div key={criterion.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-medium">
                                    {label}
                                </p>
                                <span className="text-sm font-semibold">
                                    {criterion.score}/5
                                </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-primary"
                                    style={{
                                        width: `${(criterion.score / 5) * 100}%`,
                                    }}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {criterion.feedback}
                            </p>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

export default function RoleplayShow({ session, scenario, isOwner }: Props) {
    return (
        <>
            <Head title={scenario.title} />

            <div className="mx-auto flex h-full max-w-3xl flex-1 flex-col gap-4 p-4">
                <Link
                    href={index()}
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to Sales Roleplay
                </Link>

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="font-semibold">{scenario.title}</p>
                        <p className="text-sm text-muted-foreground">
                            {dateFormatter.format(
                                new Date(session.created_at),
                            )}
                        </p>
                    </div>
                </div>

                {session.status === 'in_progress' &&
                    (isOwner ? (
                        <LiveCall session={session} />
                    ) : (
                        <Card>
                            <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                                <Phone className="size-4" />
                                This call is still in progress.
                            </CardContent>
                        </Card>
                    ))}

                {session.status === 'completed' && (
                    <ScoringInProgress session={session} />
                )}

                {session.status === 'scored' && (
                    <>
                        <ScoreBreakdown
                            session={session}
                            rubric={scenario.rubric}
                        />
                        <Card>
                            <CardHeader>
                                <CardTitle>Transcript</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TranscriptList
                                    entries={session.transcript}
                                />
                            </CardContent>
                        </Card>
                    </>
                )}

                {session.status === 'failed' && (
                    <Alert variant="destructive">
                        <AlertTitle>Scoring failed</AlertTitle>
                        <AlertDescription>
                            {session.failure_reason ??
                                'Something went wrong scoring this call. Please try starting a new one.'}
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </>
    );
}

RoleplayShow.layout = {
    breadcrumbs: [
        {
            title: 'Sales Roleplay',
            href: index(),
        },
        {
            title: 'Call',
            href: '#',
        },
    ],
};
