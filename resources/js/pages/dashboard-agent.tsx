import { Head } from '@inertiajs/react';
import { Clock, TriangleAlert } from 'lucide-react';
import Heading from '@/components/heading';
import { dashboard } from '@/routes';

const EXPIRY_WARNING_DAYS = 30;

function daysUntil(dateStr: string): number {
    const target = new Date(`${dateStr}T00:00:00`).getTime();

    return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

function CredentialExpiryBanners({
    licenseStatus,
    licenseExpiresAt,
    ahipStatus,
    ahipExpiresAt,
}: {
    licenseStatus: 'pending_review' | 'verified' | 'rejected' | null;
    licenseExpiresAt: string | null;
    ahipStatus: 'pending_review' | 'verified' | 'rejected' | null;
    ahipExpiresAt: string | null;
}) {
    const warnings = [
        licenseStatus === 'verified' &&
            licenseExpiresAt && {
                key: 'license',
                label: 'license',
                days: daysUntil(licenseExpiresAt),
            },
        ahipStatus === 'verified' &&
            ahipExpiresAt && {
                key: 'ahip',
                label: 'AHIP certification',
                days: daysUntil(ahipExpiresAt),
            },
    ].filter((warning) => warning && warning.days <= EXPIRY_WARNING_DAYS) as {
        key: string;
        label: string;
        days: number;
    }[];

    if (warnings.length === 0) {
        return null;
    }

    return (
        <div className="flex w-full flex-col gap-2">
            {warnings.map((warning) => (
                <div
                    key={warning.key}
                    className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                    <TriangleAlert className="size-4 shrink-0" />
                    <span>
                        {warning.days < 0
                            ? `Your ${warning.label} has expired.`
                            : `Your ${warning.label} expires in ${warning.days} day${warning.days === 1 ? '' : 's'}.`}{' '}
                        Please renew it soon.
                    </span>
                </div>
            ))}
        </div>
    );
}

type Props = {
    eligibilityStatus: 'under_review' | 'cleared' | 'not_eligible';
    licenseStatus: 'pending_review' | 'verified' | 'rejected' | null;
    licenseExpiresAt: string | null;
    ahipStatus: 'pending_review' | 'verified' | 'rejected' | null;
    ahipExpiresAt: string | null;
};

export default function DashboardAgent({
    eligibilityStatus,
    licenseStatus,
    licenseExpiresAt,
    ahipStatus,
    ahipExpiresAt,
}: Props) {
    if (eligibilityStatus === 'under_review') {
        return (
            <>
                <Head title="Dashboard" />

                <div className="mx-auto flex h-full max-w-lg flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Clock className="size-6" />
                    </div>

                    <Heading
                        variant="small"
                        title="Your eligibility is under review"
                        description="Thanks for submitting your eligibility attestation. A coach or admin will review it shortly, and we'll let you know by email once a decision has been made."
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col p-4">
                <CredentialExpiryBanners
                    licenseStatus={licenseStatus}
                    licenseExpiresAt={licenseExpiresAt}
                    ahipStatus={ahipStatus}
                    ahipExpiresAt={ahipExpiresAt}
                />
            </div>
        </>
    );
}

DashboardAgent.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
