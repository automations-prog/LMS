import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    Calendar,
    CalendarClock,
    CheckCircle2,
    FileCheck2,
    Fingerprint,
    FileText,
    LineChart,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';
import {
    AHIP_ACTIVE_CLASSES,
    AHIP_DECISION_OPTIONS,
    AHIP_STATUS_LABELS,
    dateFormatter,
    ELIGIBILITY_ACTIVE_CLASSES,
    ELIGIBILITY_DECISION_OPTIONS,
    ELIGIBILITY_STATUS_LABELS,
    isContractingStageDisabled,
    LICENSE_ACTIVE_CLASSES,
    LICENSE_DECISION_OPTIONS,
    LICENSE_STATUS_LABELS,
    toggleContractingStage,
    TRAINING_ACTIVE_CLASSES,
    TRAINING_DECISION_OPTIONS,
    TRAINING_STATUS_LABELS,
} from '@/lib/onboarding-decisions';
import { index } from '@/routes/onboarding';
import { showForUser as trainingProgressShowForUser } from '@/routes/training-progress';
import type { OnboardingAgent } from '@/types/onboarding';

const LINE_OF_AUTHORITY_OPTIONS: {
    value: string;
    label: string;
    price: string;
}[] = [
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

const CONTRACTING_STAGE_OPTIONS: {
    value: string;
    label: string;
    column:
        | 'contracting_confirmed_at'
        | 'contracting_forwarded_at'
        | 'contracting_issued_at'
        | 'contracting_carrier_certs_at'
        | 'contracting_complete_at';
}[] = [
    {
        value: 'confirmed',
        label: 'License & cert confirmed',
        column: 'contracting_confirmed_at',
    },
    {
        value: 'forwarded',
        label: 'Forwarded for contracting',
        column: 'contracting_forwarded_at',
    },
    {
        value: 'issued',
        label: 'Appointment issued',
        column: 'contracting_issued_at',
    },
    {
        value: 'carrier_certs',
        label: 'Carrier certifications',
        column: 'contracting_carrier_certs_at',
    },
    {
        value: 'complete',
        label: 'Verified',
        column: 'contracting_complete_at',
    },
];

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

type AuditLogEntry = {
    id: number;
    action: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    created_at: string;
    actor: { name: string } | null;
};

const AUDIT_ACTION_LABELS: Record<string, string> = {
    'eligibility.decision': 'Eligibility decision',
    'training.decision': 'XCEL Training decision',
    'license.decision': 'License Copy decision',
    'ahip_certification.decision': 'AHIP Certification decision',
};

type Props = {
    agent: OnboardingAgent;
    auditLog: AuditLogEntry[];
};

export default function OnboardingShow({ agent, auditLog }: Props) {
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
    const [checkedStages, setCheckedStages] = useState<string[]>(
        CONTRACTING_STAGE_OPTIONS.filter(
            (option) => agent.eligibility_attestation?.[option.column] !== null,
        ).map((option) => option.value),
    );

    const attestation = agent.eligibility_attestation;
    const completion = agent.training_completion;
    const submission = agent.license_submission;
    const certification = agent.ahip_certification;

    return (
        <>
            <Head title="License Agents Onboarding review" />

            <div className="mx-auto flex h-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <Link
                    href={index()}
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to License Agents Onboarding review
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
                                        : 'Pending'}
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
                                                        value={lineOfAuthority}
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
                                        <div className="flex items-center gap-2">
                                            {completion && (
                                                <Badge variant="outline">
                                                    {TRAINING_STATUS_LABELS[
                                                        completion.status
                                                    ] ?? completion.status}
                                                </Badge>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link
                                                    href={trainingProgressShowForUser(
                                                        agent.id,
                                                    )}
                                                >
                                                    <LineChart className="size-4" />
                                                    View live progress
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    {!completion ? (
                                        <NotSubmitted label="XCEL Training certificate" />
                                    ) : (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
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
                                                    new Date(
                                                        completion.created_at,
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
                                        XCEL Training decision
                                    </CardTitle>
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
                                                                completion.note ??
                                                                ''
                                                            }
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.note
                                                            }
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
                                                                        key={
                                                                            value
                                                                        }
                                                                        type="submit"
                                                                        name="status"
                                                                        value={
                                                                            value
                                                                        }
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
                                                : 'Pending'}
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
                                                                    (
                                                                        option,
                                                                    ) => (
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
                                                : 'Pending'}
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
                                        <CardTitle>
                                            License Application
                                        </CardTitle>
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
                                                : 'Pending'}
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
                                                <CardTitle>
                                                    License Copy
                                                </CardTitle>
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
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
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
                                                                    {
                                                                        submission.note
                                                                    }
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}

                                                    <Separator />

                                                    <p className="text-xs text-muted-foreground">
                                                        Submitted{' '}
                                                        {dateFormatter.format(
                                                            new Date(
                                                                submission.created_at,
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
                                                License Copy decision
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground">
                                                A note is required when
                                                rejecting.
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
                                                    {({
                                                        processing,
                                                        errors,
                                                    }) => (
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
                                                                        submission.note ??
                                                                        ''
                                                                    }
                                                                />
                                                                <InputError
                                                                    message={
                                                                        errors.note
                                                                    }
                                                                />
                                                            </div>

                                                            <div className="grid gap-2">
                                                                <Label htmlFor="license-expires-at">
                                                                    Expires on
                                                                    (if
                                                                    verifying)
                                                                </Label>
                                                                <input
                                                                    id="license-expires-at"
                                                                    name="expires_at"
                                                                    type="date"
                                                                    defaultValue={
                                                                        submission.expires_at ??
                                                                        ''
                                                                    }
                                                                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                                />
                                                                <InputError
                                                                    message={
                                                                        errors.expires_at
                                                                    }
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
                                                                                key={
                                                                                    value
                                                                                }
                                                                                type="submit"
                                                                                name="status"
                                                                                value={
                                                                                    value
                                                                                }
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
                                                                                {
                                                                                    label
                                                                                }
                                                                            </Button>
                                                                        );
                                                                    },
                                                                )}
                                                            </div>

                                                            {submission.reviewer && (
                                                                <>
                                                                    <Separator />
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Last
                                                                        reviewed
                                                                        by{' '}
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
                                                        <CardTitle>
                                                            AHIP Certification
                                                        </CardTitle>
                                                        {certification && (
                                                            <Badge variant="outline">
                                                                {AHIP_STATUS_LABELS[
                                                                    certification
                                                                        .status
                                                                ] ??
                                                                    certification.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </CardHeader>

                                                <CardContent className="space-y-6">
                                                    {!certification ? (
                                                        <NotSubmitted label="AHIP completion certificate" />
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                asChild
                                                            >
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
                                                                    View
                                                                    certificate
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
                                                                            {
                                                                                certification.note
                                                                            }
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
                                                        AHIP Certification
                                                        decision
                                                    </CardTitle>
                                                    <p className="text-sm text-muted-foreground">
                                                        A note is required when
                                                        rejecting.
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
                                                            {({
                                                                processing,
                                                                errors,
                                                            }) => (
                                                                <>
                                                                    <div className="grid gap-2">
                                                                        <Label htmlFor="ahip-note">
                                                                            Note
                                                                        </Label>
                                                                        <Textarea
                                                                            id="ahip-note"
                                                                            name="note"
                                                                            rows={
                                                                                3
                                                                            }
                                                                            defaultValue={
                                                                                certification.note ??
                                                                                ''
                                                                            }
                                                                        />
                                                                        <InputError
                                                                            message={
                                                                                errors.note
                                                                            }
                                                                        />
                                                                    </div>

                                                                    <div className="grid gap-2">
                                                                        <Label htmlFor="ahip-expires-at">
                                                                            Expires
                                                                            on
                                                                            (if
                                                                            verifying)
                                                                        </Label>
                                                                        <input
                                                                            id="ahip-expires-at"
                                                                            name="expires_at"
                                                                            type="date"
                                                                            defaultValue={
                                                                                certification.expires_at ??
                                                                                ''
                                                                            }
                                                                            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                                        />
                                                                        <InputError
                                                                            message={
                                                                                errors.expires_at
                                                                            }
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
                                                                                        key={
                                                                                            value
                                                                                        }
                                                                                        type="submit"
                                                                                        name="status"
                                                                                        value={
                                                                                            value
                                                                                        }
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
                                                                                        {
                                                                                            label
                                                                                        }
                                                                                    </Button>
                                                                                );
                                                                            },
                                                                        )}
                                                                    </div>

                                                                    {certification.reviewer && (
                                                                        <>
                                                                            <Separator />
                                                                            <p className="text-xs text-muted-foreground">
                                                                                Last
                                                                                reviewed
                                                                                by{' '}
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

                                            {certification?.status ===
                                                'verified' && (
                                                <Card className="lg:col-span-3">
                                                    <CardHeader>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <CardTitle>
                                                                Contracting &
                                                                Sales Training
                                                            </CardTitle>
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    attestation?.contracting_complete_at
                                                                        ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                                                        : 'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400'
                                                                }
                                                            >
                                                                {[
                                                                    ...CONTRACTING_STAGE_OPTIONS,
                                                                ]
                                                                    .reverse()
                                                                    .find(
                                                                        (
                                                                            option,
                                                                        ) =>
                                                                            attestation?.[
                                                                                option
                                                                                    .column
                                                                            ] !==
                                                                                null &&
                                                                            attestation?.[
                                                                                option
                                                                                    .column
                                                                            ] !==
                                                                                undefined,
                                                                    )?.label ??
                                                                    'Not started'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            Purely admin-driven
                                                            — the agent has
                                                            nothing to submit
                                                            here. Advance the
                                                            stage as it happens
                                                            outside the app.
                                                        </p>
                                                    </CardHeader>

                                                    <CardContent className="space-y-4">
                                                        <ul className="space-y-2 rounded-md border bg-muted/40 px-3 py-2.5">
                                                            <li className="text-sm text-muted-foreground">
                                                                <span className="font-medium text-foreground">
                                                                    Forwarded
                                                                </span>{' '}
                                                                — once you've
                                                                sent the agent
                                                                to carrier
                                                                contracting.
                                                            </li>
                                                            <li className="text-sm text-muted-foreground">
                                                                <span className="font-medium text-foreground">
                                                                    Appointment
                                                                    issued
                                                                </span>{' '}
                                                                — once the
                                                                carrier confirms
                                                                their
                                                                appointment.
                                                                Unlocks sales
                                                                training on the
                                                                agent's
                                                                dashboard.
                                                            </li>
                                                            <li className="text-sm text-muted-foreground">
                                                                <span className="font-medium text-foreground">
                                                                    Carrier
                                                                    certifications
                                                                </span>{' '}
                                                                — only if that
                                                                carrier requires
                                                                additional certs
                                                                before the agent
                                                                can sell.
                                                            </li>
                                                            <li className="text-sm text-muted-foreground">
                                                                <span className="font-medium text-foreground">
                                                                    Verified
                                                                </span>{' '}
                                                                — once the whole
                                                                contracting &
                                                                sales training
                                                                process is
                                                                finished.
                                                            </li>
                                                        </ul>

                                                        {attestation && (
                                                            <Form
                                                                {...EligibilityReviewController.updateContractingStages.form(
                                                                    attestation.id,
                                                                )}
                                                                className="space-y-3"
                                                            >
                                                                {({
                                                                    processing,
                                                                    errors,
                                                                }) => {
                                                                    const savedStages =
                                                                        CONTRACTING_STAGE_OPTIONS.filter(
                                                                            (
                                                                                option,
                                                                            ) =>
                                                                                attestation[
                                                                                    option
                                                                                        .column
                                                                                ] !==
                                                                                null,
                                                                        ).map(
                                                                            (
                                                                                option,
                                                                            ) =>
                                                                                option.value,
                                                                        );
                                                                    const isChanged =
                                                                        savedStages.length !==
                                                                            checkedStages.length ||
                                                                        !savedStages.every(
                                                                            (
                                                                                stage,
                                                                            ) =>
                                                                                checkedStages.includes(
                                                                                    stage,
                                                                                ),
                                                                        );

                                                                    return (
                                                                        <>
                                                                            <div className="grid w-full gap-3">
                                                                                <Label>
                                                                                    Contracting
                                                                                    stages
                                                                                </Label>
                                                                                {CONTRACTING_STAGE_OPTIONS.map(
                                                                                    (
                                                                                        option,
                                                                                    ) => {
                                                                                        const isChecked =
                                                                                            checkedStages.includes(
                                                                                                option.value,
                                                                                            );
                                                                                        const isDisabled =
                                                                                            !isChecked &&
                                                                                            isContractingStageDisabled(
                                                                                                checkedStages,
                                                                                                option.value,
                                                                                            );

                                                                                        return (
                                                                                            <label
                                                                                                key={
                                                                                                    option.value
                                                                                                }
                                                                                                title={
                                                                                                    isDisabled
                                                                                                        ? 'Check the previous stage first'
                                                                                                        : undefined
                                                                                                }
                                                                                                className={
                                                                                                    isDisabled
                                                                                                        ? 'flex items-center gap-2 rounded-md border px-3 py-2 opacity-50'
                                                                                                        : 'flex items-center gap-2 rounded-md border px-3 py-2 hover:border-primary/50'
                                                                                                }
                                                                                            >
                                                                                                <Checkbox
                                                                                                    checked={
                                                                                                        isChecked
                                                                                                    }
                                                                                                    disabled={
                                                                                                        isDisabled
                                                                                                    }
                                                                                                    onCheckedChange={(
                                                                                                        value,
                                                                                                    ) =>
                                                                                                        setCheckedStages(
                                                                                                            (
                                                                                                                current,
                                                                                                            ) =>
                                                                                                                toggleContractingStage(
                                                                                                                    current,
                                                                                                                    option.value,
                                                                                                                    Boolean(
                                                                                                                        value,
                                                                                                                    ),
                                                                                                                ),
                                                                                                        )
                                                                                                    }
                                                                                                />
                                                                                                <span className="text-sm font-medium">
                                                                                                    {
                                                                                                        option.label
                                                                                                    }
                                                                                                </span>
                                                                                            </label>
                                                                                        );
                                                                                    },
                                                                                )}
                                                                                {checkedStages.map(
                                                                                    (
                                                                                        stage,
                                                                                    ) => (
                                                                                        <input
                                                                                            key={
                                                                                                stage
                                                                                            }
                                                                                            type="hidden"
                                                                                            name="contracting_stages[]"
                                                                                            value={
                                                                                                stage
                                                                                            }
                                                                                        />
                                                                                    ),
                                                                                )}
                                                                                <InputError
                                                                                    message={
                                                                                        errors.contracting_stages
                                                                                    }
                                                                                />
                                                                            </div>
                                                                            {isChanged && (
                                                                                <div className="flex justify-start">
                                                                                    <Button
                                                                                        type="submit"
                                                                                        disabled={
                                                                                            processing
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
                                                                    );
                                                                }}
                                                            </Form>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                {auditLog.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity log</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Every review decision recorded for this agent,
                                most recent first.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {auditLog.map((entry) => (
                                    <li
                                        key={entry.id}
                                        className="flex items-start gap-3 border-b border-sidebar-border/70 pb-4 text-sm last:border-0 last:pb-0 dark:border-sidebar-border"
                                    >
                                        <LineChart className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                        <div className="space-y-0.5">
                                            <p>
                                                <span className="font-medium">
                                                    {entry.actor?.name ??
                                                        'System'}
                                                </span>{' '}
                                                recorded a{' '}
                                                {(
                                                    AUDIT_ACTION_LABELS[
                                                        entry.action
                                                    ] ?? entry.action
                                                ).toLowerCase()}
                                                {entry.from_status &&
                                                    entry.to_status && (
                                                        <>
                                                            {': '}
                                                            <span className="font-medium">
                                                                {
                                                                    entry.from_status
                                                                }
                                                            </span>{' '}
                                                            →{' '}
                                                            <span className="font-medium">
                                                                {
                                                                    entry.to_status
                                                                }
                                                            </span>
                                                        </>
                                                    )}
                                            </p>
                                            {entry.note && (
                                                <p className="text-muted-foreground">
                                                    “{entry.note}”
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {dateFormatter.format(
                                                    new Date(entry.created_at),
                                                )}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

OnboardingShow.layout = {
    breadcrumbs: [
        {
            title: 'License Agents Onboarding review',
            href: index(),
        },
        {
            title: 'Review',
            href: '#',
        },
    ],
};
