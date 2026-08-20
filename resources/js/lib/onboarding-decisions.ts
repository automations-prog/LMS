// Shared status labels, badge/active-button classes, decision options, and
// date formatting for the onboarding review surfaces — the detail page
// (pages/admin/onboarding/show.tsx) and the quick-update dialog
// (components/onboarding-update-dialog.tsx) both render the same four
// decision types, so these live here once instead of being redeclared per
// file.

import {
    Calendar,
    CircleCheck,
    CircleX,
    Flag,
    ShieldAlert,
    ShieldCheck,
} from 'lucide-react';

export const ELIGIBILITY_STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    flagged_for_waiver: 'Flagged for waiver',
    cleared: 'Eligible',
    not_eligible: 'Not eligible',
};

export const ELIGIBILITY_ACTIVE_CLASSES: Record<string, string> = {
    pending:
        'border-transparent bg-slate-600 text-white hover:bg-slate-600 dark:bg-slate-500',
    flagged_for_waiver:
        'border-transparent bg-amber-600 text-white hover:bg-amber-600 dark:bg-amber-500',
    cleared:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
    not_eligible:
        'border-transparent bg-red-600 text-white hover:bg-red-600 dark:bg-red-500',
};

export const ELIGIBILITY_DECISION_OPTIONS: {
    value: string;
    label: string;
    icon: typeof Flag;
}[] = [
    { value: 'pending', label: 'Pending', icon: Calendar },
    { value: 'flagged_for_waiver', label: 'Flag for review', icon: Flag },
    { value: 'not_eligible', label: 'Not eligible', icon: ShieldAlert },
    { value: 'cleared', label: 'Eligible', icon: ShieldCheck },
];

export const TRAINING_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

export const TRAINING_ACTIVE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-600 text-white hover:bg-slate-600 dark:bg-slate-500',
    rejected:
        'border-transparent bg-red-600 text-white hover:bg-red-600 dark:bg-red-500',
    verified:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
};

export const TRAINING_DECISION_OPTIONS: {
    value: string;
    label: string;
    icon: typeof Calendar;
}[] = [
    { value: 'pending_review', label: 'Pending review', icon: Calendar },
    { value: 'rejected', label: 'Rejected', icon: CircleX },
    { value: 'verified', label: 'Verified', icon: CircleCheck },
];

export const LICENSE_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

export const LICENSE_ACTIVE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-600 text-white hover:bg-slate-600 dark:bg-slate-500',
    rejected:
        'border-transparent bg-red-600 text-white hover:bg-red-600 dark:bg-red-500',
    verified:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
};

export const LICENSE_DECISION_OPTIONS: {
    value: string;
    label: string;
    icon: typeof Calendar;
}[] = [
    { value: 'pending_review', label: 'Pending review', icon: Calendar },
    { value: 'rejected', label: 'Rejected', icon: CircleX },
    { value: 'verified', label: 'Verified', icon: CircleCheck },
];

export const AHIP_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

export const AHIP_ACTIVE_CLASSES: Record<string, string> = {
    pending_review:
        'border-transparent bg-slate-600 text-white hover:bg-slate-600 dark:bg-slate-500',
    rejected:
        'border-transparent bg-red-600 text-white hover:bg-red-600 dark:bg-red-500',
    verified:
        'border-transparent bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500',
};

export const AHIP_DECISION_OPTIONS: {
    value: string;
    label: string;
    icon: typeof Calendar;
}[] = [
    { value: 'pending_review', label: 'Pending review', icon: Calendar },
    { value: 'rejected', label: 'Rejected', icon: CircleX },
    { value: 'verified', label: 'Verified', icon: CircleCheck },
];

export const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
});

// Mirrors App\Support\ContractingStages::DEPENDENCIES on the backend —
// stage => the other stage that must already be checked before this one
// can be. `confirmed` has no prerequisite. `carrier_certs` only needs
// `forwarded`; it's an optional side branch, not required for `complete`.
export const CONTRACTING_STAGE_DEPENDENCIES: Record<string, string> = {
    forwarded: 'confirmed',
    issued: 'forwarded',
    carrier_certs: 'forwarded',
    complete: 'issued',
};

/**
 * Toggle a contracting stage on/off in a checked-stages list. Checking a
 * stage just adds it; unchecking one also cascades to remove anything that
 * (transitively) depends on it — e.g. unchecking `forwarded` also drops
 * `issued`, `carrier_certs`, and `complete` — so the set submitted to the
 * server is never left in an inconsistent, half-ordered state.
 */
export function toggleContractingStage(
    current: string[],
    stage: string,
    checked: boolean,
): string[] {
    if (checked) {
        return current.includes(stage) ? current : [...current, stage];
    }

    const toRemove = new Set([stage]);

    let changed = true;
    while (changed) {
        changed = false;

        for (const [dependent, prerequisite] of Object.entries(
            CONTRACTING_STAGE_DEPENDENCIES,
        )) {
            if (toRemove.has(prerequisite) && !toRemove.has(dependent)) {
                toRemove.add(dependent);
                changed = true;
            }
        }
    }

    return current.filter((existing) => !toRemove.has(existing));
}

/**
 * Whether a contracting stage's checkbox should be disabled because its
 * prerequisite hasn't been checked yet.
 */
export function isContractingStageDisabled(
    current: string[],
    stage: string,
): boolean {
    const prerequisite = CONTRACTING_STAGE_DEPENDENCIES[stage];

    return prerequisite !== undefined && !current.includes(prerequisite);
}
