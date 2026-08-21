import {
    ArrowRight,
    ClipboardCheck,
    Clock,
    FileText,
    MessageCircleWarning,
    PhoneCall,
    ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/ui/status-badge';
import { StepBadge } from '@/components/ui/step-badge';
import { Stepper } from '@/components/ui/stepper';

const CONTRACTING_STAGES = [
    { key: 'confirmed', title: 'License & certification confirmed' },
    { key: 'forwarded', title: 'Forwarded for contracting' },
    { key: 'issued', title: 'Appointment issued' },
    { key: 'carrier_certs', title: 'Carrier certifications, if required' },
    { key: 'complete', title: 'Verified' },
];

const SALES_TRAINING_TOPICS = [
    { icon: PhoneCall, label: 'Call structure & discovery' },
    { icon: FileText, label: 'Quoting & presenting plans' },
    { icon: MessageCircleWarning, label: 'Objection handling' },
    { icon: ClipboardCheck, label: 'Enrollment process' },
    { icon: ShieldCheck, label: 'Compliance basics' },
];

type Props = {
    contracting: {
        confirmed: boolean;
        forwarded: boolean;
        issued: boolean;
        carrier_certs: boolean;
        complete: boolean;
    };
    stepNumber: number;
    totalSteps: number;
};

export default function ContractingAndSalesTrainingCard({
    contracting,
    stepNumber,
    totalSteps,
}: Props) {
    const isAppointed = contracting.issued || contracting.carrier_certs;

    return (
        <Card>
            <CardHeader className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-medium">
                            Carrier contracting & sales training
                        </h3>
                        <StatusBadge
                            status={
                                contracting.complete
                                    ? 'verified'
                                    : 'in_progress'
                            }
                        />
                    </div>
                    <StepBadge current={stepNumber} total={totalSteps} />
                </div>
                <p className="text-sm text-muted-foreground">
                    Licensed ≠ ready to sell. Once you're licensed and
                    AHIP-certified, Pitch forwards you for contracting — then
                    your manager walks you through sales training directly.
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div>
                    <p className="mb-3 text-sm font-medium">
                        Contracting & appointments
                    </p>
                    <Stepper
                        steps={CONTRACTING_STAGES}
                        isDone={(stage) =>
                            contracting[stage.key as keyof typeof contracting]
                        }
                        showCurrentLabel
                    />
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Contracting and appointment approval generally takes
                            anywhere from a few days to a few weeks — build in
                            buffer time.
                        </p>
                    </div>
                </div>

                <Separator />

                <div>
                    <p className="mb-1 text-sm font-medium">
                        Sales training
                        {!isAppointed && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                starts once you're appointed
                            </span>
                        )}
                    </p>
                    <p className="mb-3 text-sm text-muted-foreground">
                        This is where you learn to actually sell. Your
                        manager/coach walks you through each of these directly,
                        with real call examples and practice before you're on
                        your own.
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                        {SALES_TRAINING_TOPICS.map(({ icon: Icon, label }) => (
                            <div
                                key={label}
                                className={
                                    isAppointed
                                        ? 'flex items-center gap-2 rounded-md border px-3 py-2'
                                        : 'flex items-center gap-2 rounded-md border px-3 py-2 opacity-50'
                                }
                            >
                                <Icon className="size-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        No action needed from you right now.
                    </p>
                    <a
                        href="https://app.slack.com/client/T030JQ0AB5L/C0BR17PNURX"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        Ask your coach for a status update
                        <ArrowRight className="size-3.5" />
                    </a>
                </div>
            </CardContent>
        </Card>
    );
}
