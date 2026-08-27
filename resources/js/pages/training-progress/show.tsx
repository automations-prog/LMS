import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Award,
    BookOpen,
    CalendarClock,
    CalendarRange,
    CheckCircle2,
    ChevronDown,
    Circle,
    Clock3,
    GraduationCap,
    ListChecks,
    ListOrdered,
    Sparkles,
    Trophy,
} from 'lucide-react';
import type { ComponentType } from 'react';
import Heading from '@/components/heading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { StageIcon } from '@/components/ui/stage-icon';
import { dateFormatter } from '@/lib/onboarding-decisions';
import { dashboard } from '@/routes';
import { show as onboardingShow } from '@/routes/onboarding';

// The Customer API's per-user trainingprogress endpoint returns each
// program with PascalCase keys (confirmed against the live response) —
// `completionDate` is the one exception, returned lowercase. The nested
// course lists (RequiredCourses etc.) are camelCase instead.
type TrainingCourse = {
    id?: number;
    name?: string;
    status?: string;
    highScore?: number;
    courseType?: string;
};

type TrainingProgramMetadata = {
    ID?: number;
    EnrollmentId?: number;
    Name?: string;
    Status?: string;
    IsCompleted?: boolean;
    StartDate?: string | null;
    EndDate?: string | null;
    DueDate?: string | null;
    completionDate?: string | null;
    ProgressAll?: number;
    ProgressRequired?: number;
    FinalExamScore?: number;
    RequiredCoursesCount?: number;
    RequiredCoursesCompleted?: number;
    RequiredCourses?: TrainingCourse[];
    ElectiveCoursesCount?: number;
    ElectiveCoursesCompleted?: number;
    ElectiveCourses?: TrainingCourse[];
    OptionalCoursesCount?: number;
    OptionalCoursesCompleted?: number;
    OptionalCourses?: TrainingCourse[];
    FinalCoursesCount?: number;
    FinalCoursesCompleted?: number;
    FinalCourses?: TrainingCourse[];
    PrerequisiteCoursesCount?: number;
    PrerequisiteCoursesCompleted?: number;
    PrerequisiteCourses?: TrainingCourse[];
};

type TrainingProgramRow = {
    id: number;
    enrollment_id: string | null;
    metadata: TrainingProgramMetadata | null;
    synced_at: string | null;
};

type Props = {
    agent: { id: number; name: string; email: string };
    programs: TrainingProgramRow[];
    isOwnProgress: boolean;
};

const STATUS_STYLES: Record<string, string> = {
    'Not Started': 'border-transparent bg-secondary text-secondary-foreground',
    'In Progress':
        'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    Completed:
        'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
};

const DEFAULT_STATUS_STYLE =
    'border-transparent bg-secondary text-secondary-foreground';

const COURSE_SECTIONS: {
    label: string;
    icon: ComponentType<{ className?: string }>;
    coursesKey: keyof TrainingProgramMetadata;
    completedKey: keyof TrainingProgramMetadata;
    countKey: keyof TrainingProgramMetadata;
}[] = [
    {
        label: 'Required courses',
        icon: BookOpen,
        coursesKey: 'RequiredCourses',
        completedKey: 'RequiredCoursesCompleted',
        countKey: 'RequiredCoursesCount',
    },
    {
        label: 'Elective courses',
        icon: Sparkles,
        coursesKey: 'ElectiveCourses',
        completedKey: 'ElectiveCoursesCompleted',
        countKey: 'ElectiveCoursesCount',
    },
    {
        label: 'Optional courses',
        icon: ListChecks,
        coursesKey: 'OptionalCourses',
        completedKey: 'OptionalCoursesCompleted',
        countKey: 'OptionalCoursesCount',
    },
    {
        label: 'Final courses',
        icon: Trophy,
        coursesKey: 'FinalCourses',
        completedKey: 'FinalCoursesCompleted',
        countKey: 'FinalCoursesCount',
    },
    {
        label: 'Prerequisite courses',
        icon: ListOrdered,
        coursesKey: 'PrerequisiteCourses',
        completedKey: 'PrerequisiteCoursesCompleted',
        countKey: 'PrerequisiteCoursesCount',
    },
];

function formatDate(value?: string | null) {
    return value ? dateFormatter.format(new Date(value)) : '—';
}

function courseStatusIcon(status?: string) {
    if (!status) {
        return Circle;
    }

    if (/completed|success|pass/i.test(status)) {
        return CheckCircle2;
    }

    if (/progress|started/i.test(status) && !/not started/i.test(status)) {
        return Clock3;
    }

    return Circle;
}

function courseStatusClass(status?: string) {
    if (!status) {
        return 'text-muted-foreground';
    }

    if (/completed|success|pass/i.test(status)) {
        return 'text-emerald-500';
    }

    if (/progress|started/i.test(status) && !/not started/i.test(status)) {
        return 'text-amber-500';
    }

    return 'text-muted-foreground';
}

function InfoTile({
    icon: Icon,
    label,
    value,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
                <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {label}
                </p>
                <p className="truncate text-sm font-medium">{value}</p>
            </div>
        </div>
    );
}

function CourseSection({
    label,
    icon: Icon,
    courses,
    completed,
    count,
}: {
    label: string;
    icon: ComponentType<{ className?: string }>;
    courses: TrainingCourse[];
    completed?: number;
    count?: number;
}) {
    if (courses.length === 0) {
        return null;
    }

    const total = count ?? courses.length;
    const done = completed ?? 0;
    const complete = total > 0 && done >= total;

    return (
        <Collapsible className="group/section overflow-hidden rounded-lg border">
            <CollapsibleTrigger className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/50">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{label}</span>
                <span
                    className={`text-xs font-medium ${complete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
                >
                    {done} / {total}
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/section:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="divide-y border-t">
                    {courses.map((course) => {
                        const StatusIcon = courseStatusIcon(course.status);

                        return (
                            <div
                                key={course.id ?? course.name}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-sm"
                            >
                                <StatusIcon
                                    className={`size-3.5 shrink-0 ${courseStatusClass(course.status)}`}
                                />
                                <span className="min-w-0 flex-1 truncate text-foreground">
                                    {course.name ?? 'Untitled course'}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    {course.status ?? 'Unknown'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function ProgramCard({ program }: { program: TrainingProgramRow }) {
    const meta = program.metadata ?? {};
    const status = meta.Status ?? 'Unknown';
    const progress = Math.min(100, Math.max(0, meta.ProgressAll ?? 0));
    const required = meta.ProgressRequired;

    return (
        <Card className="overflow-hidden py-0">
            <CardHeader className="gap-0 border-b bg-muted/20 py-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <StageIcon icon={GraduationCap} />
                        <div>
                            <h3 className="text-base leading-tight font-semibold">
                                {meta.Name ?? 'Training program'}
                            </h3>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Due {formatDate(meta.DueDate)}
                            </p>
                        </div>
                    </div>
                    <Badge
                        className={
                            STATUS_STYLES[status] ?? DEFAULT_STATUS_STYLE
                        }
                    >
                        {status}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-5 py-5">
                <div>
                    <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-sm font-medium">
                            {progress}% complete
                        </span>
                        {typeof required === 'number' && (
                            <span className="text-xs text-muted-foreground">
                                {required}% required to pass
                            </span>
                        )}
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                        />
                        {typeof required === 'number' && required > 0 && (
                            <div
                                className="absolute top-0 h-full w-px bg-foreground/30"
                                style={{
                                    left: `${Math.min(100, required)}%`,
                                }}
                            />
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    <InfoTile
                        icon={CalendarRange}
                        label="Started"
                        value={formatDate(meta.StartDate)}
                    />
                    <InfoTile
                        icon={CalendarClock}
                        label={meta.IsCompleted ? 'Completed' : 'Ends'}
                        value={formatDate(
                            meta.IsCompleted
                                ? meta.completionDate
                                : meta.EndDate,
                        )}
                    />
                    <InfoTile
                        icon={BookOpen}
                        label="Required courses"
                        value={`${meta.RequiredCoursesCompleted ?? 0} / ${meta.RequiredCoursesCount ?? 0}`}
                    />
                    <InfoTile
                        icon={Award}
                        label="Final exam score"
                        value={
                            typeof meta.FinalExamScore === 'number' &&
                            meta.IsCompleted
                                ? String(meta.FinalExamScore)
                                : '—'
                        }
                    />
                </div>

                <div className="space-y-2">
                    {COURSE_SECTIONS.map((section) => (
                        <CourseSection
                            key={section.label}
                            label={section.label}
                            icon={section.icon}
                            courses={
                                (meta[section.coursesKey] as
                                    TrainingCourse[] | undefined) ?? []
                            }
                            completed={meta[section.completedKey] as number}
                            count={meta[section.countKey] as number}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function TrainingProgressShow({
    agent,
    programs,
    isOwnProgress,
}: Props) {
    return (
        <>
            <Head title="Training progress" />

            <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 p-4">
                <div className="space-y-4">
                    <Link
                        href={
                            isOwnProgress
                                ? dashboard()
                                : onboardingShow(agent.id)
                        }
                        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft className="size-4" />
                        {isOwnProgress
                            ? 'Back to dashboard'
                            : 'Back to onboarding review'}
                    </Link>

                    <Heading
                        variant="small"
                        title={
                            isOwnProgress
                                ? 'Your training progress'
                                : `${agent.name}'s training progress`
                        }
                        description="Live progress synced from XCEL."
                    />
                </div>

                {programs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
                        <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <GraduationCap className="size-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                No training programs synced yet
                            </p>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Progress will appear here once XCEL has data for
                                this agent.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">
                        {programs.map((program) => (
                            <ProgramCard key={program.id} program={program} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
