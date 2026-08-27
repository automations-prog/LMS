import { Form, Link } from '@inertiajs/react';
import { CalendarClock, LineChart, ListChecks, Target } from 'lucide-react';
import type { ComponentType } from 'react';
import TrainingController from '@/actions/App/Http/Controllers/TrainingController';
import FileInput from '@/components/file-input';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { StageIcon } from '@/components/ui/stage-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { ONBOARDING_ICONS } from '@/lib/onboarding-icons';
import { show as trainingProgressShow } from '@/routes/training-progress';

function InfoBlock({
    icon: Icon,
    label,
    value,
    note,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: string;
    note: string;
}) {
    return (
        <div className="rounded-md border px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-4" />
                <span className="text-xs tracking-wide uppercase">{label}</span>
            </div>
            <p className="text-sm font-medium">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
        </div>
    );
}

type Props = {
    trainingStatus: 'pending_review' | 'rejected' | null;
    trainingNote: string | null;
};

export default function CompleteXcelTrainingCard({
    trainingStatus,
    trainingNote,
}: Props) {
    return (
        <Card>
            <CardHeader className="space-y-1">
                <div className="flex items-center gap-3">
                    <StageIcon icon={ONBOARDING_ICONS.training} />
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-medium">
                            Complete XCEL training
                        </h3>
                        <StatusBadge status={trainingStatus ?? 'in_progress'} />
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Work through XCEL's 3-part training system at your own pace,
                    on your own time — Pre-Licensing Course, Prep Review, and
                    Exam Simulators. XCEL walks you through everything inside
                    the platform.
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <InfoBlock
                        icon={Target}
                        label="Target"
                        value="2–3 weeks"
                        note="On your own time, outside work hours"
                    />
                    <InfoBlock
                        icon={CalendarClock}
                        label="Timeline"
                        value="30 + 30 days"
                        note="Part 1, then Parts 2–3 combined"
                    />
                    <InfoBlock
                        icon={ListChecks}
                        label="Rule of thumb"
                        value="70% / 80% / 85%+"
                        note="Quizzes, Prep Review, Simulators"
                    />
                </div>

                <p className="text-sm text-muted-foreground">
                    Stuck on course content? Use XCEL's own support/live help —
                    that's what they're there for. Stuck on access, deadlines,
                    or "am I actually ready?" —{' '}
                    <a
                        href="https://app.slack.com/client/T030JQ0AB5L/C0BRASMCYT0"
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                    >
                        ask here
                    </a>{' '}
                    in the channel.
                </p>

                <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={trainingProgressShow()}>
                        <LineChart className="size-4" />
                        View live training progress
                    </Link>
                </Button>

                <Separator />

                {trainingStatus === 'pending_review' ? (
                    <p className="text-sm font-medium">
                        Certificate submitted — awaiting verification.
                    </p>
                ) : (
                    <>
                        {trainingStatus === 'rejected' && trainingNote && (
                            <p className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                                Your certificate wasn't verified: {trainingNote}
                            </p>
                        )}

                        <Form
                            {...TrainingController.store.form()}
                            resetOnSuccess
                        >
                            {({ processing, progress, errors }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="certificate_file">
                                        Upload your training certificate
                                    </Label>
                                    <FileInput
                                        id="certificate_file"
                                        name="certificate_file"
                                        accept="application/pdf,image/*"
                                        disabled={processing}
                                    />
                                    {processing && (
                                        <div className="space-y-1">
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all"
                                                    style={{
                                                        width: `${progress?.percentage ?? 0}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Uploading
                                                {progress?.percentage
                                                    ? ` — ${progress.percentage}%`
                                                    : '…'}
                                            </p>
                                        </div>
                                    )}
                                    <InputError
                                        message={errors.certificate_file}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full"
                                    >
                                        {processing && <Spinner />}
                                        {processing
                                            ? 'Uploading…'
                                            : 'Submit certificate'}
                                    </Button>
                                </div>
                            )}
                        </Form>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
