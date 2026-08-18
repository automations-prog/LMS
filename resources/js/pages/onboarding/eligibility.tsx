import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import EligibilityController from '@/actions/App/Http/Controllers/EligibilityController';
import FileInput from '@/components/file-input';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
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
import { Textarea } from '@/components/ui/textarea';
import { brandButtonClass } from '@/lib/brand-theme';
import { dashboard } from '@/routes';

type Props = {
    states: string[];
};

function YesNoSelect({
    name,
    value,
    onValueChange,
}: {
    name: string;
    value: 'yes' | 'no';
    onValueChange: (value: 'yes' | 'no') => void;
}) {
    return (
        <>
            <Select
                value={value}
                onValueChange={(v) => onValueChange(v as 'yes' | 'no')}
            >
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                </SelectContent>
            </Select>
            <input type="hidden" name={name} value={value === 'yes' ? '1' : '0'} />
        </>
    );
}

export default function Eligibility({ states }: Props) {
    const [hasFelony, setHasFelony] = useState<'yes' | 'no'>('no');
    const [isCitizen, setIsCitizen] = useState<'yes' | 'no'>('yes');
    const [homeState, setHomeState] = useState('');

    return (
        <>
            <Head title="Eligibility" />

            <div className="mx-auto flex h-full max-w-2xl flex-1 flex-col gap-6 p-4">
                <Heading
                    variant="small"
                    title="Eligibility check"
                    description="Before you get started, we need to confirm a few things about your eligibility."
                />

                <Form
                    {...EligibilityController.store.form()}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-6 rounded-xl border border-sidebar-border/70 p-6 dark:border-sidebar-border">
                                <div className="grid gap-2">
                                    <Label htmlFor="date_of_birth">
                                        Date of birth
                                    </Label>
                                    <Input
                                        id="date_of_birth"
                                        type="date"
                                        name="date_of_birth"
                                        required
                                    />
                                    <InputError
                                        message={errors.date_of_birth}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="home_state">
                                        Home state
                                    </Label>
                                    <Combobox
                                        id="home_state"
                                        value={homeState}
                                        onChange={setHomeState}
                                        placeholder="Select a state"
                                        searchPlaceholder="Search states…"
                                        emptyText="No states found."
                                        options={states.map((state) => ({
                                            value: state,
                                            label: state,
                                        }))}
                                    />
                                    <input
                                        type="hidden"
                                        name="home_state"
                                        value={homeState}
                                    />
                                    <InputError message={errors.home_state} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>
                                        Have you ever been convicted of a
                                        felony?
                                    </Label>
                                    <YesNoSelect
                                        name="has_felony_conviction"
                                        value={hasFelony}
                                        onValueChange={setHasFelony}
                                    />
                                    <InputError
                                        message={
                                            errors.has_felony_conviction
                                        }
                                    />
                                </div>

                                {hasFelony === 'yes' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="felony_details">
                                            Please provide details
                                        </Label>
                                        <Textarea
                                            id="felony_details"
                                            name="felony_details"
                                            rows={4}
                                        />
                                        <InputError
                                            message={errors.felony_details}
                                        />
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label>
                                        Are you a U.S. citizen?
                                    </Label>
                                    <YesNoSelect
                                        name="is_us_citizen"
                                        value={isCitizen}
                                        onValueChange={setIsCitizen}
                                    />
                                    <InputError
                                        message={errors.is_us_citizen}
                                    />
                                </div>

                                {isCitizen === 'no' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="work_authorization_file">
                                            Work authorization document
                                        </Label>
                                        <FileInput
                                            id="work_authorization_file"
                                            name="work_authorization_file"
                                            accept="application/pdf,image/*"
                                        />
                                        <InputError
                                            message={
                                                errors.work_authorization_file
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                className={`w-full ${brandButtonClass}`}
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Submit
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Eligibility.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Eligibility',
            href: '#',
        },
    ],
};
