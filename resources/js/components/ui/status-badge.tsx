import { Check, Clock, X } from 'lucide-react';
import type { ComponentType } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type Status =
    | 'eligible'
    | 'in_progress'
    | 'pending_review'
    | 'rejected'
    | 'verified';

const STATUS_CONFIG: Record<
    Status,
    { label: string; className: string; icon?: ComponentType<{ className?: string }> }
> = {
    eligible: {
        label: "You're eligible",
        className:
            'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    },
    verified: {
        label: 'Verified',
        className:
            'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
        icon: Check,
    },
    pending_review: {
        label: 'Pending review',
        className:
            'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
        icon: Clock,
    },
    rejected: {
        label: 'Rejected',
        className: 'border-transparent bg-destructive/10 text-destructive',
        icon: X,
    },
    in_progress: {
        label: 'In progress',
        className: 'border-transparent bg-secondary text-secondary-foreground',
    },
};

type Props = {
    status: Status;
    label?: string;
    className?: string;
};

export function StatusBadge({ status, label, className }: Props) {
    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
        <Badge className={cn(config.className, className)}>
            {Icon && <Icon className="size-3" />}
            {label ?? config.label}
        </Badge>
    );
}
