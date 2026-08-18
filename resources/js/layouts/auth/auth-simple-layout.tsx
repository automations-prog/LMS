import { Link } from '@inertiajs/react';
import { Card, CardContent } from '@/components/ui/card';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const LIGHT_BACKGROUND =
    'radial-gradient(circle at 15% 20%, rgba(245,152,255,0.25), transparent 45%), radial-gradient(circle at 85% 80%, rgba(139,97,199,0.35), transparent 50%), linear-gradient(160deg, #3a2a54 0%, #473364 45%, #5a4177 100%)';

const DARK_BACKGROUND =
    'radial-gradient(circle at 15% 20%, rgba(245,152,255,0.12), transparent 45%), radial-gradient(circle at 85% 80%, rgba(139,97,199,0.2), transparent 50%), linear-gradient(160deg, #14101f 0%, #1c1530 45%, #241a3d 100%)';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-6 md:p-10">
            <div
                className="absolute inset-0 dark:hidden"
                style={{ background: LIGHT_BACKGROUND }}
            />
            <div
                className="absolute inset-0 hidden dark:block"
                style={{ background: DARK_BACKGROUND }}
            />

            <div className="relative z-10 w-full max-w-sm">
                <Card className="relative overflow-hidden rounded-[20px] border-0 shadow-2xl">
                    <div
                        className="absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-15"
                        style={{
                            background:
                                'linear-gradient(135deg, #f598ff, #5a4177)',
                        }}
                    />

                    <CardContent className="relative flex flex-col gap-8 px-9 pt-10 pb-9">
                        <div className="flex flex-col items-center gap-4">
                            <Link
                                href={home()}
                                className="flex flex-col items-center gap-2 font-medium"
                            >
                                <div className="mb-1">
                                    <img
                                        src="/images/logo_black_text.png"
                                        alt="PitchHealth Solutions"
                                        className="h-8 w-auto object-contain dark:hidden"
                                    />
                                    <img
                                        src="/images/logo.webp"
                                        alt="PitchHealth Solutions"
                                        className="hidden h-8 w-auto object-contain dark:block"
                                    />
                                </div>
                                <span className="sr-only">{title}</span>
                            </Link>

                            <div className="space-y-2 text-center">
                                <h1 className="text-xl font-extrabold text-foreground">
                                    {title}
                                </h1>
                                <p className="text-center text-sm text-muted-foreground">
                                    {description}
                                </p>
                            </div>
                        </div>

                        {children}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
