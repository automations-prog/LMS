import { ChevronDown, ChevronUp, Lock } from 'lucide-react';
import type { ComponentType } from 'react';
import { StageIcon } from '@/components/ui/stage-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

export type JourneyTrailRowStage = {
    key: string;
    title: string;
    icon: ComponentType<{ className?: string }>;
    summary: string;
};

type Props = {
    stage: JourneyTrailRowStage;
    /** Whether this stage is already behind the agent (vs. still locked ahead). */
    done: boolean;
    open: boolean;
    onToggle: (key: string) => void;
};

/**
 * One row in the "whole path" list below the active card — lets an agent
 * glance back at what they've finished, or peek at what's still ahead,
 * without it doubling as a way to skip ahead (locked rows don't expand).
 */
export function JourneyTrailRow({ stage, done, open, onToggle }: Props) {
    return (
        <div
            className={cn(
                'overflow-hidden rounded-xl border',
                !done && 'bg-transparent',
            )}
        >
            <button
                type="button"
                onClick={() => done && onToggle(stage.key)}
                disabled={!done}
                className={cn(
                    'flex w-full items-center gap-4 px-4 py-3 text-left',
                    done ? 'cursor-pointer' : 'cursor-default opacity-55',
                )}
            >
                <StageIcon icon={stage.icon} />
                <div className="min-w-0 flex-1">
                    <div className="text-base font-medium">{stage.title}</div>
                </div>
                {done ? (
                    <>
                        <StatusBadge status="verified" />
                        {open ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                    </>
                ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Lock className="size-3.5" />
                        <span>Not yet</span>
                    </div>
                )}
            </button>
            {open && done && (
                <div className="-mt-1 px-4 pb-4 pl-[4.25rem]">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {stage.summary}
                    </p>
                </div>
            )}
        </div>
    );
}
