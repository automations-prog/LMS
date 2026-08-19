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
import { dashboard } from '@/routes';
import type { Auth } from '@/types';

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
    contractingStage:
        | 'confirmed'
        | 'forwarded'
        | 'issued'
        | 'carrier_certs'
        | null;
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
    contractingStage,
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

                    {contractingStage !== null && (
                        <div className="w-full">
                            <ContractingAndSalesTrainingCard
                                contractingStage={contractingStage}
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
