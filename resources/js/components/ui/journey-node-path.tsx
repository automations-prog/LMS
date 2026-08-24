import { Check } from 'lucide-react';
import { Fragment } from 'react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

export type JourneyNodePathStage = {
    key: string;
    title: string;
    icon: ComponentType<{ className?: string }>;
};

type Props = {
    stages: JourneyNodePathStage[];
    isDone: (stage: JourneyNodePathStage) => boolean;
    /** Key of the "you are here" stage, if any (omit once everything's done). */
    currentKey?: string;
    className?: string;
};

/**
 * Straight-line row of stage nodes: done stages are filled with a
 * checkmark, the current stage is highlighted with a ring and a
 * "You are here" caption, and upcoming stages are outlined and joined by a
 * dotted connector. Scrolls horizontally on narrow viewports rather than
 * wrapping, so the line always stays straight.
 */
export function JourneyNodePath({
    stages,
    isDone,
    currentKey,
    className,
}: Props) {
    return (
        <div className={cn('w-full overflow-x-auto py-1', className)}>
            <div className="flex items-start">
                {stages.map((stage, index) => {
                    const done = isDone(stage);
                    const isCurrent = stage.key === currentKey;
                    const Icon = stage.icon;

                    // A connector is "reached" (solid) once both nodes on
                    // either side of it are done, or the left node is the
                    // current stage.
                    const connectorBefore =
                        index > 0 &&
                        (isDone(stages[index - 1]) &&
                            (done || isCurrent));

                    return (
                        <Fragment key={stage.key}>
                            {index > 0 && (
                                <div
                                    className={cn(
                                        'mt-5 h-0 min-w-6 flex-1 border-t',
                                        connectorBefore
                                            ? 'border-journey-ink'
                                            : 'border-dashed border-journey-border',
                                    )}
                                />
                            )}

                            <div className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center">
                                <div
                                    className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-full',
                                        done &&
                                            'bg-journey-ink text-journey-ink-foreground',
                                        isCurrent &&
                                            'bg-journey-tint text-journey-accent ring-2 ring-inset ring-journey-accent',
                                        !done &&
                                            !isCurrent &&
                                            'border border-journey-border bg-card text-muted-foreground',
                                    )}
                                >
                                    {done ? (
                                        <Check className="size-4" />
                                    ) : (
                                        <Icon className="size-4" />
                                    )}
                                </div>

                                <div>
                                    <p
                                        className={cn(
                                            'text-xs font-medium',
                                            isCurrent
                                                ? 'text-foreground'
                                                : done
                                                  ? 'text-foreground'
                                                  : 'text-muted-foreground',
                                        )}
                                    >
                                        {stage.title}
                                    </p>
                                    {isCurrent && (
                                        <p className="text-xs text-journey-accent">
                                            You are here
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
}
