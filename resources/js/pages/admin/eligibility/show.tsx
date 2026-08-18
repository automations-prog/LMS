import { Form, Head } from '@inertiajs/react';
import EligibilityReviewController from '@/actions/App/Http/Controllers/EligibilityReviewController';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { index } from '@/routes/eligibility';

const STATUS_LABELS: Record<string, string> = {
    flagged_for_waiver: 'Flagged for waiver',
    cleared: 'Cleared',
    not_eligible: 'Not eligible',
};

type Attestation = {
    id: number;
    status: string;
    date_of_birth: string;
    home_state: string;
    has_felony_conviction: boolean;
    felony_details: string | null;
    is_us_citizen: boolean;
    work_authorization_path: string | null;
    created_at: string;
    reviewed_at: string | null;
    user: { name: string; email: string };
    reviewer: { name: string } | null;
};

type Props = {
    attestation: Attestation;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
        </div>
    );
}

export default function EligibilityShow({ attestation }: Props) {
    const isPending = attestation.status === 'flagged_for_waiver';

    return (
        <>
            <Head title="Eligibility review" />

            <div className="mx-auto flex h-full max-w-2xl flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title={attestation.user.name}
                        description={attestation.user.email}
                    />
                    <Badge variant="outline">
                        {STATUS_LABELS[attestation.status] ??
                            attestation.status}
                    </Badge>
                </div>

                <dl className="grid grid-cols-2 gap-4 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                    <Field label="Date of birth" value={attestation.date_of_birth} />
                    <Field label="Home state" value={attestation.home_state} />
                    <Field
                        label="Felony conviction"
                        value={attestation.has_felony_conviction ? 'Yes' : 'No'}
                    />
                    <Field
                        label="U.S. citizen"
                        value={attestation.is_us_citizen ? 'Yes' : 'No'}
                    />
                    {attestation.felony_details && (
                        <div className="col-span-2">
                            <Field
                                label="Felony details"
                                value={attestation.felony_details}
                            />
                        </div>
                    )}
                    {attestation.work_authorization_path && (
                        <div className="col-span-2">
                            <dt className="text-sm text-muted-foreground">
                                Work authorization document
                            </dt>
                            <dd className="mt-1">
                                <Button variant="outline" size="sm" asChild>
                                    <a
                                        href={
                                            EligibilityReviewController.document(
                                                attestation.id,
                                            ).url
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        View document
                                    </a>
                                </Button>
                            </dd>
                        </div>
                    )}
                    {attestation.reviewer && (
                        <Field
                            label="Reviewed by"
                            value={attestation.reviewer.name}
                        />
                    )}
                </dl>

                {isPending && (
                    <Form
                        {...EligibilityReviewController.decision.form(
                            attestation.id,
                        )}
                        className="flex justify-end gap-2"
                    >
                        {({ processing }) => (
                            <>
                                <Button
                                    type="submit"
                                    name="status"
                                    value="not_eligible"
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Not eligible
                                </Button>
                                <Button
                                    type="submit"
                                    name="status"
                                    value="cleared"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Clear
                                </Button>
                            </>
                        )}
                    </Form>
                )}
            </div>
        </>
    );
}

EligibilityShow.layout = {
    breadcrumbs: [
        {
            title: 'Eligibility review',
            href: index(),
        },
        {
            title: 'Review',
            href: '#',
        },
    ],
};
