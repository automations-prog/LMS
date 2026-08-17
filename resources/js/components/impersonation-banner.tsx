import { Form, usePage } from '@inertiajs/react';
import { UserRoundCog } from 'lucide-react';
import ImpersonateController from '@/actions/App/Http/Controllers/ImpersonateController';
import { Button } from '@/components/ui/button';
import type { Auth } from '@/types';

export function ImpersonationBanner() {
    const { auth, impersonating } = usePage<{
        auth: Auth;
        impersonating: boolean;
    }>().props;

    if (!impersonating) {
        return null;
    }

    return (
        <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
            <UserRoundCog className="size-4" />
            <span>You&apos;re viewing as {auth.user.name}.</span>

            <Form {...ImpersonateController.destroy.form()}>
                {({ processing }) => (
                    <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        disabled={processing}
                        className="h-7 border-amber-950/30 bg-transparent text-amber-950 hover:bg-amber-950/10"
                    >
                        Return to your account
                    </Button>
                )}
            </Form>
        </div>
    );
}
