import * as React from 'react';
import { cn } from '@/lib/utils';

function Field({
    className,
    orientation = 'vertical',
    ...props
}: React.ComponentProps<'div'> & {
    orientation?: 'vertical' | 'horizontal';
}) {
    return (
        <div
            data-slot="field"
            data-orientation={orientation}
            className={cn(
                'group/field flex w-full gap-2',
                orientation === 'horizontal'
                    ? 'flex-row items-center'
                    : 'flex-col',
                className,
            )}
            {...props}
        />
    );
}

function FieldLabel({ className, ...props }: React.ComponentProps<'label'>) {
    return (
        <label
            data-slot="field-label"
            className={cn(
                'flex items-center gap-2 text-sm leading-snug font-medium select-none group-data-[disabled=true]/field:opacity-50',
                className,
            )}
            {...props}
        />
    );
}

export { Field, FieldLabel };
