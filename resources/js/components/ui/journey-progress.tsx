type Props = {
    total: number;
    completed: number;
    /** Title of the step that's next up, if any (omit once everything's done). */
    currentTitle?: string;
    className?: string;
};

export function encouragementFor(percent: number) {
    if (percent >= 100) return "All done — amazing work!";
    if (percent >= 75) return "Almost there!";
    if (percent >= 40) return "You're doing great!";
    if (percent > 0) return 'Nice progress!';
    return "Let's get started!";
}

export function JourneyProgress({
    total,
    completed,
    currentTitle,
    className,
}: Props) {
    const percent = Math.round((completed / total) * 100);

    return (
        <div className={className}>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-sm text-muted-foreground">
                    {completed} of {total} completed
                </p>
                <p className="text-sm font-medium text-primary">
                    {encouragementFor(percent)}
                </p>
            </div>
            {currentTitle && (
                <p className="mt-1 text-sm text-muted-foreground">
                    Up next:{' '}
                    <span className="font-medium text-foreground">
                        {currentTitle}
                    </span>
                </p>
            )}
        </div>
    );
}
