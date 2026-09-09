import { router, usePage } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import NotificationController from '@/actions/App/Http/Controllers/NotificationController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationLevel } from '@/types';

const LEVEL_DOT_CLASSES: Record<NotificationLevel, string> = {
    success: 'bg-emerald-500',
    error: 'bg-destructive',
    info: 'bg-sky-500',
};

function timeAgo(isoDate: string): string {
    const seconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000),
    );

    const steps: [number, string][] = [
        [60, 's'],
        [60, 'm'],
        [24, 'h'],
        [7, 'd'],
        [4.345, 'w'],
    ];

    let value = seconds;
    let unit = 's';

    for (const [size, label] of steps) {
        if (value < size) {
            unit = label;
            break;
        }

        value = Math.floor(value / size);
        unit = label;
    }

    return unit === 's' && value < 5 ? 'just now' : `${value}${unit} ago`;
}

function markAsRead(notification: AppNotification) {
    if (notification.read_at) {
        return;
    }

    router.post(
        NotificationController.read.url(notification.id),
        {},
        { preserveScroll: true, preserveState: true },
    );
}

export function NotificationBell() {
    const { notifications } = usePage().props;

    if (!notifications) {
        return null;
    }

    const { unreadCount, recent } = notifications;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="group relative h-9 w-9 cursor-pointer"
                >
                    <Bell className="!size-5 opacity-80 group-hover:opacity-100" />
                    {unreadCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] tabular-nums">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                    <span className="sr-only">
                        Notifications
                        {unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <DropdownMenuLabel className="p-0 text-sm">
                        Notifications
                    </DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() =>
                                router.post(
                                    NotificationController.readAll.url(),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        >
                            <CheckCheck className="size-3.5" />
                            Mark all read
                        </button>
                    )}
                </div>
                <DropdownMenuSeparator />
                {recent.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                        You&apos;re all caught up.
                    </p>
                ) : (
                    <div className="max-h-96 overflow-y-auto">
                        {recent.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className="flex flex-col items-start gap-0.5 py-2 whitespace-normal"
                                onSelect={(event) => {
                                    event.preventDefault();
                                    markAsRead(notification);
                                    router.visit(notification.data.action_url);
                                }}
                            >
                                <div className="flex w-full items-center gap-2">
                                    <span
                                        className={cn(
                                            'size-1.5 shrink-0 rounded-full',
                                            notification.read_at
                                                ? 'bg-transparent'
                                                : LEVEL_DOT_CLASSES[
                                                      notification.data.level
                                                  ],
                                        )}
                                    />
                                    <span
                                        className={cn(
                                            'flex-1 truncate text-sm',
                                            !notification.read_at &&
                                                'font-medium',
                                        )}
                                    >
                                        {notification.data.title}
                                    </span>
                                    <span className="shrink-0 text-[11px] text-muted-foreground">
                                        {timeAgo(notification.created_at)}
                                    </span>
                                </div>
                                <p className="pl-3.5 text-xs text-muted-foreground">
                                    {notification.data.body}
                                </p>
                            </DropdownMenuItem>
                        ))}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
