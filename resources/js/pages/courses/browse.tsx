import { Head, router } from '@inertiajs/react';
import { ExternalLink, FileText, Search } from 'lucide-react';
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
                            className="pl-9"
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
                        <SelectTrigger className="w-44">
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
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {courses.map((course) => (
                            <Card key={course.id} className="overflow-hidden">
                                {course.thumbnail_url ? (
                                    <img
                                        src={course.thumbnail_url}
                                        alt=""
                                        className="h-36 w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-36 w-full items-center justify-center bg-muted text-muted-foreground">
                                        <FileText className="size-8" />
                                    </div>
                                )}

                                <CardHeader>
                                    <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="line-clamp-1">
                                            {course.title}
                                        </CardTitle>
                                        {course.category && (
                                            <Badge variant="secondary">
                                                {course.category.name}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardDescription className="line-clamp-2">
                                        {course.description}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {course.due_days
                                            ? `Complete within ${course.due_days} days`
                                            : 'No due date'}
                                    </p>
                                </CardContent>

                                <CardFooter>
                                    <Button asChild className="w-full">
                                        <a
                                            href={course.resource_url ?? '#'}
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
