import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    ArrowRight,
    Check,
    ClipboardCheck,
    Clock,
    FileText,
    MessageCircleWarning,
    PhoneCall,
    ShieldCheck,
} from 'lucide-react';

const CONTRACTING_STAGES = [
    { key: 'confirmed', title: 'License & certification confirmed' },
    { key: 'forwarded', title: 'Forwarded for contracting' },
    { key: 'issued', title: 'Appointment issued' },
    { key: 'carrier_certs', title: 'Carrier certifications, if required' },
];

const SALES_TRAINING_TOPICS = [
    { icon: PhoneCall, label: 'Call structure & discovery' },
    { icon: FileText, label: 'Quoting & presenting plans' },
    { icon: MessageCircleWarning, label: 'Objection handling' },
    { icon: ClipboardCheck, label: 'Enrollment process' },
    { icon: ShieldCheck, label: 'Compliance basics' },
];

// contractingStage: one of CONTRACTING_STAGES[].key — reflects where this agent is right now
export default function ContractingAndSalesTrainingCard({
    contractingStage = 'confirmed',
}) {
    const currentIndex = CONTRACTING_STAGES.findIndex(
        (s) => s.key === contractingStage,
    );
    const isAppointed =
        contractingStage === 'carrier_certs' ||
        currentIndex === CONTRACTING_STAGES.length - 1;

    return (
        <Card>
            <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium">
                        Carrier contracting & sales training
                    </h3>
                    <Badge variant="secondary">In progress</Badge>
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
                    <div className="flex items-center gap-1">
                        {CONTRACTING_STAGES.map((stage, index) => {
                            const isDone = index < currentIndex;
                            const isCurrent = index === currentIndex;
                            return (
                                <div
                                    key={stage.key}
                                    className="flex flex-1 items-center"
                                >
                                    <div
                                        className={
                                            isDone
                                                ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'
                                                : isCurrent
                                                  ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-primary text-xs font-medium text-primary'
                                                  : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground'
                                        }
                                        title={stage.title}
                                    >
                                        {isDone ? (
                                            <Check className="h-3.5 w-3.5" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>
                                    {index < CONTRACTING_STAGES.length - 1 && (
                                        <div
                                            className={
                                                isDone
                                                    ? 'h-px flex-1 bg-primary'
                                                    : 'h-px flex-1 bg-border'
                                            }
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <p className="mt-2 text-sm text-primary">
                        {CONTRACTING_STAGES[currentIndex]?.title}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (you are here)
                        </span>
                    </p>
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
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
                                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                        href="#"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                        Ask your coach for a status update
                        <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                </div>
            </CardContent>
        </Card>
    );
}
