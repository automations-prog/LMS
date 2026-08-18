import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CircleCheck,
    CircleX,
    FileText,
    Flag,
    MapPin,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import EligibilityReviewController from '@/actions/App/Http/Controllers/EligibilityReviewController';
import TrainingReviewController from '@/actions/App/Http/Controllers/TrainingReviewController';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';
import { index } from '@/routes/onboarding';

const ELIGIBILITY_STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    flagged_for_waiver: 'Flagged for waiver',
    cleared: 'Eligible',
    not_eligible: 'Not eligible',
};

const ELIGIBILITY_ACTIVE_CLASSES: Record<string, string> = {
    pending:
        'border-transparent bg-slate-600 text-white hover:bg-slate-600 dark:bg-slate-500',
    flagged_for_waiver:
        'border-transparent bg-amber-600 text-white hover:bg-amber-600 dark:bg-amber-500',
    cleared:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
    not_eligible:
        'border-transparent bg-red-600 text-white hover:bg-red-600 dark:bg-red-500',
};

const ELIGIBILITY_DECISION_OPTIONS: {
    value: string;
    label: string;
    icon: typeof Flag;
}[] = [
    { value: 'pending', label: 'Pending', icon: Calendar },
    { value: 'flagged_for_waiver', label: 'Flag for review', icon: Flag },
    { value: 'not_eligible', label: 'Not eligible', icon: ShieldAlert },
    { value: 'cleared', label: 'Eligible', icon: ShieldCheck },
];

const TRAINING_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

const TRAINING_ACTIVE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-600 text-white hover:bg-slate-600 dark:bg-slate-500',
    rejected:
        'border-transparent bg-red-600 text-white hover:bg-red-600 dark:bg-red-500',
    verified:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
};

const TRAINING_DECISION_OPTIONS: {
    value: string;
    label: string;
    icon: typeof Calendar;
}[] = [
    { value: 'pending_review', label: 'Pending review', icon: Calendar },
    { value: 'rejected', label: 'Rejected', icon: CircleX },
    { value: 'verified', label: 'Verified', icon: CircleCheck },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
});

function Field({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Calendar;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
            </div>
        </div>
    );
}

function NotSubmitted({ label }: { label: string }) {
    return (
        <p className="rounded-md border border-dashed border-sidebar-border/70 p-4 text-sm text-muted-foreground dark:border-sidebar-border">
            {label} not submitted yet.
        </p>
    );
}

type EligibilityAttestation = {
    id: number;
    status: string;
    date_of_birth: string;
    home_state: string;
    has_felony_conviction: boolean;
    felony_details: string | null;
    is_us_citizen: boolean;
    work_authorization_path: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewer: { name: string } | null;
};

type TrainingCompletion = {
    id: number;
    status: string;
    note: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewer: { name: string } | null;
};

type Agent = {
    id: number;
    name: string;
    email: string;
    eligibility_attestation: EligibilityAttestation | null;
    training_completion: TrainingCompletion | null;
};

type Props = {
    agent: Agent;
};

export default function OnboardingShow({ agent }: Props) {
    // `processing` from each Form render-prop is shared by that whole
    // <form>, not per-button — track which button was actually clicked so
    // only that one shows a spinner while the request is in flight.
    const [clickedEligibilityStatus, setClickedEligibilityStatus] = useState<
        string | null
    >(null);
    const [clickedTrainingStatus, setClickedTrainingStatus] = useState<
        string | null
    >(null);
    const getInitials = useInitials();

    const attestation = agent.eligibility_attestation;
    const completion = agent.training_completion;

    return (
        <>
            <Head title="Onboarding review" />

            <div className="mx-auto flex h-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <Link
                    href={index()}
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to onboarding review
                </Link>

                <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                        <AvatarFallback className="bg-gradient-to-br from-[#c774ff] to-[#8a5fae] font-semibold text-white">
                            {getInitials(agent.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{agent.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {agent.email}
                        </p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>Eligibility</CardTitle>
                                {attestation && (
                                    <Badge variant="outline">
                                        {ELIGIBILITY_STATUS_LABELS[
                                            attestation.status
                                        ] ?? attestation.status}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {!attestation ? (
                                <NotSubmitted label="Eligibility attestation" />
                            ) : (
                                <>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            icon={Calendar}
                                            label="Date of birth"
                                            value={dateFormatter.format(
                                                new Date(
                                                    attestation.date_of_birth,
                                                ),
                                            )}
                                        />
                                        <Field
                                            icon={MapPin}
                                            label="Home state"
                                            value={attestation.home_state}
                                        />
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                        <Field
                                            icon={ShieldAlert}
                                            label="Felony conviction"
                                            value={
                                                attestation.has_felony_conviction
                                                    ? 'Yes'
                                                    : 'No'
                                            }
                                        />
                                        {attestation.felony_details && (
                                            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                                {attestation.felony_details}
                                            </p>
                                        )}
                                    </div>

                                    <Separator />

                                    <div className="space-y-3">
                                        <Field
                                            icon={ShieldCheck}
                                            label="U.S. citizen"
                                            value={
                                                attestation.is_us_citizen
                                                    ? 'Yes'
                                                    : 'No'
                                            }
                                        />
                                        {attestation.work_authorization_path && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={
                                                        EligibilityReviewController.document(
                                                            attestation.id,
                                                        ).url
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <FileText />
                                                    View work authorization
                                                    document
                                                </a>
                                            </Button>
                                        )}
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        Submitted{' '}
                                        {dateFormatter.format(
                                            new Date(attestation.created_at),
                                        )}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Eligibility decision</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                The status can be changed at any time.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {!attestation ? (
                                <NotSubmitted label="Nothing to decide —" />
                            ) : (
                                <Form
                                    {...EligibilityReviewController.decision.form(
                                        attestation.id,
                                    )}
                                    className="space-y-5"
                                >
                                    {({ processing }) => (
                                        <>
                                            <div className="flex flex-col gap-3">
                                                {ELIGIBILITY_DECISION_OPTIONS.map(
                                                    ({
                                                        value,
                                                        label,
                                                        icon: Icon,
                                                    }) => {
                                                        const isActive =
                                                            attestation.status ===
                                                            value;

                                                        return (
                                                            <Button
                                                                key={value}
                                                                type="submit"
                                                                name="status"
                                                                value={value}
                                                                variant="outline"
                                                                size="lg"
                                                                className={
                                                                    isActive
                                                                        ? `w-full justify-start ${ELIGIBILITY_ACTIVE_CLASSES[value]}`
                                                                        : 'w-full justify-start'
                                                                }
                                                                disabled={
                                                                    processing ||
                                                                    isActive
                                                                }
                                                                onClick={() =>
                                                                    setClickedEligibilityStatus(
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                {processing &&
                                                                clickedEligibilityStatus ===
                                                                    value ? (
                                                                    <Spinner />
                                                                ) : (
                                                                    <Icon />
                                                                )}
                                                                {label}
                                                            </Button>
                                                        );
                                                    },
                                                )}
                                            </div>

                                            {attestation.reviewer && (
                                                <>
                                                    <Separator />
                                                    <p className="text-xs text-muted-foreground">
                                                        Last reviewed by{' '}
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                attestation
                                                                    .reviewer
                                                                    .name
                                                            }
                                                        </span>
                                                        {attestation.reviewed_at && (
                                                            <>
                                                                {' '}
                                                                on{' '}
                                                                {dateFormatter.format(
                                                                    new Date(
                                                                        attestation.reviewed_at,
                                                                    ),
                                                                )}
                                                            </>
                                                        )}
                                                    </p>
                                                </>
                                            )}
                                        </>
                                    )}
                                </Form>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>Training</CardTitle>
                                {completion && (
                                    <Badge variant="outline">
                                        {TRAINING_STATUS_LABELS[
                                            completion.status
                                        ] ?? completion.status}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {!completion ? (
                                <NotSubmitted label="Training certificate" />
                            ) : (
                                <>
                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href={
                                                TrainingReviewController.document(
                                                    completion.id,
                                                ).url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <FileText />
                                            View certificate
                                        </a>
                                    </Button>

                                    {completion.note && (
                                        <>
                                            <Separator />
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Note
                                                </p>
                                                <p
                                                    className={
                                                        completion.status ===
                                                        'rejected'
                                                            ? 'mt-1 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive'
                                                            : 'mt-1 text-sm'
                                                    }
                                                >
                                                    {completion.note}
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    <Separator />

                                    <p className="text-xs text-muted-foreground">
                                        Submitted{' '}
                                        {dateFormatter.format(
                                            new Date(completion.created_at),
                                        )}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Training decision</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                A note is required when rejecting.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {!completion ? (
                                <NotSubmitted label="Nothing to decide —" />
                            ) : (
                                <Form
                                    {...TrainingReviewController.decision.form(
                                        completion.id,
                                    )}
                                    className="space-y-5"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="note">
                                                    Note
                                                </Label>
                                                <Textarea
                                                    id="note"
                                                    name="note"
                                                    rows={3}
                                                    defaultValue={
                                                        completion.note ?? ''
                                                    }
                                                />
                                                <InputError
                                                    message={errors.note}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                {TRAINING_DECISION_OPTIONS.map(
                                                    ({
                                                        value,
                                                        label,
                                                        icon: Icon,
                                                    }) => {
                                                        const isActive =
                                                            completion.status ===
                                                            value;

                                                        return (
                                                            <Button
                                                                key={value}
                                                                type="submit"
                                                                name="status"
                                                                value={value}
                                                                variant="outline"
                                                                size="lg"
                                                                className={
                                                                    isActive
                                                                        ? `w-full justify-start ${TRAINING_ACTIVE_CLASSES[value]}`
                                                                        : 'w-full justify-start'
                                                                }
                                                                disabled={
                                                                    processing ||
                                                                    isActive
                                                                }
                                                                onClick={() =>
                                                                    setClickedTrainingStatus(
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                {processing &&
                                                                clickedTrainingStatus ===
                                                                    value ? (
                                                                    <Spinner />
                                                                ) : (
                                                                    <Icon />
                                                                )}
                                                                {label}
                                                            </Button>
                                                        );
                                                    },
                                                )}
                                            </div>

                                            {completion.reviewer && (
                                                <>
                                                    <Separator />
                                                    <p className="text-xs text-muted-foreground">
                                                        Last reviewed by{' '}
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                completion
                                                                    .reviewer
                                                                    .name
                                                            }
                                                        </span>
                                                        {completion.reviewed_at && (
                                                            <>
                                                                {' '}
                                                                on{' '}
                                                                {dateFormatter.format(
                                                                    new Date(
                                                                        completion.reviewed_at,
                                                                    ),
                                                                )}
                                                            </>
                                                        )}
                                                    </p>
                                                </>
                                            )}
                                        </>
                                    )}
                                </Form>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

OnboardingShow.layout = {
    breadcrumbs: [
        {
            title: 'Onboarding review',
            href: index(),
        },
        {
            title: 'Review',
            href: '#',
        },
    ],
};
