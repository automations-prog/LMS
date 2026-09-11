import { Head, Link, router } from '@inertiajs/react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Label,
    Line,
    LineChart,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AHIP_STATUS_LABELS,
    ELIGIBILITY_STATUS_LABELS,
    LICENSE_STATUS_LABELS,
    TRAINING_STATUS_LABELS,
} from '@/lib/onboarding-status-labels';
import { dashboard } from '@/routes';
import { index as onboardingIndex } from '@/routes/onboarding';
import { index as roleplayAccessIndex } from '@/routes/roleplay/access';

type DataPoint = {
    key: string;
    label: string;
    value: number;
};

type SignupPoint = {
    label: string;
    value: number;
};

type StageStatusPoint = {
    key: string;
    label: string;
    pending_review: number;
    verified: number;
    rejected: number;
};

type FunnelPoint = {
    key: string;
    label: string;
    count: number;
    avg_days: number;
};

type Stats = {
    total_users: number;
    active_users: number;
    pending_eligibility_reviews: number;
    pending_training_reviews: number;
    roleplay_sessions_scored: number;
    roleplay_avg_score: number | null;
};

type Charts = {
    users_by_role: DataPoint[];
    eligibility_by_status: DataPoint[];
    signups_per_day: SignupPoint[];
    onboarding_stage_status: StageStatusPoint[];
    contracting_funnel: DataPoint[];
    onboarding_funnel: FunnelPoint[];
};

type Filters = {
    eligibility_status: string;
    training_status: string;
    license_status: string;
    ahip_status: string;
};

type Props = {
    filters: Filters;
    stats: Stats;
    charts: Charts;
};

function applyFilters(overrides: Partial<Filters>, filters: Filters) {
    router.get(
        dashboard().url,
        { ...filters, ...overrides },
        { preserveState: true, preserveScroll: true, replace: true },
    );
}

const STAT_CARDS: {
    key: keyof Stats;
    label: string;
    href?:
        | ReturnType<typeof onboardingIndex>
        | ReturnType<typeof roleplayAccessIndex>;
}[] = [
    { key: 'total_users', label: 'Total users' },
    { key: 'active_users', label: 'Active users' },
    {
        key: 'pending_eligibility_reviews',
        label: 'Pending eligibility reviews',
        // Deep-links straight into the filtered list rather than just the
        // unfiltered onboarding review page — "flagged for waiver" is the
        // other under-review status this count includes, but there's no
        // single status filter that covers both at once.
        href: onboardingIndex({ query: { eligibility_status: 'pending' } }),
    },
    {
        key: 'pending_training_reviews',
        label: 'Pending XCEL Training reviews',
        href: onboardingIndex({ query: { training_status: 'pending_review' } }),
    },
    {
        key: 'roleplay_sessions_scored',
        label: 'Roleplay calls scored',
        href: roleplayAccessIndex(),
    },
    {
        key: 'roleplay_avg_score',
        label: 'Avg. roleplay score',
        href: roleplayAccessIndex(),
    },
];

const ROLE_CHART_CONFIG = {
    agent: { label: 'Agents', color: 'var(--chart-1)' },
    admin: { label: 'Admins', color: 'var(--chart-2)' },
    'super-admin': { label: 'Super Admins', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const ELIGIBILITY_CHART_CONFIG = {
    pending: { label: 'Pending', color: 'var(--chart-1)' },
    flagged_for_waiver: { label: 'Flagged', color: 'var(--chart-2)' },
    cleared: { label: 'Eligible', color: 'var(--chart-3)' },
    not_eligible: { label: 'Not eligible', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const SIGNUPS_CHART_CONFIG = {
    value: { label: 'New users', color: 'var(--chart-1)' },
} satisfies ChartConfig;

const STAGE_STATUS_CHART_CONFIG = {
    pending_review: { label: 'Pending review', color: 'var(--chart-1)' },
    verified: { label: 'Verified', color: 'var(--chart-3)' },
    rejected: { label: 'Rejected', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const CONTRACTING_FUNNEL_CHART_CONFIG = {
    value: { label: 'Agents', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const ONBOARDING_FUNNEL_CHART_CONFIG = {
    count: { label: 'Agents', color: 'var(--chart-2)' },
} satisfies ChartConfig;

export default function Dashboard({ filters, stats, charts }: Props) {
    const totalCases = charts.eligibility_by_status.reduce(
        (sum, point) => sum + point.value,
        0,
    );

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Select
                        value={
                            filters.eligibility_status === ''
                                ? 'all'
                                : filters.eligibility_status
                        }
                        onValueChange={(status) =>
                            applyFilters(
                                {
                                    eligibility_status:
                                        status === 'all' ? '' : status,
                                },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="Eligibility status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All eligibility statuses
                            </SelectItem>
                            {Object.entries(ELIGIBILITY_STATUS_LABELS).map(
                                ([status, label]) => (
                                    <SelectItem key={status} value={status}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>

                    <Select
                        value={
                            filters.training_status === ''
                                ? 'all'
                                : filters.training_status
                        }
                        onValueChange={(status) =>
                            applyFilters(
                                {
                                    training_status:
                                        status === 'all' ? '' : status,
                                },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="XCEL Training status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All XCEL Training statuses
                            </SelectItem>
                            {Object.entries(TRAINING_STATUS_LABELS).map(
                                ([status, label]) => (
                                    <SelectItem key={status} value={status}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>

                    <Select
                        value={
                            filters.license_status === ''
                                ? 'all'
                                : filters.license_status
                        }
                        onValueChange={(status) =>
                            applyFilters(
                                {
                                    license_status:
                                        status === 'all' ? '' : status,
                                },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="License copy status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All license copy statuses
                            </SelectItem>
                            {Object.entries(LICENSE_STATUS_LABELS).map(
                                ([status, label]) => (
                                    <SelectItem key={status} value={status}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>

                    <Select
                        value={
                            filters.ahip_status === ''
                                ? 'all'
                                : filters.ahip_status
                        }
                        onValueChange={(status) =>
                            applyFilters(
                                {
                                    ahip_status: status === 'all' ? '' : status,
                                },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue placeholder="AHIP cert status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">
                                All AHIP cert statuses
                            </SelectItem>
                            {Object.entries(AHIP_STATUS_LABELS).map(
                                ([status, label]) => (
                                    <SelectItem key={status} value={status}>
                                        {label}
                                    </SelectItem>
                                ),
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {STAT_CARDS.map((card) => {
                        const content = (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    {card.label}
                                </p>
                                <p className="mt-1 text-2xl font-semibold">
                                    {stats[card.key] ?? '—'}
                                </p>
                            </>
                        );

                        return card.href ? (
                            <Link
                                key={card.key}
                                href={card.href}
                                className="rounded-xl border border-sidebar-border/70 p-4 transition-colors hover:bg-accent/50 dark:border-sidebar-border"
                            >
                                {content}
                            </Link>
                        ) : (
                            <div
                                key={card.key}
                                className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
                            >
                                {content}
                            </div>
                        );
                    })}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="mb-4 text-sm font-medium">
                            Users by role
                        </p>
                        <ChartContainer
                            config={ROLE_CHART_CONFIG}
                            className="mx-auto aspect-auto h-52 w-full"
                        >
                            <BarChart
                                accessibilityLayer
                                data={charts.users_by_role}
                                layout="vertical"
                                margin={{ left: 8 }}
                            >
                                <CartesianGrid horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="label"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    width={90}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Bar dataKey="value" radius={4}>
                                    {charts.users_by_role.map((point) => (
                                        <Cell
                                            key={point.key}
                                            fill={`var(--color-${point.key})`}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </div>

                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="mb-4 text-sm font-medium">
                            Eligibility by status
                        </p>
                        <ChartContainer
                            config={ELIGIBILITY_CHART_CONFIG}
                            className="mx-auto aspect-auto h-52 w-full"
                        >
                            <PieChart>
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Pie
                                    data={charts.eligibility_by_status}
                                    dataKey="value"
                                    nameKey="key"
                                    innerRadius={50}
                                    outerRadius={75}
                                    strokeWidth={4}
                                >
                                    {charts.eligibility_by_status.map(
                                        (point) => (
                                            <Cell
                                                key={point.key}
                                                fill={`var(--color-${point.key})`}
                                            />
                                        ),
                                    )}
                                    <Label
                                        content={({ viewBox }) => {
                                            if (
                                                !viewBox ||
                                                !('cx' in viewBox) ||
                                                viewBox.cx == null ||
                                                viewBox.cy == null
                                            ) {
                                                return null;
                                            }

                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy}
                                                        className="fill-foreground text-2xl font-semibold"
                                                    >
                                                        {totalCases}
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={
                                                            (viewBox.cy ?? 0) +
                                                            20
                                                        }
                                                        className="fill-muted-foreground text-xs"
                                                    >
                                                        Cases
                                                    </tspan>
                                                </text>
                                            );
                                        }}
                                    />
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm">
                            {charts.eligibility_by_status.map((point) => (
                                <div
                                    key={point.key}
                                    className="flex items-center gap-1.5"
                                >
                                    <span
                                        className="size-2.5 rounded-full"
                                        style={{
                                            backgroundColor: `var(--color-${point.key})`,
                                        }}
                                    />
                                    <span className="text-muted-foreground">
                                        {point.label}
                                    </span>
                                    <span className="font-medium">
                                        {point.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="mb-4 text-sm font-medium">
                            License Agents Onboarding review status by stage
                        </p>
                        <ChartContainer
                            config={STAGE_STATUS_CHART_CONFIG}
                            className="aspect-auto h-52 w-full"
                        >
                            <BarChart
                                accessibilityLayer
                                data={charts.onboarding_stage_status}
                                margin={{ left: 12, right: 12 }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tickLine={false}
                                    axisLine={false}
                                    width={24}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent />}
                                />
                                <Bar
                                    dataKey="pending_review"
                                    fill="var(--color-pending_review)"
                                    radius={4}
                                />
                                <Bar
                                    dataKey="verified"
                                    fill="var(--color-verified)"
                                    radius={4}
                                />
                                <Bar
                                    dataKey="rejected"
                                    fill="var(--color-rejected)"
                                    radius={4}
                                />
                            </BarChart>
                        </ChartContainer>
                        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm">
                            {(
                                Object.keys(
                                    STAGE_STATUS_CHART_CONFIG,
                                ) as (keyof typeof STAGE_STATUS_CHART_CONFIG)[]
                            ).map((key) => (
                                <div
                                    key={key}
                                    className="flex items-center gap-1.5"
                                >
                                    <span
                                        className="size-2.5 rounded-full"
                                        style={{
                                            backgroundColor: `var(--color-${key})`,
                                        }}
                                    />
                                    <span className="text-muted-foreground">
                                        {STAGE_STATUS_CHART_CONFIG[key].label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="mb-4 text-sm font-medium">
                            Contracting funnel
                        </p>
                        <ChartContainer
                            config={CONTRACTING_FUNNEL_CHART_CONFIG}
                            className="mx-auto aspect-auto h-52 w-full"
                        >
                            <BarChart
                                accessibilityLayer
                                data={charts.contracting_funnel}
                                layout="vertical"
                                margin={{ left: 8 }}
                            >
                                <CartesianGrid horizontal={false} />
                                <XAxis
                                    type="number"
                                    hide
                                    allowDecimals={false}
                                />
                                <YAxis
                                    dataKey="label"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    width={90}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="var(--color-value)"
                                    radius={4}
                                />
                            </BarChart>
                        </ChartContainer>
                    </div>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                    <p className="text-sm font-medium">
                        License Agents Onboarding funnel
                    </p>
                    <p className="mb-4 text-xs text-muted-foreground">
                        Agents who&apos;ve reached each checkpoint, and the
                        average days since they submitted eligibility.
                    </p>
                    <ChartContainer
                        config={ONBOARDING_FUNNEL_CHART_CONFIG}
                        className="aspect-auto h-64 w-full"
                    >
                        <BarChart
                            accessibilityLayer
                            data={charts.onboarding_funnel}
                            layout="vertical"
                            margin={{ left: 8 }}
                        >
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" hide allowDecimals={false} />
                            <YAxis
                                dataKey="label"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                width={140}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        hideLabel
                                        formatter={(value, _name, item) => {
                                            const point =
                                                item.payload as unknown as FunnelPoint;

                                            return (
                                                <span>
                                                    {String(value)} agent
                                                    {point.count === 1
                                                        ? ''
                                                        : 's'}
                                                    {point.avg_days > 0 &&
                                                        ` · avg ${point.avg_days}d after submission`}
                                                </span>
                                            );
                                        }}
                                    />
                                }
                            />
                            <Bar
                                dataKey="count"
                                fill="var(--color-count)"
                                radius={4}
                            />
                        </BarChart>
                    </ChartContainer>
                </div>

                <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                    <p className="mb-4 text-sm font-medium">
                        New users, last 7 days
                    </p>
                    <ChartContainer
                        config={SIGNUPS_CHART_CONFIG}
                        className="aspect-auto h-52 w-full"
                    >
                        <LineChart
                            accessibilityLayer
                            data={charts.signups_per_day}
                            margin={{ left: 12, right: 12 }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="label"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                            />
                            <YAxis
                                allowDecimals={false}
                                tickLine={false}
                                axisLine={false}
                                width={24}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Line
                                dataKey="value"
                                type="monotone"
                                stroke="var(--color-value)"
                                strokeWidth={2}
                                dot={{ fill: 'var(--color-value)' }}
                            />
                        </LineChart>
                    </ChartContainer>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
