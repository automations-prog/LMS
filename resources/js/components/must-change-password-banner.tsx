import { router, usePage } from '@inertiajs/react';
import { KeyRound, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { edit as editSecurity } from '@/routes/security';
import type { Auth } from '@/types';

export function MustChangePasswordBanner() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const [dismissed, setDismissed] = useState(false);

    if (!auth.user.must_change_password || dismissed) {
        return null;
    }

    function goToSecuritySettings() {
        router.visit(editSecurity());
    }

    return (
        // Not a real <a>/<button> wrapping a button (invalid nesting) — a
        // clickable div with link semantics/keyboard support instead, since
        // the close button has to live inside it without triggering the
        // same navigation.
        <div
            role="link"
            tabIndex={0}
            onClick={goToSecuritySettings}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    goToSecuritySettings();
                }
            }}
            className="flex cursor-pointer items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-500/90"
        >
            <KeyRound className="size-4 shrink-0" />
            <span>
                You&apos;re still using a default password. Click here to set
                your own.
            </span>

            <Button
                variant="outline"
                size="icon"
                className="size-7 border-amber-950/30 bg-transparent text-amber-950 hover:bg-amber-950/10"
                onClick={(event) => {
                    event.stopPropagation();
                    setDismissed(true);
                }}
            >
                <X className="size-4" />
                <span className="sr-only">Dismiss</span>
            </Button>
        </div>
    );
}
