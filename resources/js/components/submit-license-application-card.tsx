import {
    AlertTriangle,
    ArrowRight,
    Clock,
    CreditCard,
    DollarSign,
    Fingerprint,
    Paperclip,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';

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
                <span className="text-xs tracking-wide uppercase">
                    {label}
                </span>
            </div>
            <p className="text-sm font-medium">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
        </div>
    );
}

type Props = {
    onMarkAsDone: () => void;
    markingDone: boolean;
};

export default function SubmitLicenseApplicationCard({
    onMarkAsDone,
    markingDone,
}: Props) {
    return (
        <Card>
            <CardHeader className="space-y-1">
                <h3 className="text-base font-medium">
                    Submit your license application
                </h3>
                <p className="text-sm text-muted-foreground">
                    Submit your license application through NIPR (National
                    Insurance Producer Registry) — the same portal used
                    nationwide, regardless of your state.
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <InfoBlock
                        icon={CreditCard}
                        label="Apply & pay"
                        value="One step"
                        note="Credit card or e-check"
                    />
                    <InfoBlock
                        icon={Fingerprint}
                        label="NPN"
                        value="Assigned automatically"
                        note="Your permanent ID in every state"
                    />
                    <InfoBlock
                        icon={DollarSign}
                        label="Application fee"
                        value="$10–$40"
                        note="Plus a small NIPR transaction fee"
                    />
                    <InfoBlock
                        icon={Clock}
                        label="Review time"
                        value="7–10 days"
                        note="Typical turnaround"
                    />
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                        <Paperclip className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Answered "yes" to any background question? You'll
                            need to upload supporting docs via NIPR's
                            Attachment Warehouse.
                        </p>
                    </div>
                </div>

                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm text-amber-900 dark:text-amber-200">
                            Don't submit a second application before your
                            first one is fully issued if fingerprinting is
                            involved — doing so can trigger a duplicate
                            fingerprint fee. Check with your PU coach if
                            you're unsure of the order for your state.
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Unsure about your state's process?
                        </p>
                        <a
                            href="https://app.slack.com/client/T030JQ0AB5L/C0BR17PNURX"
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                            Ask in the channel
                            <ArrowRight className="size-3.5" />
                        </a>
                    </div>
                    <Button
                        onClick={onMarkAsDone}
                        disabled={markingDone}
                        className="shrink-0"
                    >
                        {markingDone && <Spinner />}
                        I've submitted my application
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
