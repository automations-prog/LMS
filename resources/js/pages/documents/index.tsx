import { Head, Link } from '@inertiajs/react';
import {
    Award,
    ExternalLink,
    FileText,
    GraduationCap,
    IdCard,
    ShieldCheck,
    TriangleAlert,
} from 'lucide-react';
import type { ComponentType } from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AHIP_STATUS_LABELS,
    dateFormatter,
    ELIGIBILITY_STATUS_LABELS,
    LICENSE_STATUS_LABELS,
    TRAINING_STATUS_LABELS,
} from '@/lib/onboarding-decisions';
import { dashboard } from '@/routes';

type DocumentEntry = {
    status: string;
    submitted_at: string;
    reviewed_at: string | null;
    note: string | null;
    expires_at: string | null;
    document_url: string | null;
} | null;

type Props = {
    documents: {
        eligibility: DocumentEntry;
        training: DocumentEntry;
        license: DocumentEntry;
        ahip: DocumentEntry;
    };
};

const GOOD_STATUSES = new Set(['cleared', 'verified']);
const BAD_STATUSES = new Set(['not_eligible', 'rejected']);

function statusToneClasses(status: string): string {
    if (GOOD_STATUSES.has(status)) {
        return 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
    }

    if (BAD_STATUSES.has(status)) {
        return 'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
    }

    return 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400';
}

const EXPIRY_WARNING_DAYS = 30;

function daysUntil(dateStr: string): number {
    const target = new Date(`${dateStr}T00:00:00`).getTime();

    return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

const SECTIONS: {
    key: keyof Props['documents'];
    title: string;
    icon: ComponentType<{ className?: string }>;
    labels: Record<string, string>;
    notSubmittedLabel: string;
}[] = [
    {
        key: 'eligibility',
        title: 'Eligibility Attestation',
        icon: IdCard,
        labels: ELIGIBILITY_STATUS_LABELS,
        notSubmittedLabel: 'Not submitted yet',
    },
    {
        key: 'training',
        title: 'XCEL Training Certificate',
        icon: GraduationCap,
        labels: TRAINING_STATUS_LABELS,
        notSubmittedLabel: 'No certificate uploaded yet',
    },
    {
        key: 'license',
        title: 'License Copy',
        icon: ShieldCheck,
        labels: LICENSE_STATUS_LABELS,
        notSubmittedLabel: 'No license copy uploaded yet',
    },
    {
        key: 'ahip',
        title: 'AHIP Certification',
        icon: Award,
        labels: AHIP_STATUS_LABELS,
        notSubmittedLabel: 'No certificate uploaded yet',
    },
];

export default function DocumentsIndex({ documents }: Props) {
    return (
        <>
            <Head title="Your documents" />

            <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Your documents"
                    description="Every document you've submitted for onboarding, its review status, and where things stand — all in one place."
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    {SECTIONS.map(
                        ({
                            key,
                            title,
                            icon: Icon,
                            labels,
                            notSubmittedLabel,
                        }) => {
                            const entry = documents[key];
                            const expiryDays = entry?.expires_at
                                ? daysUntil(entry.expires_at)
                                : null;
                            const expiringSoon =
                                expiryDays !== null &&
                                expiryDays <= EXPIRY_WARNING_DAYS;

                            return (
                                <Card key={key}>
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <Icon className="size-4 text-muted-foreground" />
                                                {title}
                                            </CardTitle>
                                            {entry && (
                                                <Badge
                                                    variant="outline"
                                                    className={statusToneClasses(
                                                        entry.status,
                                                    )}
                                                >
                                                    {labels[entry.status] ??
                                                        entry.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {!entry ? (
                                            <p className="text-sm text-muted-foreground">
                                                {notSubmittedLabel}
                                            </p>
                                        ) : (
                                            <>
                                                <dl className="space-y-1 text-sm">
                                                    <div className="flex justify-between gap-4">
                                                        <dt className="text-muted-foreground">
                                                            Submitted
                                                        </dt>
                                                        <dd>
                                                            {dateFormatter.format(
                                                                new Date(
                                                                    entry.submitted_at,
                                                                ),
                                                            )}
                                                        </dd>
                                                    </div>
                                                    {entry.reviewed_at && (
                                                        <div className="flex justify-between gap-4">
                                                            <dt className="text-muted-foreground">
                                                                Reviewed
                                                            </dt>
                                                            <dd>
                                                                {dateFormatter.format(
                                                                    new Date(
                                                                        entry.reviewed_at,
                                                                    ),
                                                                )}
                                                            </dd>
                                                        </div>
                                                    )}
                                                    {entry.expires_at && (
                                                        <div className="flex justify-between gap-4">
                                                            <dt className="text-muted-foreground">
                                                                Expires
                                                            </dt>
                                                            <dd
                                                                className={
                                                                    expiringSoon
                                                                        ? 'font-medium text-destructive'
                                                                        : undefined
                                                                }
                                                            >
                                                                {dateFormatter.format(
                                                                    new Date(
                                                                        entry.expires_at,
                                                                    ),
                                                                )}
                                                            </dd>
                                                        </div>
                                                    )}
                                                </dl>

                                                {expiringSoon && (
                                                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                                                        <TriangleAlert className="size-3.5 shrink-0" />
                                                        {expiryDays! < 0
                                                            ? 'This has expired.'
                                                            : `Expires in ${expiryDays} day${expiryDays === 1 ? '' : 's'}.`}
                                                    </p>
                                                )}

                                                {entry.note && (
                                                    <p className="rounded-md border border-dashed border-sidebar-border/70 p-2 text-xs text-muted-foreground dark:border-sidebar-border">
                                                        “{entry.note}”
                                                    </p>
                                                )}

                                                {entry.document_url && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a
                                                            href={
                                                                entry.document_url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <FileText />
                                                            View document
                                                            <ExternalLink className="size-3.5" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        },
                    )}
                </div>

                <p className="text-sm text-muted-foreground">
                    Need to submit or replace a document? Head back to your{' '}
                    <Link
                        href={dashboard()}
                        className="font-medium text-foreground underline underline-offset-4"
                    >
                        dashboard
                    </Link>{' '}
                    — each onboarding step there has its own upload.
                </p>
            </div>
        </>
    );
}

DocumentsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Your documents',
            href: '#',
        },
    ],
};
