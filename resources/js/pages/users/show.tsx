import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Ban,
    Building2,
    Calendar,
    CircleCheck,
    Clock,
    FileText,
    Fingerprint,
    IdCard,
    KeyRound,
    Layers,
    Mail,
    ShieldCheck,
    Trash2,
    UserRoundCog,
} from 'lucide-react';
import { useState } from 'react';
import ImpersonateController from '@/actions/App/Http/Controllers/ImpersonateController';
import UserController from '@/actions/App/Http/Controllers/UserController';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';
import {
    AHIP_STATUS_LABELS,
    ELIGIBILITY_STATUS_LABELS,
    LICENSE_STATUS_LABELS,
    TRAINING_STATUS_LABELS,
} from '@/lib/onboarding-decisions';
import {
    formatDateTime,
    formatLastLogin,
    formatSource,
    humanizeMetadataKey,
    ROLE_BADGE_CLASSES,
    ROLE_LABELS,
} from '@/lib/user-display';
import { show as onboardingShow } from '@/routes/onboarding';
import { index } from '@/routes/users';
import type { Auth } from '@/types';
import type {
    AhipCertification,
    EligibilityAttestation,
    LicenseSubmission,
    TrainingCompletion,
} from '@/types/onboarding';

type Role = {
    id: number;
    name: string;
    permissions: { id: number; name: string }[];
};

type TargetUser = {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    is_active: boolean;
    must_change_password: boolean;
    excel_id: string | null;
    source: string | null;
    company_name: string | null;
    metadata: Record<string, unknown> | null;
    last_login_at: string | null;
    two_factor_confirmed_at: string | null;
    created_at: string;
    updated_at: string;
    roles: Role[];
    eligibility_attestation?: EligibilityAttestation | null;
    training_completion?: TrainingCompletion | null;
    license_submission?: LicenseSubmission | null;
    ahip_certification?: AhipCertification | null;
};

type Props = {
    targetUser: TargetUser;
    canEdit: boolean;
};

function DetailRow({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Calendar;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
            </div>
        </div>
    );
}

function formatMetadataValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

const URL_PATTERN = /^https?:\/\//i;

type MetadataLink = { url: string; label: string };

/**
 * Metadata is arbitrary JSON pulled in from a Customer API / Airtable
 * record, so a value can be a bare URL string, an Airtable-style attachment
 * object (`{ url, filename }`), or an array of either — surface those as
 * clickable links instead of a raw string/JSON dump.
 */
function extractMetadataLinks(value: unknown): MetadataLink[] {
    if (typeof value === 'string') {
        return URL_PATTERN.test(value) ? [{ url: value, label: value }] : [];
    }

    if (Array.isArray(value)) {
        return value.flatMap((item, index) =>
            extractMetadataLinks(item).map((link) => ({
                ...link,
                label:
                    link.label === link.url
                        ? `File ${index + 1}`
                        : link.label,
            })),
        );
    }

    if (value && typeof value === 'object' && 'url' in value) {
        const attachment = value as { url: unknown; filename?: unknown };

        if (
            typeof attachment.url === 'string' &&
            URL_PATTERN.test(attachment.url)
        ) {
            return [
                {
                    url: attachment.url,
                    label:
                        typeof attachment.filename === 'string'
                            ? attachment.filename
                            : attachment.url,
                },
            ];
        }
    }

    return [];
}

function MetadataValue({ value }: { value: unknown }) {
    const links = extractMetadataLinks(value);

    if (links.length === 0) {
        return (
            <dd className="text-sm font-medium break-words">
                {formatMetadataValue(value)}
            </dd>
        );
    }

    return (
        <dd className="space-y-1">
            {links.map((link, index) => (
                <a
                    key={`${link.url}-${index}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                    <FileText className="size-3.5 shrink-0" />
                    <span className="break-all">{link.label}</span>
                </a>
            ))}
        </dd>
    );
}

export default function UserShow({ targetUser, canEdit }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isSelf = targetUser.id === auth.user.id;
    const canImpersonate =
        auth.user.permissions.includes('users.impersonate') &&
        canEdit &&
        !isSelf &&
        targetUser.is_active;

    const [suspendOpen, setSuspendOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const getInitials = useInitials();

    const metadataEntries = Object.entries(targetUser.metadata ?? {});
    const permissions = Array.from(
        new Set(
            targetUser.roles.flatMap((role) =>
                role.permissions.map((permission) => permission.name),
            ),
        ),
    ).sort();

    const isAgent = targetUser.roles.some((role) => role.name === 'agent');
    const hasOnboardingRecord =
        targetUser.eligibility_attestation ??
        targetUser.training_completion ??
        targetUser.license_submission ??
        targetUser.ahip_certification;

    return (
        <>
            <Head title={targetUser.name} />

            <div className="mx-auto flex h-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <Link
                    href={index()}
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to Users
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="size-10">
                            <AvatarFallback className="bg-gradient-to-br from-[#c774ff] to-[#8a5fae] font-semibold text-white">
                                {getInitials(targetUser.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-semibold">
                                    {targetUser.name}
                                </p>
                                <Badge
                                    variant="outline"
                                    className={
                                        targetUser.is_active
                                            ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                            : 'border-transparent bg-muted text-muted-foreground'
                                    }
                                >
                                    {targetUser.is_active
                                        ? 'Active'
                                        : 'Inactive'}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {targetUser.email}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {targetUser.roles.map((role) => (
                                    <Badge
                                        key={role.id}
                                        variant="outline"
                                        className={
                                            ROLE_BADGE_CLASSES[role.name]
                                        }
                                    >
                                        {ROLE_LABELS[role.name] ?? role.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    {canEdit && (
                        <div className="flex items-center gap-2">
                            {canImpersonate && (
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        router.post(
                                            ImpersonateController.store.url(
                                                targetUser.id,
                                            ),
                                        )
                                    }
                                >
                                    <UserRoundCog />
                                    Impersonate
                                </Button>
                            )}

                            {!isSelf && (
                                <>
                                    {targetUser.is_active ? (
                                        <Button
                                            variant="outline"
                                            onClick={() => setSuspendOpen(true)}
                                        >
                                            <Ban />
                                            Suspend
                                        </Button>
                                    ) : (
                                        <Form
                                            {...UserController.updateStatus.form(
                                                targetUser.id,
                                            )}
                                        >
                                            {({ processing }) => (
                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    disabled={processing}
                                                >
                                                    {processing && (
                                                        <Spinner />
                                                    )}
                                                    <CircleCheck />
                                                    Activate
                                                </Button>
                                            )}
                                        </Form>
                                    )}

                                    <Button
                                        variant="destructive"
                                        onClick={() => setDeleteOpen(true)}
                                    >
                                        <Trash2 />
                                        Delete
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Account details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <DetailRow
                                icon={Mail}
                                label="Email"
                                value={targetUser.email}
                            />
                            <DetailRow
                                icon={ShieldCheck}
                                label="Email verified"
                                value={
                                    formatDateTime(
                                        targetUser.email_verified_at,
                                    ) ?? 'Not verified'
                                }
                            />
                            <DetailRow
                                icon={Layers}
                                label="Source"
                                value={formatSource(targetUser.source)}
                            />
                            {targetUser.company_name && (
                                <DetailRow
                                    icon={Building2}
                                    label="Company"
                                    value={targetUser.company_name}
                                />
                            )}
                            <DetailRow
                                icon={IdCard}
                                label="Excel ID"
                                value={targetUser.excel_id ?? '—'}
                            />
                            <DetailRow
                                icon={Clock}
                                label="Last login"
                                value={formatLastLogin(
                                    targetUser.last_login_at,
                                )}
                            />
                            <DetailRow
                                icon={Fingerprint}
                                label="Two-factor authentication"
                                value={
                                    targetUser.two_factor_confirmed_at
                                        ? `Enabled ${formatDateTime(targetUser.two_factor_confirmed_at)}`
                                        : 'Not enabled'
                                }
                            />
                            <DetailRow
                                icon={KeyRound}
                                label="Must change password"
                                value={
                                    targetUser.must_change_password
                                        ? 'Yes'
                                        : 'No'
                                }
                            />
                            <DetailRow
                                icon={Calendar}
                                label="Created"
                                value={
                                    formatDateTime(targetUser.created_at) ??
                                    '—'
                                }
                            />
                        </CardContent>
                    </Card>

                    <Card className="h-fit">
                        <CardHeader>
                            <CardTitle>Permissions</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Granted via {targetUser.roles.length} role
                                {targetUser.roles.length === 1 ? '' : 's'}.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {permissions.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No permissions assigned.
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {permissions.map((permission) => (
                                        <Badge
                                            key={permission}
                                            variant="outline"
                                        >
                                            {permission}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Metadata</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Raw fields synced in from this user's source.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {metadataEntries.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No metadata recorded for this user.
                                </p>
                            ) : (
                                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {metadataEntries.map(([key, value]) => (
                                        <div key={key}>
                                            <dt className="text-xs text-muted-foreground">
                                                {humanizeMetadataKey(key)}
                                            </dt>
                                            <MetadataValue value={value} />
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </CardContent>
                    </Card>

                    {isAgent && (
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-4">
                                    <CardTitle>
                                        License Agents Onboarding
                                    </CardTitle>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={onboardingShow(targetUser.id)}>
                                            View full onboarding review
                                        </Link>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {!hasOnboardingRecord ? (
                                    <p className="text-sm text-muted-foreground">
                                        Nothing submitted yet.
                                    </p>
                                ) : (
                                    <>
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                            <DetailRow
                                                icon={ShieldCheck}
                                                label="Eligibility"
                                                value={
                                                    targetUser
                                                        .eligibility_attestation
                                                        ? (ELIGIBILITY_STATUS_LABELS[
                                                              targetUser
                                                                  .eligibility_attestation
                                                                  .status
                                                          ] ??
                                                          targetUser
                                                              .eligibility_attestation
                                                              .status)
                                                        : 'Not submitted'
                                                }
                                            />
                                            <DetailRow
                                                icon={ShieldCheck}
                                                label="XCEL Training"
                                                value={
                                                    targetUser
                                                        .training_completion
                                                        ? (TRAINING_STATUS_LABELS[
                                                              targetUser
                                                                  .training_completion
                                                                  .status
                                                          ] ??
                                                          targetUser
                                                              .training_completion
                                                              .status)
                                                        : 'Not submitted'
                                                }
                                            />
                                            <DetailRow
                                                icon={ShieldCheck}
                                                label="License Copy"
                                                value={
                                                    targetUser
                                                        .license_submission
                                                        ? (LICENSE_STATUS_LABELS[
                                                              targetUser
                                                                  .license_submission
                                                                  .status
                                                          ] ??
                                                          targetUser
                                                              .license_submission
                                                              .status)
                                                        : 'Not submitted'
                                                }
                                            />
                                            <DetailRow
                                                icon={ShieldCheck}
                                                label="AHIP Certification"
                                                value={
                                                    targetUser
                                                        .ahip_certification
                                                        ? (AHIP_STATUS_LABELS[
                                                              targetUser
                                                                  .ahip_certification
                                                                  .status
                                                          ] ??
                                                          targetUser
                                                              .ahip_certification
                                                              .status)
                                                        : 'Not submitted'
                                                }
                                            />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
                    <DialogContent>
                        <DialogTitle>Suspend {targetUser.name}?</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            They won&apos;t be able to log in until
                            reactivated.
                        </p>

                        <Form
                            {...UserController.updateStatus.form(
                                targetUser.id,
                            )}
                            onSuccess={() => setSuspendOpen(false)}
                        >
                            {({ processing }) => (
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button variant="secondary">
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Suspend
                                    </Button>
                                </DialogFooter>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>

                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent>
                        <DialogTitle>Delete {targetUser.name}?</DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            This cannot be undone.
                        </p>

                        <Form
                            {...UserController.destroy.form(targetUser.id)}
                            onSuccess={() => router.visit(index().url)}
                        >
                            {({ processing }) => (
                                <DialogFooter className="gap-2">
                                    <DialogClose asChild>
                                        <Button variant="secondary">
                                            Cancel
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Delete
                                    </Button>
                                </DialogFooter>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

UserShow.layout = {
    breadcrumbs: [
        {
            title: 'Users',
            href: index(),
        },
        {
            title: 'View',
            href: '#',
        },
    ],
};
