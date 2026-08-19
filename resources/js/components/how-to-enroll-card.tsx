import { ArrowRight, Check, Copy, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useClipboard } from '@/hooks/use-clipboard';

const PARTNER_URL = 'partners.xcelsolutions.com/pitchuniversity';

const LINES_OF_AUTHORITY = [
    { value: 'life', label: 'Life only', price: '$34.95' },
    { value: 'health', label: 'Health only', price: '$34.95' },
    { value: 'life_and_health', label: 'Life and health', price: '$39.95' },
];

function Step({
    number,
    isLast,
    children,
}: {
    number: number;
    isLast: boolean;
    children: ReactNode;
}) {
    return (
        <li className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                    {number}
                </div>
                {!isLast && <div className="my-1 w-px flex-1 bg-border" />}
            </div>
            <div className="pb-5">{children}</div>
        </li>
    );
}

type Props = {
    onMarkAsDone: (lineOfAuthority: string) => void;
    markingDone: boolean;
};

export default function HowToEnrollCard({ onMarkAsDone, markingDone }: Props) {
    const [copiedText, copy] = useClipboard();
    const [selected, setSelected] = useState<string | null>(null);

    return (
        <Card>
            <CardHeader className="space-y-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium">How to enroll</h3>
                    <Badge
                        variant="outline"
                        className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    >
                        You're eligible
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    Complete these steps to enroll in XCEL.
                </p>
            </CardHeader>

            <CardContent>
                <ol className="space-y-0">
                    <Step number={1} isLast={false}>
                        <p className="mb-2 text-sm font-medium">
                            Go to the XCEL partner site
                        </p>
                        <div className="flex w-fit items-center gap-2 rounded-md bg-muted px-3 py-1.5">
                            <code className="text-xs text-primary">
                                {PARTNER_URL}
                            </code>
                            <button
                                type="button"
                                onClick={() => copy(PARTNER_URL)}
                                aria-label="Copy partner URL"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                {copiedText === PARTNER_URL ? (
                                    <Check className="size-3.5" />
                                ) : (
                                    <Copy className="size-3.5" />
                                )}
                            </button>
                        </div>
                    </Step>

                    <Step number={2} isLast={false}>
                        <p className="mb-1 text-sm font-medium">
                            Confirm you're in the right spot
                        </p>
                        <p className="text-sm text-muted-foreground">
                            The grey bar should show Partner: pitchuniversity.
                            If not, enter the partner code first.
                        </p>
                    </Step>

                    <Step number={3} isLast={true}>
                        <p className="mb-3 text-sm font-medium">
                            Choose your line of authority
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {LINES_OF_AUTHORITY.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSelected(option.value)}
                                    aria-pressed={selected === option.value}
                                    className={
                                        selected === option.value
                                            ? 'rounded-md border border-primary bg-primary/5 px-3 py-2 text-left ring-1 ring-primary'
                                            : 'rounded-md border px-3 py-2 text-left hover:border-primary/50'
                                    }
                                >
                                    <p className="text-sm font-medium">
                                        {option.label}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {option.price}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </Step>
                </ol>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-md bg-primary/5 px-3 py-2.5">
                    <div className="flex items-start gap-2">
                        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                        <p className="text-sm text-primary">
                            Successfully enrolled? Mark this step done to unlock
                            what's next.
                        </p>
                    </div>
                    <Button
                        onClick={() => selected && onMarkAsDone(selected)}
                        disabled={markingDone || !selected}
                        className="shrink-0"
                    >
                        {markingDone && <Spinner />}
                        Mark as done
                    </Button>
                </div>

                <Separator className="my-3" />

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                        Stuck or partner code not showing?
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
            </CardContent>
        </Card>
    );
}
