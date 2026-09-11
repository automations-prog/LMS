// Shared status-label maps for the four onboarding pipeline stages
// (eligibility, XCEL training, license, AHIP) — used by both the combined
// Onboarding Review table (pages/admin/onboarding/index.tsx) and the admin
// dashboard's status filters (pages/dashboard.tsx) so the two stay in sync.

export const ELIGIBILITY_STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    flagged_for_waiver: 'Flagged for waiver',
    cleared: 'Eligible',
    not_eligible: 'Not eligible',
};

export const TRAINING_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

export const LICENSE_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};

export const AHIP_STATUS_LABELS: Record<string, string> = {
    pending_review: 'Pending review',
    verified: 'Verified',
    rejected: 'Rejected',
};
