import {
    AlertTriangle,
    ArrowRight,
    Building2,
    Clock,
    DollarSign,
    HelpCircle,
    ScanLine,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { StageIcon } from '@/components/ui/stage-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { ONBOARDING_ICONS } from '@/lib/onboarding-icons';

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
    onMarkAsDone: () => void;
    markingDone: boolean;
};

export default function FingerprintingCard({
    onMarkAsDone,
    markingDone,
}: Props) {
    return (
        <Card>
            <CardHeader className="space-y-1">
                <div className="flex items-center gap-3">
                    <StageIcon icon={ONBOARDING_ICONS.fingerprinting} />
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-medium">
                            Fingerprinting / background check
                        </h3>
                        <StatusBadge status="in_progress" />
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Required in most (not all) states.
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <InfoBlock
                        icon={Building2}
                        label="Vendor"
                        value="Typically IdentoGO"
                        note="Needs a state-specific service code"
                    />
                    <InfoBlock
                        icon={DollarSign}
                        label="Cost"
                        value="Roughly $50–60"
                        note="Paid directly to the vendor"
                    />
                    <InfoBlock
                        icon={ScanLine}
                        label="Process"
                        value="Electronic LiveScan"
                        note="At a physical location, quick, no ink"
                    />
                    <InfoBlock
                        icon={Clock}
                        label="Timing"
                        value="2–3 weeks"
                        note="Longer if flagged for review"
                    />
                </div>

                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                Order matters — don't fingerprint before you've
                                applied
                            </p>
                            <p className="text-sm text-amber-900 dark:text-amber-200">
                                The correct sequence is exam → application →
                                fingerprinting. Some states have a strict window
                                (as short as 10 days) between fingerprinting and
                                application submission — miss it and you pay
                                again. Check with your PU coach on your state's
                                specific sequence before scheduling.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-md border bg-muted/40 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                        <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            Have something in your background you're unsure
                            about? Talk to your PU coach before this step — a
                            record doesn't automatically disqualify you, and
                            some states offer a pre-check before you invest
                            further.
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Don't have your state's service code?
                        </p>
                        <a
                            href="https://app.slack.com/client/T030JQ0AB5L/C0BRASMCYT0"
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
                        I've completed fingerprinting
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
