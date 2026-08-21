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
import { Stepper } from '@/components/ui/stepper';
import type { StepperStep } from '@/components/ui/stepper';
import { dashboard } from '@/routes';
import type { Auth } from '@/types';

const JOURNEY_STEPS: StepperStep[] = [
    { key: 'eligibility', title: 'Eligibility', label: 'Eligibility' },
    { key: 'enrollment', title: 'Enrollment', label: 'Enrollment' },
    { key: 'training', title: 'XCEL training', label: 'Training' },
    { key: 'exam', title: 'State exam', label: 'Exam' },
    { key: 'fingerprinting', title: 'Fingerprinting', label: 'Fingerprint' },
    { key: 'license', title: 'License', label: 'License' },
    { key: 'ahip', title: 'AHIP certification', label: 'AHIP' },
    { key: 'contracting', title: 'Contracting', label: 'Contracting' },
];

const TOTAL_STEPS = JOURNEY_STEPS.length;

function journeyStepNumber(key: string) {
    return JOURNEY_STEPS.findIndex((step) => step.key === key) + 1;
}

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

    function isJourneyStepDone(step: StepperStep) {
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

                <div className="mx-auto mt-16 flex w-full max-w-2xl flex-col items-center gap-6">
                    <div className="w-full rounded-xl border bg-card px-4 py-4">
                        <p className="mb-3 text-sm font-medium">
                            Your onboarding journey
                        </p>
                        <Stepper
                            steps={JOURNEY_STEPS}
                            isDone={isJourneyStepDone}
                        />
                    </div>

                    {eligibilityStatus === 'cleared' &&
                        !enrollmentCompleted && (
                            <div className="w-full">
                                <HowToEnrollCard
                                    onMarkAsDone={markEnrollmentDone}
                                    markingDone={markingDone}
                                    stepNumber={journeyStepNumber('enrollment')}
                                    totalSteps={TOTAL_STEPS}
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
                                    stepNumber={journeyStepNumber('training')}
                                    totalSteps={TOTAL_STEPS}
                                />
                            </div>
                        )}

                    {trainingStatus === 'verified' && !examScheduled && (
                        <div className="w-full">
                            <ScheduleStateExamCard
                                onMarkAsDone={markExamScheduled}
                                markingDone={markingDone}
                                stepNumber={journeyStepNumber('exam')}
                                totalSteps={TOTAL_STEPS}
                            />
                        </div>
                    )}

                    {examScheduled && !fingerprintingCompleted && (
                        <div className="w-full">
                            <FingerprintingCard
                                onMarkAsDone={markFingerprintingDone}
                                markingDone={markingDone}
                                stepNumber={journeyStepNumber('fingerprinting')}
                                totalSteps={TOTAL_STEPS}
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
                                    stepNumber={journeyStepNumber('license')}
                                    totalSteps={TOTAL_STEPS}
                                />
                            </div>
                        )}

                    {licenseApplicationSubmitted &&
                        licenseStatus !== 'verified' && (
                            <div className="w-full">
                                <SubmitLicenseCopyCard
                                    licenseStatus={licenseStatus}
                                    licenseNote={licenseNote}
                                    stepNumber={journeyStepNumber('license')}
                                    totalSteps={TOTAL_STEPS}
                                />
                            </div>
                        )}

                    {licenseStatus === 'verified' &&
                        ahipStatus !== 'verified' && (
                            <div className="w-full">
                                <AhipCertificationCard
                                    ahipStatus={ahipStatus}
                                    ahipNote={ahipNote}
                                    stepNumber={journeyStepNumber('ahip')}
                                    totalSteps={TOTAL_STEPS}
                                />
                            </div>
                        )}

                    {contracting !== null && (
                        <div className="w-full">
                            <ContractingAndSalesTrainingCard
                                contracting={contracting}
                                stepNumber={journeyStepNumber('contracting')}
                                totalSteps={TOTAL_STEPS}
                            />
                        </div>
                    )}
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
