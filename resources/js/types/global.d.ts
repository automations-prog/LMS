import type { Auth } from '@/types/auth';
import type { NotificationFeed } from '@/types/notifications';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            notifications: NotificationFeed | null;
            eligibilityStatus:
                'under_review' | 'cleared' | 'not_eligible' | null;
            [key: string]: unknown;
        };
    }
}
