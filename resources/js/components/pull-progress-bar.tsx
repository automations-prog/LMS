import type { PullStatus } from '@/hooks/use-pull-progress';
import { cn } from '@/lib/utils';

export function PullProgressBar({ status }: { status: PullStatus }) {
    const isQueued = status.status === 'queued';
    const percent = isQueued ? 100 : status.progress;

    return (
        <div className="space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className={cn(
                        'h-full rounded-full bg-primary transition-all duration-300 ease-out',
                        isQueued && 'w-1/3 animate-pulse',
                    )}
                    style={isQueued ? undefined : { width: `${percent}%` }}
                />
            </div>
            <p className="text-xs text-muted-foreground">
                {isQueued
                    ? 'Starting…'
                    : status.status === 'finished'
                      ? 'Done.'
                      : status.total > 0
                        ? `${status.progress}% complete (${status.processed}/${status.total})`
                        : `${status.progress}% complete`}
            </p>
        </div>
    );
}
