import { Form, Link } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import { useState } from 'react';
import AhipCertificationReviewController from '@/actions/App/Http/Controllers/AhipCertificationReviewController';
import EligibilityReviewController from '@/actions/App/Http/Controllers/EligibilityReviewController';
import LicenseReviewController from '@/actions/App/Http/Controllers/LicenseReviewController';
import { show } from '@/actions/App/Http/Controllers/OnboardingReviewController';
import TrainingReviewController from '@/actions/App/Http/Controllers/TrainingReviewController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
    AHIP_ACTIVE_CLASSES,
    AHIP_DECISION_OPTIONS,
    AHIP_STATUS_LABELS,
    dateFormatter,
    ELIGIBILITY_ACTIVE_CLASSES,
    ELIGIBILITY_DECISION_OPTIONS,
    ELIGIBILITY_STATUS_LABELS,
    LICENSE_ACTIVE_CLASSES,
    LICENSE_DECISION_OPTIONS,
    LICENSE_STATUS_LABELS,
    TRAINING_ACTIVE_CLASSES,
    TRAINING_DECISION_OPTIONS,
    TRAINING_STATUS_LABELS,
} from '@/lib/onboarding-decisions';
import type { OnboardingAgent } from '@/types/onboarding';

function NotSubmitted({ label }: { label: string }) {
    return (
        <p className="rounded-md border border-dashed border-sidebar-border/70 p-3 text-sm text-muted-foreground dark:border-sidebar-border">
            {label} not submitted yet.
        </p>
    );
}

function ReviewedByFooter({
    reviewer,
    reviewedAt,
}: {
    reviewer: { name: string } | null;
    reviewedAt: string | null;
}) {
    if (!reviewer) {
        return null;
    }

    return (
        <p className="text-xs text-muted-foreground">
            Last reviewed by{' '}
            <span className="font-medium text-foreground">{reviewer.name}</span>
            {reviewedAt && (
                <> on {dateFormatter.format(new Date(reviewedAt))}</>
            )}
        </p>
    );
}

type Props = {
    agent: OnboardingAgent | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function OnboardingUpdateDialog({
    agent,
    open,
    onOpenChange,
}: Props) {
    // `processing` from each Form render-prop is shared by that whole
    // <form>, not per-button — track which button was actually clicked so
    // only that one shows a spinner while the request is in flight. Same
    // convention as pages/admin/onboarding/show.tsx.
    const [clickedEligibilityStatus, setClickedEligibilityStatus] = useState<
        string | null
    >(null);
    const [clickedTrainingStatus, setClickedTrainingStatus] = useState<
        string | null
    >(null);
    const [clickedLicenseStatus, setClickedLicenseStatus] = useState<
        string | null
    >(null);
    const [clickedAhipStatus, setClickedAhipStatus] = useState<string | null>(
        null,
    );

    const attestation = agent?.eligibility_attestation ?? null;
    const completion = agent?.training_completion ?? null;
    const submission = agent?.license_submission ?? null;
    const certification = agent?.ahip_certification ?? null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                {agent && (
                    <>
                        <DialogHeader>
                            <DialogTitle>{agent.name}</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                {agent.email}
                            </p>
                        </DialogHeader>

                        <div className="space-y-6">
                            <section className="space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-sm font-semibold">
                                        Eligibility
                                    </h3>
                                    {attestation && (
                                        <Badge variant="outline">
                                            {ELIGIBILITY_STATUS_LABELS[
                                                attestation.status
                                            ] ?? attestation.status}
                                        </Badge>
                                    )}
                                </div>

                                {!attestation ? (
                                    <NotSubmitted label="Eligibility attestation" />
                                ) : (
                                    <>
                                        {attestation.work_authorization_path && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <a
                                                    href={
                                                        EligibilityReviewController.document(
                                                            attestation.id,
                                                        ).url
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <FileText />
                                                    View work authorization
                                                    document
                                                </a>
                                            </Button>
                                        )}

                                        <Form
                                            {...EligibilityReviewController.decision.form(
                                                attestation.id,
                                            )}
                                            className="space-y-3"
                                        >
                                            {({ processing }) => (
                                                <>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {ELIGIBILITY_DECISION_OPTIONS.map(
                                                            ({
                                                                value,
                                                                label,
                                                                icon: Icon,
                                                            }) => {
                                                                const isActive =
                                                                    attestation.status ===
                                                                    value;

                                                                return (
                                                                    <Button
                                                                        key={
                                                                            value
                                                                        }
                                                                        type="submit"
                                                                        name="status"
                                                                        value={
                                                                            value
                                                                        }
                                                                        variant="outline"
                                                                        className={
                                                                            isActive
                                                                                ? `justify-start ${ELIGIBILITY_ACTIVE_CLASSES[value]}`
                                                                                : 'justify-start'
                                                                        }
                                                                        disabled={
                                                                            processing ||
                                                                            isActive
                                                                        }
                                                                        onClick={() =>
                                                                            setClickedEligibilityStatus(
                                                                                value,
                                                                            )
                                                                        }
                                                                    >
                                                                        {processing &&
                                                                        clickedEligibilityStatus ===
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

                                                    <ReviewedByFooter
                                                        reviewer={
                                                            attestation.reviewer
                                                        }
                                                        reviewedAt={
                                                            attestation.reviewed_at
                                                        }
                                                    />
                                                </>
                                            )}
                                        </Form>
                                    </>
                                )}
                            </section>

                            <Separator />

                            <section className="space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-sm font-semibold">
                                        XCEL Training
                                    </h3>
                                    {completion && (
                                        <Badge variant="outline">
                                            {TRAINING_STATUS_LABELS[
                                                completion.status
                                            ] ?? completion.status}
                                        </Badge>
                                    )}
                                </div>

                                {!completion ? (
                                    <NotSubmitted label="XCEL Training certificate" />
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
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

                                        <Form
                                            {...TrainingReviewController.decision.form(
                                                completion.id,
                                            )}
                                            className="space-y-3"
                                        >
                                            {({ processing, errors }) => (
                                                <>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="training-note">
                                                            Note
                                                        </Label>
                                                        <Textarea
                                                            id="training-note"
                                                            name="note"
                                                            rows={2}
                                                            defaultValue={
                                                                completion.note ??
                                                                ''
                                                            }
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.note
                                                            }
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        {TRAINING_DECISION_OPTIONS.map(
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
                                                                        key={
                                                                            value
                                                                        }
                                                                        type="submit"
                                                                        name="status"
                                                                        value={
                                                                            value
                                                                        }
                                                                        variant="outline"
                                                                        className={
                                                                            isActive
                                                                                ? `justify-start ${TRAINING_ACTIVE_CLASSES[value]}`
                                                                                : 'justify-start'
                                                                        }
                                                                        disabled={
                                                                            processing ||
                                                                            isActive
                                                                        }
                                                                        onClick={() =>
                                                                            setClickedTrainingStatus(
                                                                                value,
                                                                            )
                                                                        }
                                                                    >
                                                                        {processing &&
                                                                        clickedTrainingStatus ===
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

                                                    <ReviewedByFooter
                                                        reviewer={
                                                            completion.reviewer
                                                        }
                                                        reviewedAt={
                                                            completion.reviewed_at
                                                        }
                                                    />
                                                </>
                                            )}
                                        </Form>
                                    </>
                                )}
                            </section>

                            <Separator />

                            <section className="space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-sm font-semibold">
                                        License Copy
                                    </h3>
                                    {submission && (
                                        <Badge variant="outline">
                                            {LICENSE_STATUS_LABELS[
                                                submission.status
                                            ] ?? submission.status}
                                        </Badge>
                                    )}
                                </div>

                                {!submission ? (
                                    <NotSubmitted label="License copy" />
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <a
                                                href={
                                                    LicenseReviewController.document(
                                                        submission.id,
                                                    ).url
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <FileText />
                                                View license copy
                                            </a>
                                        </Button>

                                        <Form
                                            {...LicenseReviewController.decision.form(
                                                submission.id,
                                            )}
                                            className="space-y-3"
                                        >
                                            {({ processing, errors }) => (
                                                <>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="license-note">
                                                            Note
                                                        </Label>
                                                        <Textarea
                                                            id="license-note"
                                                            name="note"
                                                            rows={2}
                                                            defaultValue={
                                                                submission.note ??
                                                                ''
                                                            }
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.note
                                                            }
                                                        />
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label htmlFor="license-expires-at">
                                                            Expires on (if
                                                            verifying)
                                                        </Label>
                                                        <input
                                                            id="license-expires-at"
                                                            name="expires_at"
                                                            type="date"
                                                            defaultValue={
                                                                submission.expires_at ??
                                                                ''
                                                            }
                                                            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.expires_at
                                                            }
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        {LICENSE_DECISION_OPTIONS.map(
                                                            ({
                                                                value,
                                                                label,
                                                                icon: Icon,
                                                            }) => {
                                                                const isActive =
                                                                    submission.status ===
                                                                    value;

                                                                return (
                                                                    <Button
                                                                        key={
                                                                            value
                                                                        }
                                                                        type="submit"
                                                                        name="status"
                                                                        value={
                                                                            value
                                                                        }
                                                                        variant="outline"
                                                                        className={
                                                                            isActive
                                                                                ? `justify-start ${LICENSE_ACTIVE_CLASSES[value]}`
                                                                                : 'justify-start'
                                                                        }
                                                                        disabled={
                                                                            processing ||
                                                                            isActive
                                                                        }
                                                                        onClick={() =>
                                                                            setClickedLicenseStatus(
                                                                                value,
                                                                            )
                                                                        }
                                                                    >
                                                                        {processing &&
                                                                        clickedLicenseStatus ===
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

                                                    <ReviewedByFooter
                                                        reviewer={
                                                            submission.reviewer
                                                        }
                                                        reviewedAt={
                                                            submission.reviewed_at
                                                        }
                                                    />
                                                </>
                                            )}
                                        </Form>
                                    </>
                                )}
                            </section>

                            <Separator />

                            <section className="space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-sm font-semibold">
                                        AHIP Certification
                                    </h3>
                                    {certification && (
                                        <Badge variant="outline">
                                            {AHIP_STATUS_LABELS[
                                                certification.status
                                            ] ?? certification.status}
                                        </Badge>
                                    )}
                                </div>

                                {!certification ? (
                                    <NotSubmitted label="AHIP completion certificate" />
                                ) : (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <a
                                                href={
                                                    AhipCertificationReviewController.document(
                                                        certification.id,
                                                    ).url
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <FileText />
                                                View certificate
                                            </a>
                                        </Button>

                                        <Form
                                            {...AhipCertificationReviewController.decision.form(
                                                certification.id,
                                            )}
                                            className="space-y-3"
                                        >
                                            {({ processing, errors }) => (
                                                <>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="ahip-note">
                                                            Note
                                                        </Label>
                                                        <Textarea
                                                            id="ahip-note"
                                                            name="note"
                                                            rows={2}
                                                            defaultValue={
                                                                certification.note ??
                                                                ''
                                                            }
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.note
                                                            }
                                                        />
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label htmlFor="ahip-expires-at">
                                                            Expires on (if
                                                            verifying)
                                                        </Label>
                                                        <input
                                                            id="ahip-expires-at"
                                                            name="expires_at"
                                                            type="date"
                                                            defaultValue={
                                                                certification.expires_at ??
                                                                ''
                                                            }
                                                            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                        />
                                                        <InputError
                                                            message={
                                                                errors.expires_at
                                                            }
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        {AHIP_DECISION_OPTIONS.map(
                                                            ({
                                                                value,
                                                                label,
                                                                icon: Icon,
                                                            }) => {
                                                                const isActive =
                                                                    certification.status ===
                                                                    value;

                                                                return (
                                                                    <Button
                                                                        key={
                                                                            value
                                                                        }
                                                                        type="submit"
                                                                        name="status"
                                                                        value={
                                                                            value
                                                                        }
                                                                        variant="outline"
                                                                        className={
                                                                            isActive
                                                                                ? `justify-start ${AHIP_ACTIVE_CLASSES[value]}`
                                                                                : 'justify-start'
                                                                        }
                                                                        disabled={
                                                                            processing ||
                                                                            isActive
                                                                        }
                                                                        onClick={() =>
                                                                            setClickedAhipStatus(
                                                                                value,
                                                                            )
                                                                        }
                                                                    >
                                                                        {processing &&
                                                                        clickedAhipStatus ===
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

                                                    <ReviewedByFooter
                                                        reviewer={
                                                            certification.reviewer
                                                        }
                                                        reviewedAt={
                                                            certification.reviewed_at
                                                        }
                                                    />
                                                </>
                                            )}
                                        </Form>
                                    </>
                                )}
                            </section>
                        </div>

                        <DialogFooter className="items-center sm:justify-between">
                            <Link
                                href={show(agent.id)}
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Open full review →
                            </Link>
                            <DialogClose asChild>
                                <Button variant="secondary">Close</Button>
                            </DialogClose>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
