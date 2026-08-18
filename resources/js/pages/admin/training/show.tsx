import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Calendar,
    CircleCheck,
    CircleX,
    FileText,
} from 'lucide-react';
import { useState } from 'react';
import TrainingReviewController from '@/actions/App/Http/Controllers/TrainingReviewController';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';
import { index } from '@/routes/training';

const STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-400',
    verified:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    rejected:
        'border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
};

// Active-state classes reuse the same hues as STATUS_BADGE_CLASSES so a
// selected button reads as "this is the current status" (color-matched to
// its badge), not as a generically disabled button.
const ACTIVE_BUTTON_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-600 text-white hover:bg-slate-600 dark:bg-slate-500',
    rejected:
        'border-transparent bg-red-600 text-white hover:bg-red-600 dark:bg-red-500',
    verified:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
};

const DECISION_OPTIONS: {
    value: string;
    label: string;
    icon: typeof Calendar;
}[] = [
    { value: 'pending_review', label: 'Pending review', icon: Calendar },
    { value: 'rejected', label: 'Rejected', icon: CircleX },
    { value: 'verified', label: 'Verified', icon: CircleCheck },
];

type Completion = {
    id: number;
    status: string;
    note: string | null;
    created_at: string;
    reviewed_at: string | null;
    user: { name: string; email: string };
    reviewer: { name: string } | null;
};

type Props = {
    completion: Completion;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
});

export default function TrainingShow({ completion }: Props) {
    // `processing` from the Form render-prop is shared by the whole <form>,
    // not per-button — track which button was actually clicked so only that
    // one shows a spinner while the request is in flight.
    const [clickedStatus, setClickedStatus] = useState<string | null>(null);
    const getInitials = useInitials();

    return (
        <>
            <Head title="Training review" />

            <div className="mx-auto flex h-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <Link
                    href={index()}
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to training review
                </Link>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-10">
                                        <AvatarFallback className="bg-gradient-to-br from-[#c774ff] to-[#8a5fae] font-semibold text-white">
                                            {getInitials(completion.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle>
                                            {completion.user.name}
                                        </CardTitle>
                                        <p className="text-sm text-muted-foreground">
                                            {completion.user.email}
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={
                                        STATUS_BADGE_CLASSES[completion.status]
                                    }
                                >
                                    {STATUS_LABELS[completion.status] ??
                                        completion.status}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={
                                        TrainingReviewController.document(
                                            completion.id,
                                        ).url
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <FileText />
                                    View certificate
                                </a>
                            </Button>

                            {completion.note && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Note
                                        </p>
                                        <p
                                            className={
                                                completion.status === 'rejected'
                                                    ? 'mt-1 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive'
                                                    : 'mt-1 text-sm'
                                            }
                                        >
                                            {completion.note}
                                        </p>
                                    </div>
                                </>
                            )}

                            <Separator />

                            <p className="text-xs text-muted-foreground">
                                Submitted{' '}
                                {dateFormatter.format(
                                    new Date(completion.created_at),
                                )}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Decision</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                A note is required when rejecting.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <Form
                                {...TrainingReviewController.decision.form(
                                    completion.id,
                                )}
                                className="space-y-5"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-2">
                                            <Label htmlFor="note">Note</Label>
                                            <Textarea
                                                id="note"
                                                name="note"
                                                rows={3}
                                                defaultValue={
                                                    completion.note ?? ''
                                                }
                                            />
                                            <InputError message={errors.note} />
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {DECISION_OPTIONS.map(
                                                ({
                                                    value,
                                                    label,
                                                    icon: Icon,
                                                }) => {
                                                    const isActive =
                                                        completion.status ===
                                                        value;

                                                    return (
                                                        <Button
                                                            key={value}
                                                            type="submit"
                                                            name="status"
                                                            value={value}
                                                            variant="outline"
                                                            size="lg"
                                                            className={
                                                                isActive
                                                                    ? `w-full justify-start ${ACTIVE_BUTTON_CLASSES[value]}`
                                                                    : 'w-full justify-start'
                                                            }
                                                            disabled={
                                                                processing ||
                                                                isActive
                                                            }
                                                            onClick={() =>
                                                                setClickedStatus(
                                                                    value,
                                                                )
                                                            }
                                                        >
                                                            {processing &&
                                                            clickedStatus ===
                                                                value ? (
                                                                <Spinner />
                                                            ) : (
                                                                <Icon />
                                                            )}
                                                            {label}
                                                        </Button>
                                                    );
                                                },
                                            )}
                                        </div>

                                        {completion.reviewer && (
                                            <>
                                                <Separator />
                                                <p className="text-xs text-muted-foreground">
                                                    Last reviewed by{' '}
                                                    <span className="font-medium text-foreground">
                                                        {
                                                            completion.reviewer
                                                                .name
                                                        }
                                                    </span>
                                                    {completion.reviewed_at && (
                                                        <>
                                                            {' '}
                                                            on{' '}
                                                            {dateFormatter.format(
                                                                new Date(
                                                                    completion.reviewed_at,
                                                                ),
                                                            )}
                                                        </>
                                                    )}
                                                </p>
                                            </>
                                        )}
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

TrainingShow.layout = {
    breadcrumbs: [
        {
            title: 'Training review',
            href: index(),
        },
        {
            title: 'Review',
            href: '#',
        },
    ],
};
