import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BookOpen,
    ChevronsUpDown,
    Clock,
    ExternalLink,
    LayoutGrid,
    PanelLeft,
    Search,
} from 'lucide-react';
import { useState } from 'react';

function HeartLogo({ className = 'w-7 h-7' }) {
    return (
        <svg viewBox="0 0 100 100" className={className}>
            <defs>
                <linearGradient
                    id="heartGrad2"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                >
                    <stop offset="0%" stopColor="#c9a0ff" />
                    <stop offset="100%" stopColor="#f598ff" />
                </linearGradient>
            </defs>
            <path
                fill="url(#heartGrad2)"
                d="M50 88 C20 68 4 50 4 30 C4 15 15 5 28 5 C38 5 46 11 50 20 C54 11 62 5 72 5 C85 5 96 15 96 30 C96 50 80 68 50 88 Z"
            />
            <rect x="44" y="30" width="12" height="34" rx="3" fill="white" />
            <rect x="33" y="41" width="34" height="12" rx="3" fill="white" />
        </svg>
    );
}

const navItems = [
    { label: 'Dashboard', icon: LayoutGrid, active: false },
    { label: 'Resources', icon: BookOpen, active: true },
];

const resources = [
    {
        title: 'Velit velit optio',
        subtitle: 'Sed enim qui aliquip',
        category: 'Sales',
        daysLeft: 27,
        totalDays: 30,
        thumbnail: '/thumbnails/millenium-suites.jpg',
    },
];

export default function ResourcesPageAlt() {
    const [query, setQuery] = useState('');

    return (
        <div className="flex min-h-screen w-full bg-[#faf9fc]">
            {/* Light sidebar with soft white-to-lavender gradient */}
            <aside
                className="flex w-64 shrink-0 flex-col justify-between border-r border-[#ece7f5]"
                style={{
                    background:
                        'linear-gradient(190deg, #ffffff 0%, #fdfbff 45%, #f6ecfd 100%)',
                }}
            >
                <div>
                    <div className="flex h-16 items-center gap-2.5 border-b border-[#ece7f5] px-5">
                        <HeartLogo className="h-7 w-7 flex-shrink-0" />
                        <div className="leading-none">
                            <div className="text-[15px] font-extrabold tracking-tight text-slate-900">
                                PITCH
                                <span style={{ color: '#8a5fae' }}>HEALTH</span>
                            </div>
                            <div className="text-[8px] font-bold tracking-[0.16em] text-slate-400">
                                SOLUTIONS
                            </div>
                        </div>
                    </div>

                    <nav className="px-3 pt-6">
                        <div className="mb-2.5 px-3 text-[10.5px] font-bold tracking-widest text-slate-400 uppercase">
                            Platform
                        </div>
                        <ul className="space-y-1">
                            {navItems.map(({ label, icon: Icon, active }) => (
                                <li key={label}>
                                    <button
                                        className={`relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                                            active
                                                ? 'text-[#5a4177]'
                                                : 'text-slate-500 hover:bg-[#f6ecfd] hover:text-[#5a4177]'
                                        }`}
                                        style={
                                            active
                                                ? {
                                                      background:
                                                          'linear-gradient(135deg, rgba(245,152,255,0.18), rgba(199,116,255,0.10))',
                                                  }
                                                : undefined
                                        }
                                    >
                                        {active && (
                                            <span
                                                className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full"
                                                style={{
                                                    background: '#f598ff',
                                                }}
                                            />
                                        )}
                                        <Icon size={17} />
                                        {label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                <div className="flex items-center gap-3 border-t border-[#ece7f5] px-4 py-3">
                    <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{
                            background:
                                'linear-gradient(135deg, #c774ff, #8a5fae)',
                        }}
                    >
                        MD
                    </div>
                    <span className="flex-1 truncate text-sm font-semibold text-slate-800">
                        Meredith Daugherty
                    </span>
                    <ChevronsUpDown size={15} className="text-slate-400" />
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1">
                <header className="flex h-16 items-center gap-2 border-b border-[#ece7f5] bg-white px-6">
                    <PanelLeft size={17} className="text-slate-500" />
                    <span className="text-sm font-semibold text-slate-800">
                        Resources
                    </span>
                </header>

                <div className="p-8">
                    <h1 className="mb-1 text-2xl font-extrabold text-slate-900">
                        Resources
                    </h1>
                    <p className="mb-6 text-sm text-slate-500">
                        Browse and complete your assigned training
                    </p>

                    <div className="mb-7 flex gap-3">
                        <div className="relative max-w-sm flex-1">
                            <Search
                                size={16}
                                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                            />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search resources..."
                                className="rounded-lg border-slate-200 pl-9 focus-visible:border-[#f598ff] focus-visible:ring-2 focus-visible:ring-[#f598ff]/40"
                            />
                        </div>
                        <Select defaultValue="all">
                            <SelectTrigger className="w-44 rounded-lg border-slate-200">
                                <SelectValue placeholder="All categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All categories
                                </SelectItem>
                                <SelectItem value="sales">Sales</SelectItem>
                                <SelectItem value="compliance">
                                    Compliance
                                </SelectItem>
                                <SelectItem value="onboarding">
                                    Onboarding
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {resources.map((r) => {
                            const pct = Math.round(
                                ((r.totalDays - r.daysLeft) / r.totalDays) *
                                    100,
                            );
                            return (
                                <div
                                    key={r.title}
                                    className="overflow-hidden rounded-2xl border border-[#ece7f5] bg-white shadow-sm transition-all hover:border-[#e6cdf7] hover:shadow-md"
                                >
                                    <div className="h-36 overflow-hidden bg-slate-100">
                                        <img
                                            src={r.thumbnail}
                                            alt={r.title}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>

                                    <div className="p-5">
                                        <div className="mb-1 flex items-start justify-between gap-2">
                                            <h3 className="text-[15px] font-bold text-slate-900">
                                                {r.title}
                                            </h3>
                                            <Badge
                                                className="flex-shrink-0 border-0 text-[11px] font-semibold"
                                                style={{
                                                    background:
                                                        'rgba(245,152,255,0.18)',
                                                    color: '#7a3fa0',
                                                }}
                                            >
                                                {r.category}
                                            </Badge>
                                        </div>
                                        <p className="mb-4 text-sm text-slate-500">
                                            {r.subtitle}
                                        </p>

                                        <div className="mb-4 flex items-center gap-3">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f1ebfa]">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${pct}%`,
                                                        background:
                                                            'linear-gradient(90deg, #473364, #f598ff)',
                                                    }}
                                                />
                                            </div>
                                            <span className="flex flex-shrink-0 items-center gap-1 text-xs text-slate-400">
                                                <Clock size={12} />
                                                {r.daysLeft}d left
                                            </span>
                                        </div>

                                        <Button
                                            className="w-full gap-2 rounded-lg border-0 font-bold text-white"
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, #473364 0%, #5a4177 60%, #8a5fae 100%)',
                                            }}
                                        >
                                            <ExternalLink size={15} />
                                            Open resource
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
