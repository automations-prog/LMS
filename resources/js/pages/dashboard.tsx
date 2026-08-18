import { Head, Link } from '@inertiajs/react';
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
import { dashboard } from '@/routes';
import { index as eligibilityIndex } from '@/routes/eligibility';
import { index as trainingIndex } from '@/routes/training';

type DataPoint = {
    key: string;
    label: string;
    value: number;
};

type SignupPoint = {
    label: string;
    value: number;
};

type Stats = {
    total_users: number;
    active_users: number;
    pending_eligibility_reviews: number;
    pending_training_reviews: number;
};

type Charts = {
    users_by_role: DataPoint[];
    eligibility_by_status: DataPoint[];
    signups_per_day: SignupPoint[];
};

type Props = {
    stats: Stats;
    charts: Charts;
};

const STAT_CARDS: {
    key: keyof Stats;
    label: string;
    href?: ReturnType<typeof eligibilityIndex>;
}[] = [
    { key: 'total_users', label: 'Total users' },
    { key: 'active_users', label: 'Active users' },
    {
        key: 'pending_eligibility_reviews',
        label: 'Pending eligibility reviews',
        href: eligibilityIndex(),
    },
    {
        key: 'pending_training_reviews',
        label: 'Pending training reviews',
        href: trainingIndex(),
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

export default function Dashboard({ stats, charts }: Props) {
    const totalCases = charts.eligibility_by_status.reduce(
        (sum, point) => sum + point.value,
        0,
    );

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {STAT_CARDS.map((card) => {
                        const content = (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    {card.label}
                                </p>
                                <p className="mt-1 text-2xl font-semibold">
                                    {stats[card.key]}
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
