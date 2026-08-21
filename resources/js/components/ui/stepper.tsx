import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

export type StepperStep = {
    key: string;
    title: string;
    /** Optional short label shown under the circle (falls back to `title`). */
    label?: string;
};

type StepperProps = {
    steps: StepperStep[];
    /** Whether the given step is complete. */
    isDone: (step: StepperStep, index: number) => boolean;
    /**
     * Index to highlight as "current". Defaults to the first incomplete
     * step, or the last step if everything is done.
     */
    currentIndex?: number;
    /** Show the title of the current step below the tracker. */
    showCurrentLabel?: boolean;
    className?: string;
};

export function Stepper({
    steps,
    isDone,
    currentIndex,
    showCurrentLabel = false,
    className,
}: StepperProps) {
    const doneFlags = steps.map((step, index) => isDone(step, index));
    const firstIncomplete = doneFlags.findIndex((done) => !done);
    const resolvedCurrentIndex =
        currentIndex ??
        (firstIncomplete === -1 ? steps.length - 1 : firstIncomplete);

    return (
        <div className={className}>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {steps.map((step, index) => {
                    const done = doneFlags[index];
                    const isCurrent = index === resolvedCurrentIndex;

                    return (
                        <div
                            key={step.key}
                            className="flex flex-1 items-start"
                        >
                            <div className="flex flex-col items-center gap-1">
                                <div
                                    className={cn(
                                        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                                        done
                                            ? 'bg-primary text-primary-foreground'
                                            : isCurrent
                                              ? 'border-2 border-primary text-primary'
                                              : 'border text-muted-foreground',
                                    )}
                                    title={step.title}
                                >
                                    {done ? (
                                        <Check className="size-3.5" />
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'hidden max-w-16 truncate text-center text-[11px] whitespace-nowrap sm:block',
                                        isCurrent
                                            ? 'font-medium text-primary'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {step.label ?? step.title}
                                </span>
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={cn(
                                        'mt-3 h-px flex-1',
                                        done ? 'bg-primary' : 'bg-border',
                                    )}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {showCurrentLabel && (
                <p className="mt-2 text-sm text-primary">
                    {steps[resolvedCurrentIndex]?.title}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (you are here)
                    </span>
                </p>
            )}
        </div>
    );
}
