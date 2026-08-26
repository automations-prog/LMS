import { Form, Head, router } from '@inertiajs/react';
import { Lock, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import RoleController from '@/actions/App/Http/Controllers/RoleController';
import { DataPagination } from '@/components/data-pagination';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { brandButtonClass } from '@/lib/brand-theme';
import { index } from '@/routes/roles';
import type { Paginator } from '@/types';

type RoleRow = {
    id: number;
    name: string;
    users_count: number;
    permissions: { id: number; name: string }[];
};

type Filters = {
    search: string;
    per_page: number;
};

type Props = {
    roles: Paginator<RoleRow>;
    permissions: string[];
    systemRoles: string[];
    filters: Filters;
};

function applyFilters(overrides: Partial<Filters>, filters: Filters) {
    router.get(
        index().url,
        { ...filters, ...overrides },
        { preserveState: true, preserveScroll: true, replace: true },
    );
}

// Groups a flat list of permission names ("users.view", "agents.view",
// ...) by the resource prefix before the dot, so the checkbox matrix reads
// as one section per resource rather than one long flat list.
function groupPermissions(permissions: string[]) {
    const groups = new Map<string, string[]>();

    for (const permission of permissions) {
        const [resource] = permission.split('.');
        const existing = groups.get(resource) ?? [];
        existing.push(permission);
        groups.set(resource, existing);
    }

    return Array.from(groups.entries());
}

function PermissionMatrix({
    permissions,
    selected,
    onToggle,
    disabled,
    fieldName,
}: {
    permissions: string[];
    selected: string[];
    onToggle: (permission: string) => void;
    disabled?: boolean;
    /** When set, mirrors `selected` into hidden inputs under this name so a
     *  native <Form> submission picks the checkbox state up as `name[]`. */
    fieldName?: string;
}) {
    return (
        <div className="space-y-4">
            {fieldName &&
                selected.map((permission) => (
                    <input
                        key={permission}
                        type="hidden"
                        name={`${fieldName}[]`}
                        value={permission}
                    />
                ))}

            {groupPermissions(permissions).map(([resource, group]) => (
                <div key={resource} className="space-y-2">
                    <h4 className="text-sm font-medium capitalize">
                        {resource}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        {group.map((permission) => (
                            <label
                                key={permission}
                                className="flex items-center gap-2 text-sm"
                            >
                                <Checkbox
                                    checked={selected.includes(permission)}
                                    disabled={disabled}
                                    onCheckedChange={() => onToggle(permission)}
                                />
                                {permission}
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CreateRoleSheet({ permissions }: { permissions: string[] }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState('');
    const [selected, setSelected] = useState<string[]>([]);

    function toggle(permission: string) {
        setSelected((current) =>
            current.includes(permission)
                ? current.filter((existing) => existing !== permission)
                : [...current, permission],
        );
    }

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (next) {
                    setName('');
                    setSelected([]);
                }
            }}
        >
            <SheetTrigger asChild>
                <Button className={brandButtonClass}>
                    <Plus className="size-4" />
                    New role
                </Button>
            </SheetTrigger>
            <SheetContent
                side="right"
                className="flex flex-col gap-0 sm:max-w-md"
            >
                <SheetHeader>
                    <SheetTitle>Create role</SheetTitle>
                </SheetHeader>

                <Form
                    {...RoleController.store.form()}
                    resetOnSuccess
                    onSuccess={() => setOpen(false)}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="flex-1 space-y-4 overflow-y-auto px-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="role-name">Name</Label>
                                    <Input
                                        id="role-name"
                                        name="name"
                                        required
                                        autoFocus
                                        value={name}
                                        onChange={(e) =>
                                            setName(e.target.value)
                                        }
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <PermissionMatrix
                                    permissions={permissions}
                                    selected={selected}
                                    onToggle={toggle}
                                    fieldName="permissions"
                                />
                            </div>

                            <SheetFooter className="flex-row justify-end gap-2 border-t">
                                <SheetClose asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </SheetClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Create role
                                </Button>
                            </SheetFooter>
                        </>
                    )}
                </Form>
            </SheetContent>
        </Sheet>
    );
}

function EditRoleSheet({
    role,
    permissions,
    isSystemRole,
    open,
    onOpenChange,
}: {
    role: RoleRow;
    permissions: string[];
    isSystemRole: boolean;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const isSuperAdmin = role.name === 'super-admin';
    const [selected, setSelected] = useState(
        role.permissions.map((permission) => permission.name),
    );

    function toggle(permission: string) {
        setSelected((current) =>
            current.includes(permission)
                ? current.filter((existing) => existing !== permission)
                : [...current, permission],
        );
    }

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next);

                if (next) {
                    setSelected(
                        role.permissions.map((permission) => permission.name),
                    );
                }
            }}
        >
            <SheetContent
                side="right"
                className="flex flex-col gap-0 sm:max-w-md"
            >
                <SheetHeader>
                    <SheetTitle>Edit {role.name}</SheetTitle>
                </SheetHeader>

                <Form
                    {...RoleController.update.form(role.id)}
                    onSuccess={() => onOpenChange(false)}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="flex-1 space-y-4 overflow-y-auto px-4">
                                <div className="grid gap-2">
                                    <Label htmlFor={`role-name-${role.id}`}>
                                        Name
                                    </Label>
                                    <Input
                                        id={`role-name-${role.id}`}
                                        name="name"
                                        required
                                        readOnly={isSystemRole}
                                        defaultValue={role.name}
                                        className={
                                            isSystemRole
                                                ? 'cursor-not-allowed opacity-70'
                                                : undefined
                                        }
                                    />
                                    <InputError message={errors.name} />
                                    {isSystemRole && (
                                        <p className="text-xs text-muted-foreground">
                                            System role names can&apos;t be
                                            changed.
                                        </p>
                                    )}
                                </div>

                                {isSuperAdmin ? (
                                    <>
                                        <PermissionMatrix
                                            permissions={permissions}
                                            selected={permissions}
                                            onToggle={() => {}}
                                            disabled
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Super-admin always has every
                                            permission.
                                        </p>
                                    </>
                                ) : (
                                    <PermissionMatrix
                                        permissions={permissions}
                                        selected={selected}
                                        onToggle={toggle}
                                        fieldName="permissions"
                                    />
                                )}
                            </div>

                            <SheetFooter className="flex-row justify-end gap-2 border-t">
                                <SheetClose asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </SheetClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Save changes
                                </Button>
                            </SheetFooter>
                        </>
                    )}
                </Form>
            </SheetContent>
        </Sheet>
    );
}

function DeleteRoleDialog({
    role,
    open,
    onOpenChange,
}: {
    role: RoleRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogTitle>Delete {role?.name}?</DialogTitle>
                <DialogDescription>
                    This permanently removes the role and its permission
                    assignments. This can&apos;t be undone.
                </DialogDescription>

                {role && (
                    <Form
                        {...RoleController.destroy.form(role.id)}
                        onSuccess={() => onOpenChange(false)}
                    >
                        {({ processing }) => (
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Delete role
                                </Button>
                            </DialogFooter>
                        )}
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function RolesIndex({
    roles,
    permissions,
    systemRoles,
    filters,
}: Props) {
    const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
    const [deletingRole, setDeletingRole] = useState<RoleRow | null>(null);

    const [search, setSearch] = useState(filters.search);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced directly from the input's onChange — see the identical note
    // in resources/js/pages/users/index.tsx for why not a useEffect.
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
            <Head title="Roles & Permissions" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex items-center justify-between">
                    <Heading
                        variant="small"
                        title="Roles & Permissions"
                        description="Manage roles and the permissions assigned to each"
                    />

                    <CreateRoleSheet permissions={permissions} />
                </div>

                <div className="relative max-w-xs">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        placeholder="Search by role name..."
                        className="pl-9"
                    />
                </div>

                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-sidebar-border/70 text-left text-muted-foreground dark:border-sidebar-border">
                                <th className="px-4 py-3 font-medium">Role</th>
                                <th className="px-4 py-3 font-medium">Users</th>
                                <th className="px-4 py-3 font-medium">
                                    Permissions
                                </th>
                                <th className="px-4 py-3 font-medium">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.data.map((role) => {
                                const isSystemRole = systemRoles.includes(
                                    role.name,
                                );

                                return (
                                    <tr
                                        key={role.id}
                                        className="border-b border-sidebar-border/70 last:border-0 dark:border-sidebar-border"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {role.name}
                                                {isSystemRole && (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-transparent bg-muted text-muted-foreground"
                                                    >
                                                        <Lock className="size-3" />
                                                        System
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {role.users_count}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {role.permissions.length} of{' '}
                                            {permissions.length}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setEditingRole(role)
                                                    }
                                                >
                                                    <Pencil />
                                                    Edit
                                                </Button>

                                                {isSystemRole ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled
                                                                >
                                                                    <Trash2 />
                                                                    Delete
                                                                </Button>
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            System roles
                                                            can&apos;t be
                                                            deleted.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : role.users_count > 0 ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled
                                                                >
                                                                    <Trash2 />
                                                                    Delete
                                                                </Button>
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Reassign the{' '}
                                                            {role.users_count}{' '}
                                                            user
                                                            {role.users_count ===
                                                            1
                                                                ? ''
                                                                : 's'}{' '}
                                                            with this role
                                                            first.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setDeletingRole(
                                                                role,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 />
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {roles.data.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-4 py-6 text-center text-muted-foreground"
                                    >
                                        No roles found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <DataPagination
                    paginator={roles}
                    filters={{ search: filters.search }}
                />
            </div>

            {editingRole && (
                <EditRoleSheet
                    role={editingRole}
                    permissions={permissions}
                    isSystemRole={systemRoles.includes(editingRole.name)}
                    open={editingRole !== null}
                    onOpenChange={(open) =>
                        setEditingRole(open ? editingRole : null)
                    }
                />
            )}

            <DeleteRoleDialog
                role={deletingRole}
                open={deletingRole !== null}
                onOpenChange={(open) =>
                    setDeletingRole(open ? deletingRole : null)
                }
            />
        </>
    );
}

RolesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Roles & Permissions',
            href: index(),
        },
    ],
};
