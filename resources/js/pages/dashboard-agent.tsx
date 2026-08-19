import { Form, Head, router, usePage } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import EligibilityController from '@/actions/App/Http/Controllers/EligibilityController';
import TrainingController from '@/actions/App/Http/Controllers/TrainingController';
import FileInput from '@/components/file-input';
import Heading from '@/components/heading';
import HowToEnrollCard from '@/components/how-to-enroll-card';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import type { Auth } from '@/types';

type Props = {
    eligibilityStatus: 'under_review' | 'cleared' | 'not_eligible';
    enrollmentCompleted: boolean;
    trainingStatus: 'pending_review' | 'verified' | 'rejected' | null;
    trainingNote: string | null;
};

export default function DashboardAgent({
    eligibilityStatus,
    enrollmentCompleted,
    trainingStatus,
    trainingNote,
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
                        <div className="max-w-2xl space-y-4 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                            <Heading
                                variant="small"
                                title="Complete XCEL Training"
                                description="Work through XCEL's 3-part training system at your own pace, on your own time — PreLicensing Course, Prep Review, and Exam Simulators. XCEL walks you through everything inside the platform."
                            />

                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p>
                                    <span className="font-medium text-foreground">
                                        Target:
                                    </span>{' '}
                                    2–3 weeks. This is done on your own time,
                                    outside work hours — it's an investment in
                                    your own career. For reference, our
                                    founder/leadership did this studying nights
                                    only and finished in about 2 weeks. XCEL
                                    gives you 30 days per phase as a safety net,
                                    but that's not the pace to aim for — the
                                    sooner you finish, the sooner you're earning
                                    as a licensed agent.
                                </p>
                                <p>
                                    <span className="font-medium text-foreground">
                                        Timeline:
                                    </span>{' '}
                                    30 days for Part 1 (Pre-Licensing Course),
                                    then a fresh 30 days for Parts 2–3 (Prep
                                    Review + Exam Simulators) combined.
                                </p>
                                <p>
                                    <span className="font-medium text-foreground">
                                        Rule of thumb:
                                    </span>{' '}
                                    Chapter quizzes 70%+, Prep Review 80%+, Exam
                                    Simulators 85%+ — if you're consistently
                                    hitting those, you're ready for the real
                                    exam.
                                </p>
                                <p>
                                    Stuck on course content? Use XCEL's own
                                    support/live help — that's what they're
                                    there for. Stuck on access, deadlines, or
                                    "am I actually ready?" — ask here in the
                                    channel.
                                </p>
                            </div>

                            {trainingStatus === 'pending_review' ? (
                                <p className="text-sm font-medium">
                                    Certificate submitted — awaiting
                                    verification.
                                </p>
                            ) : (
                                <>
                                    {trainingStatus === 'rejected' &&
                                        trainingNote && (
                                            <p className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                                                Your certificate wasn't
                                                verified: {trainingNote}
                                            </p>
                                        )}

                                    <Form
                                        {...TrainingController.store.form()}
                                        resetOnSuccess
                                    >
                                        {({ processing, errors }) => (
                                            <div className="space-y-2">
                                                <Label htmlFor="certificate_file">
                                                    Upload your training
                                                    certificate
                                                </Label>
                                                <FileInput
                                                    id="certificate_file"
                                                    name="certificate_file"
                                                    accept="application/pdf,image/*"
                                                />
                                                <InputError
                                                    message={
                                                        errors.certificate_file
                                                    }
                                                />
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    disabled={processing}
                                                >
                                                    {processing && <Spinner />}
                                                    Submit certificate
                                                </Button>
                                            </div>
                                        )}
                                    </Form>
                                </>
                            )}
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
