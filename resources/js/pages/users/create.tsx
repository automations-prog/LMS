import { Form, Head } from '@inertiajs/react';
import UserController from '@/actions/App/Http/Controllers/UserController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
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

const ROLE_LABELS: Record<string, string> = {
    agent: 'Agent',
    admin: 'Admin',
    'super-admin': 'Super Admin',
};

type Props = {
    assignableRoles: string[];
};

export default function UsersCreate({ assignableRoles }: Props) {
    return (
        <>
            <Head title="Add user" />

            <div className="max-w-xl space-y-6">
                <Heading
                    title="Add user"
                    description="Create a new agent, admin, or super admin account"
                />

                <Form
                    {...UserController.store.form()}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    autoFocus
                                    autoComplete="name"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoComplete="email"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    autoComplete="new-password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    name="role"
                                    defaultValue={assignableRoles[0]}
                                >
                                    <SelectTrigger
                                        id="role"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignableRoles.map((role) => (
                                            <SelectItem
                                                key={role}
                                                value={role}
                                            >
                                                {ROLE_LABELS[role] ?? role}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.role} />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button disabled={processing}>
                                    {processing && <Spinner />}
                                    Create user
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

UsersCreate.layout = {
    breadcrumbs: [
        {
            title: 'Users',
            href: index(),
        },
        {
            title: 'Add user',
            href: '#',
        },
    ],
};
