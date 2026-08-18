import { Head, Link, usePage } from '@inertiajs/react';
import { ExternalLink, FileText } from 'lucide-react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { brandButtonClass } from '@/lib/brand-theme';
import { browse } from '@/routes/courses';
import { dashboard } from '@/routes';
import type { Auth } from '@/types';

type Category = {
    id: number;
    name: string;
};

type RecentResource = {
    id: number;
    title: string;
    category: Category | null;
    resource_type: 'pdf' | 'link';
    resource_url: string | null;
    thumbnail_url: string | null;
};

type Stats = {
    available: number;
    categories: number;
    added_this_week: number;
};

type Props = {
    stats: Stats;
    recent: RecentResource[];
};

const STAT_CARDS: { key: keyof Stats; label: string }[] = [
    { key: 'available', label: 'Available resources' },
    { key: 'categories', label: 'Categories' },
    { key: 'added_this_week', label: 'Added this week' },
];

export default function DashboardAgent({ stats, recent }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;

    return (
        <>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Here's what's available for you to complete.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    {STAT_CARDS.map((card) => (
                        <div
                            key={card.key}
                            className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
                        >
                            <p className="text-sm text-muted-foreground">
                                {card.label}
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                                {stats[card.key]}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                            Recently added resources
                        </p>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={browse()}>View all resources</Link>
                        </Button>
                    </div>

                    {recent.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            No resources available yet.
                        </p>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {recent.map((resource) => (
                                <Card
                                    key={resource.id}
                                    className="gap-0 overflow-hidden rounded-2xl border-[#ece7f5] py-0 dark:border-sidebar-border"
                                >
                                    {resource.thumbnail_url ? (
                                        <img
                                            src={resource.thumbnail_url}
                                            alt=""
                                            className="h-20 w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-20 w-full items-center justify-center bg-muted text-muted-foreground">
                                            <FileText className="size-5" />
                                        </div>
                                    )}
                                    <CardHeader className="px-3 pt-3 pb-0">
                                        <CardTitle className="line-clamp-1 text-sm">
                                            {resource.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="px-3 py-1 text-xs text-muted-foreground">
                                        {resource.category?.name ??
                                            'Uncategorized'}
                                    </CardContent>
                                    <CardFooter className="px-3 pt-2 pb-3">
                                        <Button
                                            asChild
                                            size="sm"
                                            className={`w-full ${brandButtonClass}`}
                                        >
                                            <a
                                                href={
                                                    resource.resource_url ??
                                                    '#'
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {resource.resource_type ===
                                                'pdf' ? (
                                                    <FileText className="size-4" />
                                                ) : (
                                                    <ExternalLink className="size-4" />
                                                )}
                                                Open resource
                                            </a>
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
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
