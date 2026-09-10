import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Nav links throughout the sidebar use Inertia's `prefetch`, which caches
// a whole rendered page (shared props included) by URL alone — not scoped
// to who's logged in. Impersonating (or returning from it) swaps the
// logged-in user without a hard page reload, so a page prefetched a moment
// earlier under the old identity can otherwise get served stale right
// after the switch — e.g. clicking a sidebar link right after impersonating
// an agent could momentarily show the admin's own view again. Flush the
// prefetch cache whenever the authenticated user actually changes.
let lastAuthUserId: number | string | null | undefined;

router.on('navigate', (event) => {
    const props = event.detail.page.props as {
        auth?: { user?: { id?: number | string } | null };
    };
    const currentAuthUserId = props.auth?.user?.id ?? null;

    if (
        lastAuthUserId !== undefined &&
        lastAuthUserId !== currentAuthUserId
    ) {
        router.flushAll();
    }

    lastAuthUserId = currentAuthUserId;
});

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
