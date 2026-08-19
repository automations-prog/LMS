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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
    AHIP_DECISION_OPTIONS,
    ELIGIBILITY_DECISION_OPTIONS,
    LICENSE_DECISION_OPTIONS,
    TRAINING_DECISION_OPTIONS,
} from '@/lib/onboarding-decisions';

type Category = 'eligibility' | 'training' | 'license' | 'ahip';

const CATEGORIES: {
    value: Category;
    label: string;
    options: { value: string; label: string }[];
    hasNote: boolean;
    bulkDecisionForm: () => ReturnType<
        typeof EligibilityReviewController.bulkDecision.form
    >;
}[] = [
    {
        value: 'eligibility',
        label: 'Eligibility',
        options: ELIGIBILITY_DECISION_OPTIONS,
        hasNote: false,
        bulkDecisionForm: () => EligibilityReviewController.bulkDecision.form(),
    },
    {
        value: 'training',
        label: 'XCEL Training',
        options: TRAINING_DECISION_OPTIONS,
        hasNote: true,
        bulkDecisionForm: () => TrainingReviewController.bulkDecision.form(),
    },
    {
        value: 'license',
        label: 'License Copy',
        options: LICENSE_DECISION_OPTIONS,
        hasNote: true,
        bulkDecisionForm: () => LicenseReviewController.bulkDecision.form(),
    },
    {
        value: 'ahip',
        label: 'AHIP Certification',
        options: AHIP_DECISION_OPTIONS,
        hasNote: true,
        bulkDecisionForm: () =>
            AhipCertificationReviewController.bulkDecision.form(),
    },
];

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
    const [categoryValue, setCategoryValue] = useState<Category>(
        CATEGORIES[0].value,
    );
    const [status, setStatus] = useState('');

    const category = CATEGORIES.find((c) => c.value === categoryValue)!;

    // Switching category invalidates whatever status was picked for the
    // previous one — its options (and note requirement) don't carry over.
    function handleCategoryChange(value: Category) {
        setCategoryValue(value);
        setStatus('');
    }

    function handleOpenChange(nextOpen: boolean) {
        onOpenChange(nextOpen);

        if (!nextOpen) {
            setCategoryValue(CATEGORIES[0].value);
            setStatus('');
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="gap-6">
                <DialogHeader className="gap-1.5">
                    <DialogTitle>
                        Update {selectedCount} agent
                        {selectedCount === 1 ? '' : 's'}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Agents without a submission for the chosen category are
                        skipped.
                    </p>
                </DialogHeader>

                <Form
                    key={categoryValue}
                    {...category.bulkDecisionForm()}
                    onSuccess={() => {
                        handleOpenChange(false);
                        onSuccess();
                    }}
                    className="space-y-5"
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

                            <div className="grid gap-2.5">
                                <Label>Category</Label>
                                <Select
                                    value={categoryValue}
                                    onValueChange={(value) =>
                                        handleCategoryChange(value as Category)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map((c) => (
                                            <SelectItem
                                                key={c.value}
                                                value={c.value}
                                            >
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2.5">
                                <Label htmlFor="bulk-status">
                                    Set status to
                                </Label>
                                <Select
                                    name="status"
                                    value={status}
                                    onValueChange={setStatus}
                                >
                                    <SelectTrigger
                                        id="bulk-status"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {category.options.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.status} />
                            </div>

                            {category.hasNote && status === 'rejected' && (
                                <div className="grid gap-2.5">
                                    <Label htmlFor="bulk-note">Note</Label>
                                    <Textarea
                                        id="bulk-note"
                                        name="note"
                                        rows={3}
                                        placeholder="Applied to every selected agent's record."
                                    />
                                    <InputError message={errors.note} />
                                </div>
                            )}

                            <DialogFooter className="gap-2 pt-2">
                                <DialogClose asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={processing || !status}
                                >
                                    {processing && <Spinner />}
                                    Update
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
