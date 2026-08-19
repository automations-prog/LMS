import { Head, router, usePage } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import EligibilityController from '@/actions/App/Http/Controllers/EligibilityController';
import CompleteXcelTrainingCard from '@/components/complete-xcel-training-card';
import Heading from '@/components/heading';
import HowToEnrollCard from '@/components/how-to-enroll-card';
import ScheduleStateExamCard from '@/components/schedule-state-exam-card';
import { dashboard } from '@/routes';
import type { Auth } from '@/types';

type Props = {
    eligibilityStatus: 'under_review' | 'cleared' | 'not_eligible';
    enrollmentCompleted: boolean;
    trainingStatus: 'pending_review' | 'verified' | 'rejected' | null;
    trainingNote: string | null;
    examScheduled: boolean;
};

export default function DashboardAgent({
    eligibilityStatus,
    enrollmentCompleted,
    trainingStatus,
    trainingNote,
    examScheduled,
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

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div>
                    <h1 className="text-xl font-semibold">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Here's what's available for you to complete.
                    </p>
                </div>

                {eligibilityStatus === 'cleared' && !enrollmentCompleted && (
                    <div className="max-w-2xl">
                        <HowToEnrollCard
                            onMarkAsDone={markEnrollmentDone}
                            markingDone={markingDone}
                        />
                    </div>
                )}

                {eligibilityStatus === 'cleared' &&
                    enrollmentCompleted &&
                    trainingStatus !== 'verified' && (
                        <div className="max-w-2xl">
                            <CompleteXcelTrainingCard
                                trainingStatus={trainingStatus}
                                trainingNote={trainingNote}
                            />
                        </div>
                    )}

                {trainingStatus === 'verified' && !examScheduled && (
                    <div className="max-w-2xl">
                        <ScheduleStateExamCard
                            onMarkAsDone={markExamScheduled}
                            markingDone={markingDone}
                        />
                    </div>
                )}
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
