import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ImpersonateController from '@/actions/App/Http/Controllers/ImpersonateController';
import UserController from '@/actions/App/Http/Controllers/UserController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { index } from '@/routes/users';
import type { Auth } from '@/types';

const ROLE_LABELS: Record<string, string> = {
    agent: 'Agent',
    admin: 'Admin',
    'super-admin': 'Super Admin',
};

const ROLE_BADGE_CLASSES: Record<string, string> = {
    agent: 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    admin: 'border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
    'super-admin':
        'border-transparent bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
};

const ALL_ROLES = ['agent', 'admin', 'super-admin'];

const PER_PAGE_OPTIONS = [10, 25, 50];

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type UserRow = {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    roles: { id: number; name: string }[];
};

type Counts = {
    total: number;
    agent: number;
    admin: number;
    'super-admin': number;
};

type Filters = {
    search: string;
    role: string;
    per_page: number;
};

type Props = {
    users: {
        data: UserRow[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    assignableRoles: string[];
    filters: Filters;
    counts: Counts;
};

const COUNT_CARDS: { key: keyof Counts; label: string }[] = [
    { key: 'total', label: 'Total users' },
    { key: 'agent', label: 'Agents' },
    { key: 'admin', label: 'Admins' },
    { key: 'super-admin', label: 'Super Admins' },
];

function RoleSelect({
    assignableRoles,
    defaultValue,
    error,
}: {
    assignableRoles: string[];
    defaultValue?: string;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select name="role" defaultValue={defaultValue}>
                <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                    {assignableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role] ?? role}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <InputError message={error} />
        </div>
    );
}

function applyFilters(overrides: Partial<Filters>, filters: Filters) {
    router.get(
        index().url,
        {
            ...filters,
            ...overrides,
        },
        { preserveState: true, preserveScroll: true, replace: true },
    );
}

export default function UsersIndex({
    users,
    assignableRoles,
    filters,
    counts,
}: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const canCreate = assignableRoles.length > 0;
    const canImpersonate = auth.user.permissions.includes(
        'users.impersonate',
    );

    const [createOpen, setCreateOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<number | null>(
        null,
    );

    const [search, setSearch] = useState(filters.search);
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            isFirstRun.current = false;
            return;
        }

        const timeout = setTimeout(() => {
            applyFilters({ search }, filters);
        }, 300);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <>
            <Head title="Users" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Users"
                        description="Manage agent, admin, and super admin accounts"
                    />

                    {canCreate && (
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="size-4" />
                                    New user
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogTitle>Add user</DialogTitle>

                                <Form
                                    {...UserController.store.form()}
                                    resetOnSuccess
                                    onSuccess={() => setCreateOpen(false)}
                                    className="space-y-4"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="name">
                                                    Name
                                                </Label>
                                                <Input
                                                    id="name"
                                                    name="name"
                                                    required
                                                    autoFocus
                                                    autoComplete="name"
                                                />
                                                <InputError
                                                    message={errors.name}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="email">
                                                    Email address
                                                </Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    name="email"
                                                    required
                                                    autoComplete="email"
                                                />
                                                <InputError
                                                    message={errors.email}
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="password">
                                                    Password
                                                </Label>
                                                <PasswordInput
                                                    id="password"
                                                    name="password"
                                                    required
                                                    autoComplete="new-password"
                                                />
                                                <InputError
                                                    message={errors.password}
                                                />
                                            </div>

                                            <RoleSelect
                                                assignableRoles={
                                                    assignableRoles
                                                }
                                                defaultValue={
                                                    assignableRoles[0]
                                                }
                                                error={errors.role}
                                            />

                                            <DialogFooter className="gap-2 pt-2">
                                                <DialogClose asChild>
                                                    <Button variant="secondary">
                                                        Cancel
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    type="submit"
                                                    disabled={processing}
                                                >
                                                    {processing && (
                                                        <Spinner />
                                                    )}
                                                    Create user
                                                </Button>
                                            </DialogFooter>
                                        </>
                                    )}
                                </Form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {COUNT_CARDS.map((card) => (
                        <div
                            key={card.key}
                            className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
                        >
                            <p className="text-sm text-muted-foreground">
                                {card.label}
                            </p>
                            <p className="mt-1 text-2xl font-semibold">
                                {counts[card.key]}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            className="pl-9"
                        />
                    </div>

                    <Select
                        value={filters.role === '' ? 'all' : filters.role}
                        onValueChange={(value) =>
                            applyFilters(
                                { role: value === 'all' ? '' : value },
                                filters,
                            )
                        }
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="All roles" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All roles</SelectItem>
                            {ALL_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                    {ROLE_LABELS[role] ?? role}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="px-4 py-3 font-medium">
                                    Name
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Email
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Role
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    Status
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.map((user) => {
                                const canEdit = assignableRoles.includes(
                                    user.roles[0]?.name ?? '',
                                );
                                const isSelf = user.id === auth.user.id;
                                const canDelete = canEdit && !isSelf;
                                const canImpersonateUser =
                                    canImpersonate && canEdit && !isSelf;
                                const canToggleStatus = canEdit && !isSelf;
                                const hasAnyAction =
                                    canImpersonateUser ||
                                    canEdit ||
                                    canToggleStatus ||
                                    canDelete;

                                return (
                                    <tr
                                        key={user.id}
                                        className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                    >
                                        <td className="px-4 py-3">
                                            {user.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(user.roles ?? []).map(
                                                (role) => (
                                                    <Badge
                                                        key={role.id}
                                                        variant="outline"
                                                        className={
                                                            ROLE_BADGE_CLASSES[
                                                                role.name
                                                            ]
                                                        }
                                                    >
                                                        {ROLE_LABELS[
                                                            role.name
                                                        ] ?? role.name}
                                                    </Badge>
                                                ),
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant="outline"
                                                className={
                                                    user.is_active
                                                        ? 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                                                        : 'border-transparent bg-muted text-muted-foreground'
                                                }
                                            >
                                                {user.is_active
                                                    ? 'Active'
                                                    : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={
                                                            !hasAnyAction
                                                        }
                                                    >
                                                        <MoreHorizontal className="size-4" />
                                                        <span className="sr-only">
                                                            Actions
                                                        </span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {canImpersonateUser && (
                                                        <DropdownMenuItem
                                                            onSelect={() =>
                                                                router.post(
                                                                    ImpersonateController.store.url(
                                                                        user.id,
                                                                    ),
                                                                )
                                                            }
                                                        >
                                                            Impersonate
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canEdit && (
                                                        <DropdownMenuItem
                                                            onSelect={(e) => {
                                                                e.preventDefault();
                                                                setEditingUserId(
                                                                    user.id,
                                                                );
                                                            }}
                                                        >
                                                            Edit
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canToggleStatus && (
                                                        <DropdownMenuItem
                                                            onSelect={() =>
                                                                router.patch(
                                                                    UserController.updateStatus.url(
                                                                        user.id,
                                                                    ),
                                                                )
                                                            }
                                                        >
                                                            {user.is_active
                                                                ? 'Suspend'
                                                                : 'Activate'}
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canDelete && (
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onSelect={(e) => {
                                                                e.preventDefault();
                                                                setDeletingUserId(
                                                                    user.id,
                                                                );
                                                            }}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <Dialog
                                                open={
                                                    editingUserId === user.id
                                                }
                                                onOpenChange={(open) =>
                                                    setEditingUserId(
                                                        open
                                                            ? user.id
                                                            : null,
                                                    )
                                                }
                                            >
                                                <DialogContent>
                                                    <DialogTitle>
                                                        Edit {user.name}
                                                    </DialogTitle>

                                                    <Form
                                                        {...UserController.update.form(
                                                            user.id,
                                                        )}
                                                        onSuccess={() =>
                                                            setEditingUserId(
                                                                null,
                                                            )
                                                        }
                                                        className="space-y-4"
                                                    >
                                                        {({
                                                            processing,
                                                            errors,
                                                        }) => (
                                                            <>
                                                                <div className="grid gap-2">
                                                                    <Label htmlFor="name">
                                                                        Name
                                                                    </Label>
                                                                    <Input
                                                                        id="name"
                                                                        name="name"
                                                                        required
                                                                        autoFocus
                                                                        autoComplete="name"
                                                                        defaultValue={
                                                                            user.name
                                                                        }
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            errors.name
                                                                        }
                                                                    />
                                                                </div>

                                                                <div className="grid gap-2">
                                                                    <Label htmlFor="email">
                                                                        Email
                                                                        address
                                                                    </Label>
                                                                    <Input
                                                                        id="email"
                                                                        type="email"
                                                                        name="email"
                                                                        required
                                                                        autoComplete="email"
                                                                        defaultValue={
                                                                            user.email
                                                                        }
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            errors.email
                                                                        }
                                                                    />
                                                                </div>

                                                                <div className="grid gap-2">
                                                                    <Label htmlFor="password">
                                                                        New
                                                                        password
                                                                    </Label>
                                                                    <PasswordInput
                                                                        id="password"
                                                                        name="password"
                                                                        autoComplete="new-password"
                                                                        placeholder="Leave blank to keep current"
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            errors.password
                                                                        }
                                                                    />
                                                                </div>

                                                                <RoleSelect
                                                                    assignableRoles={
                                                                        assignableRoles
                                                                    }
                                                                    defaultValue={
                                                                        user
                                                                            .roles[0]
                                                                            ?.name ??
                                                                        assignableRoles[0]
                                                                    }
                                                                    error={
                                                                        errors.role
                                                                    }
                                                                />

                                                                <DialogFooter className="gap-2 pt-2">
                                                                    <DialogClose
                                                                        asChild
                                                                    >
                                                                        <Button variant="secondary">
                                                                            Cancel
                                                                        </Button>
                                                                    </DialogClose>
                                                                    <Button
                                                                        type="submit"
                                                                        disabled={
                                                                            processing
                                                                        }
                                                                    >
                                                                        {processing && (
                                                                            <Spinner />
                                                                        )}
                                                                        Save
                                                                        changes
                                                                    </Button>
                                                                </DialogFooter>
                                                            </>
                                                        )}
                                                    </Form>
                                                </DialogContent>
                                            </Dialog>

                                            <Dialog
                                                open={
                                                    deletingUserId ===
                                                    user.id
                                                }
                                                onOpenChange={(open) =>
                                                    setDeletingUserId(
                                                        open
                                                            ? user.id
                                                            : null,
                                                    )
                                                }
                                            >
                                                <DialogContent>
                                                    <DialogTitle>
                                                        Delete {user.name}?
                                                    </DialogTitle>
                                                    <p className="text-sm text-muted-foreground">
                                                        This cannot be
                                                        undone.
                                                    </p>

                                                    <Form
                                                        {...UserController.destroy.form(
                                                            user.id,
                                                        )}
                                                        onSuccess={() =>
                                                            setDeletingUserId(
                                                                null,
                                                            )
                                                        }
                                                    >
                                                        {({
                                                            processing,
                                                        }) => (
                                                            <DialogFooter className="gap-2">
                                                                <DialogClose
                                                                    asChild
                                                                >
                                                                    <Button variant="secondary">
                                                                        Cancel
                                                                    </Button>
                                                                </DialogClose>
                                                                <Button
                                                                    type="submit"
                                                                    variant="destructive"
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                >
                                                                    Delete
                                                                </Button>
                                                            </DialogFooter>
                                                        )}
                                                    </Form>
                                                </DialogContent>
                                            </Dialog>
                                        </td>
                                    </tr>
                                );
                            })}

                            {users.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {users.total > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Rows per page
                                </span>
                                <Select
                                    value={String(filters.per_page)}
                                    onValueChange={(value) =>
                                        applyFilters(
                                            { per_page: Number(value) },
                                            filters,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PER_PAGE_OPTIONS.map((option) => (
                                            <SelectItem
                                                key={option}
                                                value={String(option)}
                                            >
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Showing {users.from} to {users.to} of{' '}
                                {users.total} users
                            </p>
                        </div>

                        {users.last_page > 1 && (
                            <div className="flex flex-wrap gap-1">
                                {users.links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={
                                            link.active
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        disabled={!link.url}
                                        asChild={!!link.url}
                                    >
                                        {link.url ? (
                                            <Link
                                                href={link.url}
                                                preserveScroll
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        ) : (
                                            <span
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        )}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Users',
            href: index(),
        },
    ],
};
