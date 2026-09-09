export type NotificationLevel = 'success' | 'error' | 'info';

export type AppNotification = {
    id: string;
    type: string;
    data: {
        title: string;
        body: string;
        level: NotificationLevel;
        action_url: string;
    };
    read_at: string | null;
    created_at: string;
};

export type NotificationFeed = {
    unreadCount: number;
    recent: AppNotification[];
};
