import { Head } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import Heading from '@/components/heading';
import { dashboard } from '@/routes';

export default function PendingReview() {
    return (
        <>
            <Head title="Eligibility pending review" />

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

PendingReview.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Eligibility',
            href: '#',
        },
    ],
};
