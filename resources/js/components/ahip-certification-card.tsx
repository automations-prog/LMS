import { Form } from '@inertiajs/react';
import {
    BookOpen,
    Check,
    Copy,
    DollarSign,
    Percent,
    RefreshCw,
    RotateCcw,
} from 'lucide-react';
import type { ComponentType } from 'react';
import AhipCertificationController from '@/actions/App/Http/Controllers/AhipCertificationController';
import FileInput from '@/components/file-input';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/status-badge';
import { StepBadge } from '@/components/ui/step-badge';
import { useClipboard } from '@/hooks/use-clipboard';

const ENROLL_URL = 'ahipmedicaretraining.com/clients/oim';

function InfoBlock({
    icon: Icon,
    label,
    value,
    note,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: string;
    note?: string;
}) {
    return (
        <div className="rounded-md border px-3 py-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-4" />
                <span className="text-xs tracking-wide uppercase">{label}</span>
            </div>
            <p className="text-sm font-medium">{value}</p>
            {note && (
                <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
            )}
        </div>
    );
}

type Props = {
    ahipStatus: 'pending_review' | 'rejected' | null;
    ahipNote: string | null;
    stepNumber: number;
    totalSteps: number;
};

export default function AhipCertificationCard({
    ahipStatus,
    ahipNote,
    stepNumber,
    totalSteps,
}: Props) {
    const [copiedText, copy] = useClipboard();

    return (
        <Card>
            <CardHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-medium">
                            AHIP/FWA certification
                        </h3>
                        <StatusBadge status={ahipStatus ?? 'in_progress'} />
                    </div>
                    <StepBadge current={stepNumber} total={totalSteps} />
                </div>
                <p className="text-sm text-muted-foreground">
                    Immediately after your license is active, complete AHIP
                    certification (Medicare + Fraud, Waste, and Abuse training)
                    — required before you can sell Medicare Advantage or Part D
                    plans.
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="flex w-fit items-center gap-2 rounded-md bg-muted px-3 py-1.5">
                    <code className="text-xs text-primary">{ENROLL_URL}</code>
                    <button
                        type="button"
                        onClick={() => copy(ENROLL_URL)}
                        aria-label="Copy enrollment URL"
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {copiedText === ENROLL_URL ? (
                            <Check className="size-3.5" />
                        ) : (
                            <Copy className="size-3.5" />
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <InfoBlock
                        icon={DollarSign}
                        label="Cost"
                        value="$125 via this link"
                        note="Discounted from $175"
                    />
                    <InfoBlock
                        icon={BookOpen}
                        label="Format"
                        value="Online, self-paced"
                        note="Roughly 6–8 hours of study"
                    />
                    <InfoBlock
                        icon={Percent}
                        label="Passing score"
                        value="90% (45/50)"
                    />
                    <InfoBlock
                        icon={RotateCcw}
                        label="Attempts"
                        value="Capped at 3"
                        note="Don't rush the exam"
                    />
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                        <RefreshCw className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Renews annually — this is required again every
                            certification cycle, not one-and-done.
                        </p>
                    </div>
                </div>

                <Separator />

                {ahipStatus === 'pending_review' ? (
                    <p className="text-sm font-medium">
                        Certificate submitted — awaiting verification.
                    </p>
                ) : (
                    <>
                        {ahipStatus === 'rejected' && ahipNote && (
                            <p className="mb-4 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                                Your certificate wasn't verified: {ahipNote}
                            </p>
                        )}

                        <Form
                            {...AhipCertificationController.store.form()}
                            resetOnSuccess
                        >
                            {({ processing, progress, errors }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="certificate_file">
                                        Upload your AHIP completion certificate
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
