import { Upload } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Props = Omit<ComponentProps<'input'>, 'type'> & {
    accept?: string;
    currentFileLabel?: string;
};

export default function FileInput({
    className,
    id,
    accept,
    currentFileLabel,
    onChange,
    ...props
}: Props) {
    const [fileName, setFileName] = useState<string | null>(null);

    return (
        <label
            htmlFor={id}
            className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50',
                className,
            )}
        >
            <Upload className="size-4 shrink-0" />
            <span className="truncate">
                {fileName ?? currentFileLabel ?? 'Choose a file...'}
            </span>
            <input
                id={id}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={(e) => {
                    setFileName(e.target.files?.[0]?.name ?? null);
                    onChange?.(e);
                }}
                {...props}
            />
        </label>
    );
}
