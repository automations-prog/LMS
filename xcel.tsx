import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    DollarSign,
    Percent,
    Clock,
    AlertTriangle,
    Building2,
    Monitor,
    ArrowRight,
} from 'lucide-react';

const PROCTORING_OPTIONS = [
    { key: 'in_person', label: 'In-person', icon: Building2 },
    { key: 'remote', label: 'Remote', icon: Monitor },
];

export default function ScheduleStateExamCard({ onMarkAsDone }) {
    const [proctoring, setProctoring] = useState(null);

    return (
        <Card>
            <CardHeader className="space-y-1">
                <h3 className="text-base font-medium">Schedule your state exam</h3>
                <p className="text-sm text-muted-foreground">
                    Once you're confidently passing XCEL's exam simulators, schedule
                    your real state exam through Pearson VUE or PSI (varies by state).
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    <InfoBlock
                        icon={<DollarSign className="h-4 w-4" />}
                        label="Fee"
                        value="$40–45"
                        note="Non-refundable, paid at booking"
                    />
                    <InfoBlock
                        icon={<Percent className="h-4 w-4" />}
                        label="Passing score"
                        value="Usually 70%"
                        note="Varies by state"
                    />
                    <InfoBlock
                        icon={<Clock className="h-4 w-4" />}
                        label="Booking window"
                        value="24+ hours ahead"
                        note="No walk-ins"
                    />
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium">Choose your proctoring type</p>
                    <div className="grid grid-cols-2 gap-2">
                        {PROCTORING_OPTIONS.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setProctoring(key)}
                                className={
                                    proctoring === key
                                        ? 'flex items-center gap-2 rounded-md border-2 border-primary px-3 py-2.5 text-left'
                                        : 'flex items-center gap-2 rounded-md border px-3 py-2.5 text-left hover:border-muted-foreground/40'
                                }
                            >
                                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                            Some states require a NIPR authorization step before you can
                            book — don't skip ahead.
                        </p>
                    </div>
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800">
                            Some states cap retakes within a 12-month window — don't
                            schedule until you're ready.
                        </p>
                    </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Questions about your specific state's process?
                        </p>
                        <a
                            href="#"
                            className="text-sm text-primary inline-flex items-center gap-1 hover:underline"
                        >
                            Ask in the channel
                            <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                    </div>
                    <Button onClick={onMarkAsDone} className="shrink-0">
                        I've scheduled my exam
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function InfoBlock({ icon, label, value, note }) {
    return (
        <div className="rounded-md border px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                {icon}
                <span className="text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-sm font-medium">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
        </div>
    );
}