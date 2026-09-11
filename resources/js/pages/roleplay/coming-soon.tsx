import { Head } from '@inertiajs/react';
import { Phone, Sparkles } from 'lucide-react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { index } from '@/routes/roleplay';

export default function RoleplayComingSoon() {
    return (
        <>
            <Head title="Sales Roleplay" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Sales Roleplay"
                    description="Practice live sales calls against an AI prospect and get scored on how you handle common objections."
                />

                <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Phone className="size-6" />
                        </div>

                        <div className="space-y-1.5">
                            <h2 className="text-xl font-semibold tracking-tight">
                                RolePlay Call
                            </h2>
                            <Badge
                                variant="outline"
                                className="gap-1 border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                            >
                                <Sparkles className="size-3" />
                                Coming soon
                            </Badge>
                        </div>

                        <p className="max-w-md text-sm text-muted-foreground">
                            We&apos;re putting the finishing touches on live AI
                            roleplay calls — practice real objections, get
                            scored, and sharpen your pitch before it counts.
                            Check back soon.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

RoleplayComingSoon.layout = {
    breadcrumbs: [
        {
            title: 'Sales Roleplay',
            href: index(),
        },
    ],
};
