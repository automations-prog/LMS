import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    icon: ComponentType<{ className?: string }>;
    className?: string;
};

/** Small round icon badge used in each onboarding card's header, matching
 * the icon shown for that stage in the journey path above. */
export function StageIcon({ icon: Icon, className }: Props) {
    return (
        <div
            className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary',
                className,
            )}
        >
            <Icon className="size-4" />
        </div>
    );
}
