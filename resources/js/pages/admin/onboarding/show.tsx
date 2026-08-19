import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Calendar,
    CalendarClock,
    CheckCircle2,
    CircleCheck,
    CircleX,
    FileCheck2,
    Fingerprint,
    FileText,
    Flag,
    MapPin,
    Monitor,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import AhipCertificationReviewController from '@/actions/App/Http/Controllers/AhipCertificationReviewController';
import EligibilityReviewController from '@/actions/App/Http/Controllers/EligibilityReviewController';
import LicenseReviewController from '@/actions/App/Http/Controllers/LicenseReviewController';
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

const LINE_OF_AUTHORITY_OPTIONS: { value: string; label: string; price: string }[] = [
    { value: 'life', label: 'Life only', price: '$34.95' },
    { value: 'health', label: 'Health only', price: '$34.95' },
    { value: 'life_and_health', label: 'Life and health', price: '$39.95' },
];

const PROCTORING_TYPE_OPTIONS: {
    value: string;
    label: string;
    icon: typeof Building2;
}[] = [
    { value: 'in_person', label: 'In-person', icon: Building2 },
    { value: 'remote', label: 'Remote', icon: Monitor },
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

const LICENSE_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

const LICENSE_ACTIVE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-600 text-white hover:bg-slate-600 dark:bg-slate-500',
    rejected:
        'border-transparent bg-red-600 text-white hover:bg-red-600 dark:bg-red-500',
    verified:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
};

const LICENSE_DECISION_OPTIONS: {
    value: string;
    label: string;
    icon: typeof Calendar;
}[] = [
    { value: 'pending_review', label: 'Pending review', icon: Calendar },
    { value: 'rejected', label: 'Rejected', icon: CircleX },
    { value: 'verified', label: 'Verified', icon: CircleCheck },
];

const AHIP_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

const AHIP_ACTIVE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-600 text-white hover:bg-slate-600 dark:bg-slate-500',
    rejected:
        'border-transparent bg-red-600 text-white hover:bg-red-600 dark:bg-red-500',
    verified:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
};

const AHIP_DECISION_OPTIONS: {
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
    enrollment_completed_at: string | null;
    line_of_authority: string | null;
    exam_scheduled_at: string | null;
    proctoring_type: string | null;
    fingerprinting_completed_at: string | null;
    license_application_submitted_at: string | null;
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

type LicenseSubmission = {
    id: number;
    status: string;
    note: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewer: { name: string } | null;
};

type AhipCertification = {
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
    license_submission: LicenseSubmission | null;
    ahip_certification: AhipCertification | null;
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
    const [clickedLicenseStatus, setClickedLicenseStatus] = useState<
        string | null
    >(null);
    const [clickedAhipStatus, setClickedAhipStatus] = useState<string | null>(
        null,
    );
    const getInitials = useInitials();

    const [lineOfAuthority, setLineOfAuthority] = useState(
        agent.eligibility_attestation?.line_of_authority ?? '',
    );
    const [proctoringType, setProctoringType] = useState(
        agent.eligibility_attestation?.proctoring_type ?? '',
    );

    const attestation = agent.eligibility_attestation;
    const completion = agent.training_completion;
    const submission = agent.license_submission;
    const certification = agent.ahip_certification;

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

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>Enrollment</CardTitle>
                                <Badge
                                    variant="outline"
                                    className={
                                        attestation?.enrollment_completed_at
                                            ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                            : 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400'
                                    }
                                >
                                    {attestation?.enrollment_completed_at
                                        ? 'Enrolled'
                                        : 'Not yet'}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <Field
                                icon={CheckCircle2}
                                label="XCEL enrollment status"
                                value={
                                    attestation?.enrollment_completed_at ? (
                                        `Enrolled on ${dateFormatter.format(
                                            new Date(
                                                attestation.enrollment_completed_at,
                                            ),
                                        )}`
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not yet marked as enrolled
                                        </span>
                                    )
                                }
                            />

                            {attestation && (
                                <>
                                    <Separator />

                                    <Form
                                        {...EligibilityReviewController.updateLineOfAuthority.form(
                                            attestation.id,
                                        )}
                                        className="space-y-3"
                                    >
                                        {({ processing, errors }) => (
                                            <>
                                                <div className="grid w-full gap-2">
                                                    <Label>
                                                        Line of authority
                                                    </Label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {LINE_OF_AUTHORITY_OPTIONS.map(
                                                            (option) => (
                                                                <button
                                                                    key={
                                                                        option.value
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setLineOfAuthority(
                                                                            option.value,
                                                                        )
                                                                    }
                                                                    aria-pressed={
                                                                        lineOfAuthority ===
                                                                        option.value
                                                                    }
                                                                    className={
                                                                        lineOfAuthority ===
                                                                        option.value
                                                                            ? 'rounded-md border border-primary bg-primary/5 px-3 py-2 text-left ring-1 ring-primary'
                                                                            : 'rounded-md border px-3 py-2 text-left hover:border-primary/50'
                                                                    }
                                                                >
                                                                    <p className="text-sm font-medium">
                                                                        {
                                                                            option.label
                                                                        }
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {
                                                                            option.price
                                                                        }
                                                                    </p>
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                    <input
                                                        type="hidden"
                                                        name="line_of_authority"
                                                        value={
                                                            lineOfAuthority
                                                        }
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.line_of_authority
                                                        }
                                                    />
                                                </div>
                                                {lineOfAuthority !==
                                                    (attestation.line_of_authority ??
                                                        '') && (
                                                    <div className="flex justify-start">
                                                        <Button
                                                            type="submit"
                                                            disabled={
                                                                processing ||
                                                                !lineOfAuthority
                                                            }
                                                        >
                                                            {processing && (
                                                                <Spinner />
                                                            )}
                                                            Save
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </Form>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {attestation?.enrollment_completed_at && (
                    <>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>XCEL Training</CardTitle>
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
                                <NotSubmitted label="XCEL Training certificate" />
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
                            <CardTitle>XCEL Training decision</CardTitle>
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

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>Exam</CardTitle>
                                <Badge
                                    variant="outline"
                                    className={
                                        attestation?.exam_scheduled_at
                                            ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                            : 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400'
                                    }
                                >
                                    {attestation?.exam_scheduled_at
                                        ? 'Scheduled'
                                        : 'Not yet'}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <Field
                                icon={CalendarClock}
                                label="State exam status"
                                value={
                                    attestation?.exam_scheduled_at ? (
                                        `Scheduled on ${dateFormatter.format(
                                            new Date(
                                                attestation.exam_scheduled_at,
                                            ),
                                        )}`
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not yet scheduled
                                        </span>
                                    )
                                }
                            />

                            {attestation && (
                                <>
                                    <Separator />

                                    <Form
                                        {...EligibilityReviewController.updateExamSchedule.form(
                                            attestation.id,
                                        )}
                                        className="space-y-3"
                                    >
                                        {({ processing, errors }) => (
                                            <>
                                                <div className="grid w-full gap-2">
                                                    <Label>
                                                        Proctoring type
                                                    </Label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {PROCTORING_TYPE_OPTIONS.map(
                                                            (option) => (
                                                                <button
                                                                    key={
                                                                        option.value
                                                                    }
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setProctoringType(
                                                                            option.value,
                                                                        )
                                                                    }
                                                                    aria-pressed={
                                                                        proctoringType ===
                                                                        option.value
                                                                    }
                                                                    className={
                                                                        proctoringType ===
                                                                        option.value
                                                                            ? 'flex items-center gap-2 rounded-md border border-primary bg-primary/5 px-3 py-2.5 text-left ring-1 ring-primary'
                                                                            : 'flex items-center gap-2 rounded-md border px-3 py-2.5 text-left hover:border-primary/50'
                                                                    }
                                                                >
                                                                    <option.icon className="size-4 shrink-0 text-muted-foreground" />
                                                                    <span className="text-sm font-medium">
                                                                        {
                                                                            option.label
                                                                        }
                                                                    </span>
                                                                </button>
                                                            ),
                                                        )}
                                                    </div>
                                                    <input
                                                        type="hidden"
                                                        name="proctoring_type"
                                                        value={
                                                            proctoringType
                                                        }
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.proctoring_type
                                                        }
                                                    />
                                                </div>
                                                {proctoringType !==
                                                    (attestation.proctoring_type ??
                                                        '') && (
                                                    <div className="flex justify-start">
                                                        <Button
                                                            type="submit"
                                                            disabled={
                                                                processing ||
                                                                !proctoringType
                                                            }
                                                        >
                                                            {processing && (
                                                                <Spinner />
                                                            )}
                                                            Save
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </Form>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>Fingerprinting</CardTitle>
                                <Badge
                                    variant="outline"
                                    className={
                                        attestation?.fingerprinting_completed_at
                                            ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                            : 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400'
                                    }
                                >
                                    {attestation?.fingerprinting_completed_at
                                        ? 'Completed'
                                        : 'Not yet'}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <Field
                                icon={Fingerprint}
                                label="Fingerprinting / background check status"
                                value={
                                    attestation?.fingerprinting_completed_at ? (
                                        `Completed on ${dateFormatter.format(
                                            new Date(
                                                attestation.fingerprinting_completed_at,
                                            ),
                                        )}`
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not yet completed
                                        </span>
                                    )
                                }
                            />
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>License Application</CardTitle>
                                <Badge
                                    variant="outline"
                                    className={
                                        attestation?.license_application_submitted_at
                                            ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                            : 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400'
                                    }
                                >
                                    {attestation?.license_application_submitted_at
                                        ? 'Submitted'
                                        : 'Not yet'}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <Field
                                icon={FileCheck2}
                                label="License application status"
                                value={
                                    attestation?.license_application_submitted_at ? (
                                        `Submitted on ${dateFormatter.format(
                                            new Date(
                                                attestation.license_application_submitted_at,
                                            ),
                                        )}`
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Not yet submitted
                                        </span>
                                    )
                                }
                            />
                        </CardContent>
                    </Card>

                    {attestation?.license_application_submitted_at && (
                    <>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>License Copy</CardTitle>
                                {submission && (
                                    <Badge variant="outline">
                                        {LICENSE_STATUS_LABELS[
                                            submission.status
                                        ] ?? submission.status}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {!submission ? (
                                <NotSubmitted label="License copy" />
                            ) : (
                                <>
                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href={
                                                LicenseReviewController.document(
                                                    submission.id,
                                                ).url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <FileText />
                                            View license copy
                                        </a>
                                    </Button>

                                    {submission.note && (
                                        <>
                                            <Separator />
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Note
                                                </p>
                                                <p
                                                    className={
                                                        submission.status ===
                                                        'rejected'
                                                            ? 'mt-1 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive'
                                                            : 'mt-1 text-sm'
                                                    }
                                                >
                                                    {submission.note}
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    <Separator />

                                    <p className="text-xs text-muted-foreground">
                                        Submitted{' '}
                                        {dateFormatter.format(
                                            new Date(submission.created_at),
                                        )}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>License Copy decision</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                A note is required when rejecting.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {!submission ? (
                                <NotSubmitted label="Nothing to decide —" />
                            ) : (
                                <Form
                                    {...LicenseReviewController.decision.form(
                                        submission.id,
                                    )}
                                    className="space-y-5"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="license-note">
                                                    Note
                                                </Label>
                                                <Textarea
                                                    id="license-note"
                                                    name="note"
                                                    rows={3}
                                                    defaultValue={
                                                        submission.note ?? ''
                                                    }
                                                />
                                                <InputError
                                                    message={errors.note}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                {LICENSE_DECISION_OPTIONS.map(
                                                    ({
                                                        value,
                                                        label,
                                                        icon: Icon,
                                                    }) => {
                                                        const isActive =
                                                            submission.status ===
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
                                                                        ? `w-full justify-start ${LICENSE_ACTIVE_CLASSES[value]}`
                                                                        : 'w-full justify-start'
                                                                }
                                                                disabled={
                                                                    processing ||
                                                                    isActive
                                                                }
                                                                onClick={() =>
                                                                    setClickedLicenseStatus(
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                {processing &&
                                                                clickedLicenseStatus ===
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

                                            {submission.reviewer && (
                                                <>
                                                    <Separator />
                                                    <p className="text-xs text-muted-foreground">
                                                        Last reviewed by{' '}
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                submission
                                                                    .reviewer
                                                                    .name
                                                            }
                                                        </span>
                                                        {submission.reviewed_at && (
                                                            <>
                                                                {' '}
                                                                on{' '}
                                                                {dateFormatter.format(
                                                                    new Date(
                                                                        submission.reviewed_at,
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

                    {submission?.status === 'verified' && (
                    <>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>AHIP Certification</CardTitle>
                                {certification && (
                                    <Badge variant="outline">
                                        {AHIP_STATUS_LABELS[
                                            certification.status
                                        ] ?? certification.status}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            {!certification ? (
                                <NotSubmitted label="AHIP completion certificate" />
                            ) : (
                                <>
                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href={
                                                AhipCertificationReviewController.document(
                                                    certification.id,
                                                ).url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <FileText />
                                            View certificate
                                        </a>
                                    </Button>

                                    {certification.note && (
                                        <>
                                            <Separator />
                                            <div>
                                                <p className="text-xs text-muted-foreground">
                                                    Note
                                                </p>
                                                <p
                                                    className={
                                                        certification.status ===
                                                        'rejected'
                                                            ? 'mt-1 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive'
                                                            : 'mt-1 text-sm'
                                                    }
                                                >
                                                    {certification.note}
                                                </p>
                                            </div>
                                        </>
                                    )}

                                    <Separator />

                                    <p className="text-xs text-muted-foreground">
                                        Submitted{' '}
                                        {dateFormatter.format(
                                            new Date(
                                                certification.created_at,
                                            ),
                                        )}
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>
                                AHIP Certification decision
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                A note is required when rejecting.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {!certification ? (
                                <NotSubmitted label="Nothing to decide —" />
                            ) : (
                                <Form
                                    {...AhipCertificationReviewController.decision.form(
                                        certification.id,
                                    )}
                                    className="space-y-5"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="ahip-note">
                                                    Note
                                                </Label>
                                                <Textarea
                                                    id="ahip-note"
                                                    name="note"
                                                    rows={3}
                                                    defaultValue={
                                                        certification.note ??
                                                        ''
                                                    }
                                                />
                                                <InputError
                                                    message={errors.note}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                {AHIP_DECISION_OPTIONS.map(
                                                    ({
                                                        value,
                                                        label,
                                                        icon: Icon,
                                                    }) => {
                                                        const isActive =
                                                            certification.status ===
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
                                                                        ? `w-full justify-start ${AHIP_ACTIVE_CLASSES[value]}`
                                                                        : 'w-full justify-start'
                                                                }
                                                                disabled={
                                                                    processing ||
                                                                    isActive
                                                                }
                                                                onClick={() =>
                                                                    setClickedAhipStatus(
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                {processing &&
                                                                clickedAhipStatus ===
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

                                            {certification.reviewer && (
                                                <>
                                                    <Separator />
                                                    <p className="text-xs text-muted-foreground">
                                                        Last reviewed by{' '}
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                certification
                                                                    .reviewer
                                                                    .name
                                                            }
                                                        </span>
                                                        {certification.reviewed_at && (
                                                            <>
                                                                {' '}
                                                                on{' '}
                                                                {dateFormatter.format(
                                                                    new Date(
                                                                        certification.reviewed_at,
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
                    </>
                    )}
                    </>
                    )}
                    </>
                    )}
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
