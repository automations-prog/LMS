import { Head, router } from '@inertiajs/react';
import { Clock, ExternalLink, FileText, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    brandButtonClass,
    resourceBadgeClass,
    resourceCardClass,
    resourceInputClass,
} from '@/lib/brand-theme';
import { browse } from '@/routes/courses';

type Category = {
    id: number;
    name: string;
};

type CourseCard = {
    id: number;
    title: string;
    description: string;
    category: Category | null;
    due_days: number | null;
    due_in_days: number | null;
    progress_percent: number | null;
    resource_type: 'pdf' | 'link';
    resource_url: string | null;
    thumbnail_url: string | null;
};

type Filters = {
    search: string;
    category: string;
};

type Props = {
    courses: CourseCard[];
    categories: Category[];
    filters: Filters;
};

function applyFilters(overrides: Partial<Filters>, filters: Filters) {
    router.get(
        browse().url,
        { ...filters, ...overrides },
        { preserveState: true, preserveScroll: true, replace: true },
    );
}

export default function CoursesBrowse({ courses, categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            applyFilters({ search }, filters);
        }, 300);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <>
            <Head title="Resources" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Resources"
                    description="Browse and complete your assigned training"
                />

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search resources..."
                            className={`pl-9 ${resourceInputClass}`}
                        />
                    </div>

                    <Select
                        value={
                            filters.category === '' ? 'all' : filters.category
                        }
                        onValueChange={(value) =>
                            applyFilters(
                                { category: value === 'all' ? '' : value },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className={`w-44 ${resourceInputClass}`}>
                            <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All categories
                            </SelectItem>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={String(category.id)}
                                >
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {courses.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                        No resources available yet.
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {courses.map((course) => (
                            <Card
                                key={course.id}
                                className={`gap-0 py-0 ${resourceCardClass}`}
                            >
                                {course.thumbnail_url ? (
                                    <img
                                        src={course.thumbnail_url}
                                        alt=""
                                        className="h-24 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-24 w-full items-center justify-center bg-muted text-muted-foreground">
                                        <FileText className="size-6" />
                                    </div>
                                )}

                                <CardHeader className="gap-1 px-4 pt-3 pb-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="line-clamp-1 text-sm">
                                            {course.title}
                                        </CardTitle>
                                        {course.category && (
                                            <Badge
                                                className={`shrink-0 text-xs ${resourceBadgeClass}`}
                                            >
                                                {course.category.name}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardDescription className="line-clamp-1 text-xs">
                                        {course.description}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="px-4 py-2">
                                    {course.due_days &&
                                    course.progress_percent !== null ? (
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${course.progress_percent}%`,
                                                        background:
                                                            'linear-gradient(90deg, #473364, #f598ff)',
                                                    }}
                                                />
                                            </div>
                                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="size-3" />
                                                {course.due_in_days}d left
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            No due date
                                        </p>
                                    )}
                                </CardContent>

                                <CardFooter className="px-4 pt-2 pb-4">
                                    <Button
                                        asChild
                                        size="sm"
                                        className={`w-full ${brandButtonClass}`}
                                    >
                                        <a
                                            href={
                                                course.resource_url ?? '#'
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {course.resource_type === 'pdf' ? (
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
        </>
    );
}

CoursesBrowse.layout = {
    breadcrumbs: [
        {
            title: 'Resources',
            href: browse(),
        },
    ],
};
