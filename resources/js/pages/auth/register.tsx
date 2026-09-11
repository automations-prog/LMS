import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    authButtonClass,
    authInputClass,
    authLabelClass,
    authLinkClass,
} from '@/lib/brand-theme';
import { login } from '@/routes';
import { store } from '@/routes/register';

export default function Register() {
    return (
        <>
            <Head title="Register" />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className={authLabelClass}>
                                Name
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="name"
                                placeholder="Jane Doe"
                                className={authInputClass}
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email" className={authLabelClass}>
                                Email address
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                tabIndex={2}
                                autoComplete="email"
                                placeholder="email@example.com"
                                className={authInputClass}
                            />
                            <InputError message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="company_name"
                                className={authLabelClass}
                            >
                                Company{' '}
                                <span className="font-normal text-muted-foreground">
                                    (optional)
                                </span>
                            </Label>
                            <Input
                                id="company_name"
                                type="text"
                                name="company_name"
                                tabIndex={3}
                                autoComplete="organization"
                                placeholder="Your company name"
                                className={authInputClass}
                            />
                            <InputError message={errors.company_name} />
                        </div>

                        <div className="grid gap-2">
                            <Label
                                htmlFor="password"
                                className={authLabelClass}
                            >
                                Password
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                tabIndex={4}
                                autoComplete="new-password"
                                placeholder="Password"
                                className={authInputClass}
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
                                required
                                tabIndex={5}
                                autoComplete="new-password"
                                placeholder="Confirm password"
                                className={authInputClass}
                            />
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <Button
                            type="submit"
                            className={`mt-2 w-full ${authButtonClass}`}
                            tabIndex={6}
                            disabled={processing}
                            data-test="register-button"
                        >
                            {processing && <Spinner />}
                            Create account
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <TextLink
                                href={login()}
                                className={authLinkClass}
                                tabIndex={7}
                            >
                                Log in
                            </TextLink>
                        </p>
                    </div>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create an account',
    description:
        "Sign up below — an admin will review and approve your account before you can log in.",
};
