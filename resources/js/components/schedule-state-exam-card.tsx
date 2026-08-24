import {
    AlertTriangle,
    ArrowRight,
    Building2,
    Clock,
    DollarSign,
    Monitor,
    Percent,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { StageIcon } from '@/components/ui/stage-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { ONBOARDING_ICONS } from '@/lib/onboarding-icons';

const PROCTORING_OPTIONS = [
    { value: 'in_person', label: 'In-person', icon: Building2 },
    { value: 'remote', label: 'Remote', icon: Monitor },
];

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
    onMarkAsDone: (proctoringType: string) => void;
    markingDone: boolean;
};

export default function ScheduleStateExamCard({
    onMarkAsDone,
    markingDone,
}: Props) {
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <Card>
            <CardHeader className="space-y-1">
                <div className="flex items-center gap-3">
                    <StageIcon icon={ONBOARDING_ICONS.exam} />
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-medium">
                            Schedule your state exam
                        </h3>
                        <StatusBadge status="in_progress" />
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Once you're confidently passing XCEL's exam simulators,
                    schedule your real state exam through Pearson VUE or PSI
                    (varies by state).
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <InfoBlock
                        icon={DollarSign}
                        label="Fee"
                        value="$40–45"
                        note="Non-refundable, paid at booking"
                    />
                    <InfoBlock
                        icon={Percent}
                        label="Passing score"
                        value="Usually 70%"
                        note="Varies by state"
                    />
                    <InfoBlock
                        icon={Clock}
                        label="Booking window"
                        value="24+ hours ahead"
                        note="No walk-ins"
                    />
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium">
                        Choose your proctoring type
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        {PROCTORING_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setSelected(option.value)}
                                aria-pressed={selected === option.value}
                                className={
                                    selected === option.value
                                        ? 'flex items-center gap-2 rounded-md border border-primary bg-primary/5 px-3 py-2.5 text-left ring-1 ring-primary'
                                        : 'flex items-center gap-2 rounded-md border px-3 py-2.5 text-left hover:border-primary/50'
                                }
                            >
                                <option.icon className="size-4 shrink-0 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                    {option.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm text-amber-900 dark:text-amber-200">
                            Some states require a NIPR authorization step before
                            you can book — don't skip ahead.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm text-amber-900 dark:text-amber-200">
                            Some states cap retakes within a 12-month window —
                            don't schedule until you're ready.
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Questions about your specific state's process?
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
                        onClick={() => selected && onMarkAsDone(selected)}
                        disabled={markingDone || !selected}
                        className="shrink-0"
                    >
                        {markingDone && <Spinner />}
                        I've scheduled my exam
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
