import { Head, router, usePage } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import EligibilityController from '@/actions/App/Http/Controllers/EligibilityController';
import AhipCertificationCard from '@/components/ahip-certification-card';
import CompleteXcelTrainingCard from '@/components/complete-xcel-training-card';
import ContractingAndSalesTrainingCard from '@/components/contracting-and-sales-training-card';
import FingerprintingCard from '@/components/fingerprinting-card';
import Heading from '@/components/heading';
import HowToEnrollCard from '@/components/how-to-enroll-card';
import ScheduleStateExamCard from '@/components/schedule-state-exam-card';
import SubmitLicenseApplicationCard from '@/components/submit-license-application-card';
import SubmitLicenseCopyCard from '@/components/submit-license-copy-card';
import { JourneyNodePath } from '@/components/ui/journey-node-path';
import { JourneyTrailRow } from '@/components/ui/journey-trail-row';
import { ONBOARDING_ICONS } from '@/lib/onboarding-icons';
import { dashboard } from '@/routes';
import type { Auth } from '@/types';

type JourneyStage = {
    key: string;
    title: string;
    icon: (typeof ONBOARDING_ICONS)[keyof typeof ONBOARDING_ICONS];
    summary: string;
};

const JOURNEY_STEPS: JourneyStage[] = [
    {
        key: 'eligibility',
        title: 'Eligibility',
        icon: ONBOARDING_ICONS.eligibility,
        summary:
            "We confirmed you meet your state's requirements before anything else.",
    },
    {
        key: 'enrollment',
        title: 'Enrollment',
        icon: ONBOARDING_ICONS.enrollment,
        summary: 'Enrollment paperwork and XCEL account access were set up.',
    },
    {
        key: 'training',
        title: 'XCEL training',
        icon: ONBOARDING_ICONS.training,
        summary:
            "XCEL's state-approved pre-licensing course, done at your own pace.",
    },
    {
        key: 'exam',
        title: 'State exam',
        icon: ONBOARDING_ICONS.exam,
        summary: 'Your state licensing exam was scheduled.',
    },
    {
        key: 'fingerprinting',
        title: 'Fingerprinting',
        icon: ONBOARDING_ICONS.fingerprinting,
        summary: 'Your background check appointment was completed.',
    },
    {
        key: 'license',
        title: 'License',
        icon: ONBOARDING_ICONS.license,
        summary:
            'Your license application was submitted and the issued copy uploaded.',
    },
    {
        key: 'ahip',
        title: 'AHIP certification',
        icon: ONBOARDING_ICONS.ahip,
        summary: 'Your annual AHIP certification for Medicare products.',
    },
    {
        key: 'contracting',
        title: 'Contracting',
        icon: ONBOARDING_ICONS.contracting,
        summary: 'Carrier contracting so you can start selling.',
    },
];

type Props = {
    eligibilityStatus: 'under_review' | 'cleared' | 'not_eligible';
    enrollmentCompleted: boolean;
    trainingStatus: 'pending_review' | 'verified' | 'rejected' | null;
    trainingNote: string | null;
    examScheduled: boolean;
    fingerprintingCompleted: boolean;
    licenseApplicationSubmitted: boolean;
    licenseStatus: 'pending_review' | 'verified' | 'rejected' | null;
    licenseNote: string | null;
    ahipStatus: 'pending_review' | 'verified' | 'rejected' | null;
    ahipNote: string | null;
    contracting: {
        confirmed: boolean;
        forwarded: boolean;
        issued: boolean;
        carrier_certs: boolean;
        complete: boolean;
    } | null;
};

export default function DashboardAgent({
    eligibilityStatus,
    enrollmentCompleted,
    trainingStatus,
    trainingNote,
    examScheduled,
    fingerprintingCompleted,
    licenseApplicationSubmitted,
    licenseStatus,
    licenseNote,
    ahipStatus,
    ahipNote,
    contracting,
}: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [markingDone, setMarkingDone] = useState(false);
    const [openStageKey, setOpenStageKey] = useState<string | null>(null);

    function markEnrollmentDone(lineOfAuthority: string) {
        setMarkingDone(true);

        router.post(
            EligibilityController.completeEnrollment.url(),
            { line_of_authority: lineOfAuthority },
            {
                preserveScroll: true,
                onFinish: () => setMarkingDone(false),
            },
        );
    }

    function markExamScheduled(proctoringType: string) {
        setMarkingDone(true);

        router.post(
            EligibilityController.scheduleExam.url(),
            { proctoring_type: proctoringType },
            {
                preserveScroll: true,
                onFinish: () => setMarkingDone(false),
            },
        );
    }

    function markFingerprintingDone() {
        setMarkingDone(true);

        router.post(
            EligibilityController.completeFingerprinting.url(),
            undefined,
            {
                preserveScroll: true,
                onFinish: () => setMarkingDone(false),
            },
        );
    }

    function isJourneyStepDone(step: { key: string }) {
        switch (step.key) {
            case 'eligibility':
                return eligibilityStatus === 'cleared';
            case 'enrollment':
                return enrollmentCompleted;
            case 'training':
                return trainingStatus === 'verified';
            case 'exam':
                return examScheduled;
            case 'fingerprinting':
                return fingerprintingCompleted;
            case 'license':
                return licenseStatus === 'verified';
            case 'ahip':
                return ahipStatus === 'verified';
            case 'contracting':
                return contracting?.complete ?? false;
            default:
                return false;
        }
    }

    const currentStep = JOURNEY_STEPS.find(
        (step) => !isJourneyStepDone(step),
    );

    function markLicenseApplicationSubmitted() {
        setMarkingDone(true);

        router.post(
            EligibilityController.submitLicenseApplication.url(),
            undefined,
            {
                preserveScroll: true,
                onFinish: () => setMarkingDone(false),
            },
        );
    }

    if (eligibilityStatus === 'under_review') {
        return (
            <>
                <Head title="Dashboard" />

                <div className="mx-auto flex h-full max-w-lg flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Clock className="size-6" />
                    </div>

                    <Heading
                        variant="small"
                        title="Your eligibility is under review"
                        description="Thanks for submitting your eligibility attestation. A coach or admin will review it shortly, and we'll let you know by email once a decision has been made."
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Dashboard" />

            <div className="relative flex h-full flex-1 flex-col p-4">
                <div className="absolute top-4 left-4">
                    <h1 className="text-xl font-semibold">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Here's what's available for you to complete.
                    </p>
                </div>

                <div className="mt-16 flex w-full flex-col items-center gap-6">
                    <div className="w-full rounded-xl border bg-card px-4 py-4">
                        <p className="mb-3 text-sm font-medium">
                            Your onboarding journey
                        </p>
                        <JourneyNodePath
                            stages={JOURNEY_STEPS}
                            isDone={isJourneyStepDone}
                            currentKey={currentStep?.key}
                        />
                    </div>

                    {eligibilityStatus === 'cleared' &&
                        !enrollmentCompleted && (
                            <div className="w-full">
                                <HowToEnrollCard
                                    onMarkAsDone={markEnrollmentDone}
                                    markingDone={markingDone}
                                />
                            </div>
                        )}

                    {eligibilityStatus === 'cleared' &&
                        enrollmentCompleted &&
                        trainingStatus !== 'verified' && (
                            <div className="w-full">
                                <CompleteXcelTrainingCard
                                    trainingStatus={trainingStatus}
                                    trainingNote={trainingNote}
                                />
                            </div>
                        )}

                    {trainingStatus === 'verified' && !examScheduled && (
                        <div className="w-full">
                            <ScheduleStateExamCard
                                onMarkAsDone={markExamScheduled}
                                markingDone={markingDone}
                            />
                        </div>
                    )}

                    {examScheduled && !fingerprintingCompleted && (
                        <div className="w-full">
                            <FingerprintingCard
                                onMarkAsDone={markFingerprintingDone}
                                markingDone={markingDone}
                            />
                        </div>
                    )}

                    {fingerprintingCompleted &&
                        !licenseApplicationSubmitted && (
                            <div className="w-full">
                                <SubmitLicenseApplicationCard
                                    onMarkAsDone={
                                        markLicenseApplicationSubmitted
                                    }
                                    markingDone={markingDone}
                                />
                            </div>
                        )}

                    {licenseApplicationSubmitted &&
                        licenseStatus !== 'verified' && (
                            <div className="w-full">
                                <SubmitLicenseCopyCard
                                    licenseStatus={licenseStatus}
                                    licenseNote={licenseNote}
                                />
                            </div>
                        )}

                    {licenseStatus === 'verified' &&
                        ahipStatus !== 'verified' && (
                            <div className="w-full">
                                <AhipCertificationCard
                                    ahipStatus={ahipStatus}
                                    ahipNote={ahipNote}
                                />
                            </div>
                        )}

                    {contracting !== null && (
                        <div className="w-full">
                            <ContractingAndSalesTrainingCard
                                contracting={contracting}
                            />
                        </div>
                    )}

                    <div className="w-full space-y-2">
                        <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Whole path
                        </p>
                        {JOURNEY_STEPS.map((step) => {
                            const done = isJourneyStepDone(step);

                            if (step.key === currentStep?.key) {
                                return null;
                            }

                            return (
                                <JourneyTrailRow
                                    key={step.key}
                                    stage={step}
                                    done={done}
                                    open={openStageKey === step.key}
                                    onToggle={(key) =>
                                        setOpenStageKey((current) =>
                                            current === key ? null : key,
                                        )
                                    }
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

DashboardAgent.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
