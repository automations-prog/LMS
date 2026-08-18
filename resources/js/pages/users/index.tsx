import { Form, Head, router, usePage } from '@inertiajs/react';
import {
    Ban,
    Check,
    CircleCheck,
    Copy,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    UserRoundCog,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ImpersonateController from '@/actions/App/Http/Controllers/ImpersonateController';
import UserController from '@/actions/App/Http/Controllers/UserController';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTitle,
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
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useClipboard } from '@/hooks/use-clipboard';
import { brandButtonClass } from '@/lib/brand-theme';
import { index } from '@/routes/users';
import type { Auth, Paginator } from '@/types';

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

type UserRow = {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    last_login_at: string | null;
    roles: { id: number; name: string }[];
};

const lastLoginFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function formatLastLogin(value: string | null) {
    return value ? lastLoginFormatter.format(new Date(value)) : 'Never';
}

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
    users: Paginator<UserRow>;
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
    onValueChange,
    error,
}: {
    assignableRoles: string[];
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select
                name="role"
                defaultValue={defaultValue}
                onValueChange={onValueChange}
            >
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

// Agents are invited via a signed "set your password" email and never have a
// password collected here; admins/super admins are created directly and need
// one set up front.
const ROLES_REQUIRING_PASSWORD = ['admin', 'super-admin'];

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
    const [createRole, setCreateRole] = useState(assignableRoles[0]);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [deletingUserId, setDeletingUserId] = useState<number | null>(
        null,
    );
    const [suspendingUserId, setSuspendingUserId] = useState<number | null>(
        null,
    );

    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkSuspendOpen, setBulkSuspendOpen] = useState(false);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    const [copiedEmail, copyEmail] = useClipboard();

    function isRowSelectable(user: UserRow) {
        const canEditRow = assignableRoles.includes(
            user.roles[0]?.name ?? '',
        );

        return canEditRow && user.id !== auth.user.id;
    }

    const selectableIds = users.data.filter(isRowSelectable).map((u) => u.id);
    const allSelected =
        selectableIds.length > 0 &&
        selectableIds.every((id) => selectedIds.includes(id));

    function toggleSelectAll() {
        setSelectedIds(allSelected ? [] : selectableIds);
    }

    function toggleSelectOne(id: number) {
        setSelectedIds((current) =>
            current.includes(id)
                ? current.filter((existing) => existing !== id)
                : [...current, id],
        );
    }

    const [search, setSearch] = useState(filters.search);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced directly from the input's onChange rather than a useEffect
    // watching `search`: React StrictMode double-invokes effects in dev
    // mode, and a ref-based "skip the first run" guard doesn't survive that
    // — the second (spurious) invocation would fire a stale, page-less
    // request that silently overwrote whatever page you'd just navigated to.
    function handleSearchChange(value: string) {
        setSearch(value);

        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        searchTimeout.current = setTimeout(() => {
            applyFilters({ search: value }, filters);
        }, 300);
    }

    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, []);

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
                        <Sheet
                            open={createOpen}
                            onOpenChange={(open) => {
                                setCreateOpen(open);

                                if (open) {
                                    setCreateRole(assignableRoles[0]);
                                }
                            }}
                        >
                            <SheetTrigger asChild>
                                <Button className={brandButtonClass}>
                                    <Plus className="size-4" />
                                    New user
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="right"
                                className="flex flex-col gap-0 sm:max-w-md"
                            >
                                <SheetHeader>
                                    <SheetTitle>
                                        {ROLES_REQUIRING_PASSWORD.includes(
                                            createRole,
                                        )
                                            ? 'Add user'
                                            : 'Invite user'}
                                    </SheetTitle>
                                </SheetHeader>

                                <Form
                                    {...UserController.store.form()}
                                    resetOnSuccess
                                    onSuccess={() => setCreateOpen(false)}
                                    className="flex flex-1 flex-col overflow-hidden"
                                >
                                    {({ processing, errors }) => (
                                        <>
                                            <div className="flex-1 space-y-4 overflow-y-auto px-4">
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

                                                <RoleSelect
                                                    assignableRoles={
                                                        assignableRoles
                                                    }
                                                    defaultValue={
                                                        assignableRoles[0]
                                                    }
                                                    onValueChange={
                                                        setCreateRole
                                                    }
                                                    error={errors.role}
                                                />

                                                {ROLES_REQUIRING_PASSWORD.includes(
                                                    createRole,
                                                ) && (
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
                                                            message={
                                                                errors.password
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <SheetFooter className="flex-row justify-end gap-2 border-t">
                                                <SheetClose asChild>
                                                    <Button variant="secondary">
                                                        Cancel
                                                    </Button>
                                                </SheetClose>
                                                <Button
                                                    type="submit"
                                                    className={
                                                        brandButtonClass
                                                    }
                                                    disabled={processing}
                                                >
                                                    {processing && (
                                                        <Spinner />
                                                    )}
                                                    {ROLES_REQUIRING_PASSWORD.includes(
                                                        createRole,
                                                    )
                                                        ? 'Create user'
                                                        : 'Send invite'}
                                                </Button>
                                            </SheetFooter>
                                        </>
                                    )}
                                </Form>
                            </SheetContent>
                        </Sheet>
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
                            onChange={(e) =>
                                handleSearchChange(e.target.value)
                            }
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

                {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-sidebar-border/70 bg-muted/50 px-4 py-2 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">
                            {selectedIds.length} selected
                        </p>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setBulkSuspendOpen(true)}
                            >
                                <Ban />
                                Suspend
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setBulkDeleteOpen(true)}
                            >
                                <Trash2 />
                                Delete
                            </Button>
                        </div>
                    </div>
                )}

                <Dialog
                    open={bulkSuspendOpen}
                    onOpenChange={setBulkSuspendOpen}
                >
                    <DialogContent>
                        <DialogTitle>
                            Suspend {selectedIds.length} user
                            {selectedIds.length === 1 ? '' : 's'}?
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            They won&apos;t be able to log in until
                            reactivated.
                        </p>

                        <Form
                            {...UserController.bulkSuspend.form()}
                            onSuccess={() => {
                                setBulkSuspendOpen(false);
                                setSelectedIds([]);
                            }}
                        >
                            {({ processing }) => (
                                <>
                                    {selectedIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="user_ids[]"
                                            value={id}
                                        />
                                    ))}
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
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>

                <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                    <DialogContent>
                        <DialogTitle>
                            Delete {selectedIds.length} user
                            {selectedIds.length === 1 ? '' : 's'}?
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            This cannot be undone.
                        </p>

                        <Form
                            {...UserController.bulkDestroy.form()}
                            onSuccess={() => {
                                setBulkDeleteOpen(false);
                                setSelectedIds([]);
                            }}
                        >
                            {({ processing }) => (
                                <>
                                    {selectedIds.map((id) => (
                                        <input
                                            key={id}
                                            type="hidden"
                                            name="user_ids[]"
                                            value={id}
                                        />
                                    ))}
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
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="w-10 px-4 py-3">
                                    <Checkbox
                                        checked={allSelected}
                                        disabled={selectableIds.length === 0}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all users"
                                    />
                                </th>
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
                                    Last login
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

                                const selectable = isRowSelectable(user);

                                return (
                                    <tr
                                        key={user.id}
                                        className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                    >
                                        <td className="px-4 py-3">
                                            <Checkbox
                                                checked={selectedIds.includes(
                                                    user.id,
                                                )}
                                                disabled={!selectable}
                                                onCheckedChange={() =>
                                                    toggleSelectOne(user.id)
                                                }
                                                aria-label={`Select ${user.name}`}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            {user.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <span>{user.email}</span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                copyEmail(
                                                                    user.email,
                                                                )
                                                            }
                                                            className="text-muted-foreground hover:text-foreground"
                                                        >
                                                            {copiedEmail ===
                                                            user.email ? (
                                                                <Check className="size-3.5" />
                                                            ) : (
                                                                <Copy className="size-3.5" />
                                                            )}
                                                            <span className="sr-only">
                                                                Copy email
                                                            </span>
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        {copiedEmail ===
                                                        user.email
                                                            ? 'Copied!'
                                                            : 'Copy email'}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
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
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {formatLastLogin(
                                                user.last_login_at,
                                            )}
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
                                                            <UserRoundCog />
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
                                                            <Pencil />
                                                            Edit
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canToggleStatus &&
                                                        (user.is_active ? (
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                onSelect={(
                                                                    e,
                                                                ) => {
                                                                    e.preventDefault();
                                                                    setSuspendingUserId(
                                                                        user.id,
                                                                    );
                                                                }}
                                                            >
                                                                <Ban />
                                                                Suspend
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                onSelect={() =>
                                                                    router.patch(
                                                                        UserController.updateStatus.url(
                                                                            user.id,
                                                                        ),
                                                                    )
                                                                }
                                                            >
                                                                <CircleCheck />
                                                                Activate
                                                            </DropdownMenuItem>
                                                        ))}
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
                                                            <Trash2 />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <Sheet
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
                                                <SheetContent
                                                    side="right"
                                                    className="flex flex-col gap-0 sm:max-w-md"
                                                >
                                                    <SheetHeader>
                                                        <SheetTitle>
                                                            Edit {user.name}
                                                        </SheetTitle>
                                                    </SheetHeader>

                                                    <Form
                                                        {...UserController.update.form(
                                                            user.id,
                                                        )}
                                                        onSuccess={() =>
                                                            setEditingUserId(
                                                                null,
                                                            )
                                                        }
                                                        className="flex flex-1 flex-col overflow-hidden"
                                                    >
                                                        {({
                                                            processing,
                                                            errors,
                                                        }) => (
                                                            <>
                                                                <div className="flex-1 space-y-4 overflow-y-auto px-4">
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
                                                                </div>

                                                                <SheetFooter className="flex-row justify-end gap-2 border-t">
                                                                    <SheetClose
                                                                        asChild
                                                                    >
                                                                        <Button variant="secondary">
                                                                            Cancel
                                                                        </Button>
                                                                    </SheetClose>
                                                                    <Button
                                                                        type="submit"
                                                                        className={
                                                                            brandButtonClass
                                                                        }
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
                                                                </SheetFooter>
                                                            </>
                                                        )}
                                                    </Form>
                                                </SheetContent>
                                            </Sheet>

                                            <Dialog
                                                open={
                                                    suspendingUserId ===
                                                    user.id
                                                }
                                                onOpenChange={(open) =>
                                                    setSuspendingUserId(
                                                        open
                                                            ? user.id
                                                            : null,
                                                    )
                                                }
                                            >
                                                <DialogContent>
                                                    <DialogTitle>
                                                        Suspend {user.name}?
                                                    </DialogTitle>
                                                    <p className="text-sm text-muted-foreground">
                                                        They won&apos;t be
                                                        able to log in until
                                                        reactivated.
                                                    </p>

                                                    <Form
                                                        {...UserController.updateStatus.form(
                                                            user.id,
                                                        )}
                                                        onSuccess={() =>
                                                            setSuspendingUserId(
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
                                                                    disabled={
                                                                        processing
                                                                    }
                                                                >
                                                                    {processing && (
                                                                        <Spinner />
                                                                    )}
                                                                    Suspend
                                                                </Button>
                                                            </DialogFooter>
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
                                        colSpan={7}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <DataPagination
                    paginator={users}
                    filters={{ search: filters.search, role: filters.role }}
                />
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
