import {
    BadgeCheck,
    BookOpen,
    ClipboardCheck,
    Fingerprint,
    GraduationCap,
    Handshake,
    PencilLine,
    ShieldCheck,
} from 'lucide-react';

/**
 * One icon per onboarding stage, shared between the journey path on the
 * dashboard and each stage's own card header, so the same visual identity
 * carries through the whole flow.
 */
export const ONBOARDING_ICONS = {
    eligibility: ClipboardCheck,
    enrollment: BookOpen,
    training: GraduationCap,
    exam: PencilLine,
    fingerprinting: Fingerprint,
    license: BadgeCheck,
    ahip: ShieldCheck,
    contracting: Handshake,
} as const;

export type OnboardingStageKey = keyof typeof ONBOARDING_ICONS;
