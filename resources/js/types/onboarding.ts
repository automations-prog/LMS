// Shared shapes for the onboarding review pages — the list
// (pages/admin/onboarding/index.tsx), the detail page
// (pages/admin/onboarding/show.tsx), and the quick-update dialog
// (components/onboarding-update-dialog.tsx) all render the same four
// relations, so their types live here once instead of being redeclared
// per file.

export type EligibilityAttestation = {
    id: number;
    status: string;
    date_of_birth: string;
    home_state: string;
    has_felony_conviction: boolean;
    felony_details: string | null;
    is_us_citizen: boolean;
    work_authorization_path: string | null;
    enrollment_completed_at: string | null;
    line_of_authority: string | null;
    exam_scheduled_at: string | null;
    proctoring_type: string | null;
    fingerprinting_completed_at: string | null;
    license_application_submitted_at: string | null;
    contracting_confirmed_at: string | null;
    contracting_forwarded_at: string | null;
    contracting_issued_at: string | null;
    contracting_carrier_certs_at: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewer: { name: string } | null;
};

export type TrainingCompletion = {
    id: number;
    status: string;
    note: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewer: { name: string } | null;
};

export type LicenseSubmission = {
    id: number;
    status: string;
    note: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewer: { name: string } | null;
};

export type AhipCertification = {
    id: number;
    status: string;
    note: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewer: { name: string } | null;
};

export type OnboardingAgent = {
    id: number;
    name: string;
    email: string;
    eligibility_attestation: EligibilityAttestation | null;
    training_completion: TrainingCompletion | null;
    license_submission: LicenseSubmission | null;
    ahip_certification: AhipCertification | null;
};
