import { Badge } from '@/components/ui/badge';

type Props = {
    current: number;
    total: number;
};

export function StepBadge({ current, total }: Props) {
    return (
        <Badge
            variant="outline"
            className="shrink-0 font-normal text-muted-foreground"
        >
            Step {current} of {total}
        </Badge>
    );
}
