import { Form } from '@inertiajs/react';
import { useState } from 'react';
import AhipCertificationReviewController from '@/actions/App/Http/Controllers/AhipCertificationReviewController';
import EligibilityReviewController from '@/actions/App/Http/Controllers/EligibilityReviewController';
import LicenseReviewController from '@/actions/App/Http/Controllers/LicenseReviewController';
import TrainingReviewController from '@/actions/App/Http/Controllers/TrainingReviewController';
import InputError from '@/components/input-error';
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
    AHIP_DECISION_OPTIONS,
    ELIGIBILITY_DECISION_OPTIONS,
    LICENSE_DECISION_OPTIONS,
    TRAINING_DECISION_OPTIONS,
} from '@/lib/onboarding-decisions';

type Props = {
    selectedCount: number;
    selectedIds: number[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
};

export default function OnboardingBulkUpdateDialog({
    selectedCount,
    selectedIds,
    open,
    onOpenChange,
    onSuccess,
}: Props) {
    // Same convention as onboarding-update-dialog.tsx: `processing` from a
    // Form render-prop is shared by that whole <form>, not per-button — track
    // which button was actually clicked so only that one shows a spinner
    // while the request is in flight.
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

    function handleSuccess() {
        onOpenChange(false);
        onSuccess();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        Update {selectedCount} agent
                        {selectedCount === 1 ? '' : 's'}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Pick a status below to apply it to every selected agent.
                        Agents without a submission for that category are
                        skipped.
                    </p>
                </DialogHeader>

                <div className="space-y-6">
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold">Eligibility</h3>

                        <Form
                            {...EligibilityReviewController.bulkDecision.form()}
                            onSuccess={handleSuccess}
                            className="space-y-3"
                        >
                            {({ processing }) => (
                                <>
                                    {selectedIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="user_ids[]"
                                            value={id}
                                        />
                                    ))}

                                    <div className="grid grid-cols-2 gap-2">
                                        {ELIGIBILITY_DECISION_OPTIONS.map(
                                            ({ value, label, icon: Icon }) => (
                                                <Button
                                                    key={value}
                                                    type="submit"
                                                    name="status"
                                                    value={value}
                                                    variant="outline"
                                                    className="justify-start"
                                                    disabled={processing}
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
                                            ),
                                        )}
                                    </div>
                                </>
                            )}
                        </Form>
                    </section>

                    <Separator />

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold">XCEL Training</h3>

                        <Form
                            {...TrainingReviewController.bulkDecision.form()}
                            onSuccess={handleSuccess}
                            className="space-y-3"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {selectedIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="user_ids[]"
                                            value={id}
                                        />
                                    ))}

                                    <div className="grid gap-2">
                                        <Label htmlFor="bulk-training-note">
                                            Note
                                        </Label>
                                        <Textarea
                                            id="bulk-training-note"
                                            name="note"
                                            rows={2}
                                            placeholder="Required when rejecting — applied to every selected agent."
                                        />
                                        <InputError message={errors.note} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {TRAINING_DECISION_OPTIONS.map(
                                            ({ value, label, icon: Icon }) => (
                                                <Button
                                                    key={value}
                                                    type="submit"
                                                    name="status"
                                                    value={value}
                                                    variant="outline"
                                                    className="justify-start"
                                                    disabled={processing}
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
                                            ),
                                        )}
                                    </div>
                                </>
                            )}
                        </Form>
                    </section>

                    <Separator />

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold">License Copy</h3>

                        <Form
                            {...LicenseReviewController.bulkDecision.form()}
                            onSuccess={handleSuccess}
                            className="space-y-3"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {selectedIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="user_ids[]"
                                            value={id}
                                        />
                                    ))}

                                    <div className="grid gap-2">
                                        <Label htmlFor="bulk-license-note">
                                            Note
                                        </Label>
                                        <Textarea
                                            id="bulk-license-note"
                                            name="note"
                                            rows={2}
                                            placeholder="Required when rejecting — applied to every selected agent."
                                        />
                                        <InputError message={errors.note} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {LICENSE_DECISION_OPTIONS.map(
                                            ({ value, label, icon: Icon }) => (
                                                <Button
                                                    key={value}
                                                    type="submit"
                                                    name="status"
                                                    value={value}
                                                    variant="outline"
                                                    className="justify-start"
                                                    disabled={processing}
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
                                            ),
                                        )}
                                    </div>
                                </>
                            )}
                        </Form>
                    </section>

                    <Separator />

                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold">
                            AHIP Certification
                        </h3>

                        <Form
                            {...AhipCertificationReviewController.bulkDecision.form()}
                            onSuccess={handleSuccess}
                            className="space-y-3"
                        >
                            {({ processing, errors }) => (
                                <>
                                    {selectedIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="user_ids[]"
                                            value={id}
                                        />
                                    ))}

                                    <div className="grid gap-2">
                                        <Label htmlFor="bulk-ahip-note">
                                            Note
                                        </Label>
                                        <Textarea
                                            id="bulk-ahip-note"
                                            name="note"
                                            rows={2}
                                            placeholder="Required when rejecting — applied to every selected agent."
                                        />
                                        <InputError message={errors.note} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        {AHIP_DECISION_OPTIONS.map(
                                            ({ value, label, icon: Icon }) => (
                                                <Button
                                                    key={value}
                                                    type="submit"
                                                    name="status"
                                                    value={value}
                                                    variant="outline"
                                                    className="justify-start"
                                                    disabled={processing}
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
                                            ),
                                        )}
                                    </div>
                                </>
                            )}
                        </Form>
                    </section>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="secondary">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
