import { Form, Head } from '@inertiajs/react';
import InviteController from '@/actions/App/Http/Controllers/InviteController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    authButtonClass,
    authInputClass,
    authLabelClass,
} from '@/lib/brand-theme';

type Props = {
    user: {
        id: number;
        name: string;
        email: string;
    };
    query: Record<string, string>;
    passwordRules: string;
};

export default function SetPassword({ user, query, passwordRules }: Props) {
    return (
        <>
            <Head title="Set your password" />

            <Form
                {...InviteController.store.form(user, { query })}
                resetOnSuccess={['password', 'password_confirmation']}
            >
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={user.email}
                                className="mt-1 block w-full"
                                readOnly
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password" className={authLabelClass}>
                                Password
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                className={`mt-1 block w-full ${authInputClass}`}
                                autoFocus
                                placeholder="Password"
                                passwordrules={passwordRules}
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="password_confirmation"
                                className={authLabelClass}
                            >
                                Confirm password
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                autoComplete="new-password"
                                className={`mt-1 block w-full ${authInputClass}`}
                                placeholder="Confirm password"
                                passwordrules={passwordRules}
                            />
                            <InputError
                                message={errors.password_confirmation}
                                className="mt-2"
                            />
                        </div>

                        <Button
                            type="submit"
                            className={`mt-4 w-full ${authButtonClass}`}
                            disabled={processing}
                            data-test="set-password-button"
                        >
                            {processing && <Spinner />}
                            Set password
                        </Button>
                    </div>
                )}
            </Form>
        </>
    );
}

SetPassword.layout = {
    title: 'Set your password',
    description: 'Welcome! Please choose a password to activate your account',
};
