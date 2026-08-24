import { Form } from '@inertiajs/react';
import LicenseController from '@/actions/App/Http/Controllers/LicenseController';
import FileInput from '@/components/file-input';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { StageIcon } from '@/components/ui/stage-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { ONBOARDING_ICONS } from '@/lib/onboarding-icons';

type Props = {
    licenseStatus: 'pending_review' | 'rejected' | null;
    licenseNote: string | null;
};

export default function SubmitLicenseCopyCard({
    licenseStatus,
    licenseNote,
}: Props) {
    return (
        <Card>
            <CardHeader className="space-y-1">
                <div className="flex items-center gap-3">
                    <StageIcon icon={ONBOARDING_ICONS.license} />
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-medium">
                            Upload your license
                        </h3>
                        <StatusBadge status={licenseStatus ?? 'in_progress'} />
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Once your state license is issued, upload a copy here so it
                    can be verified.
                </p>
            </CardHeader>

            <CardContent>
                {licenseStatus === 'pending_review' ? (
                    <p className="text-sm font-medium">
                        License submitted — awaiting verification.
                    </p>
                ) : (
                    <>
                        {licenseStatus === 'rejected' && licenseNote && (
                            <p className="mb-4 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                                Your license wasn't verified: {licenseNote}
                            </p>
                        )}

                        <Form
                            {...LicenseController.store.form()}
                            resetOnSuccess
                        >
                            {({ processing, progress, errors }) => (
                                <div className="space-y-2">
                                    <Label htmlFor="license_file">
                                        Upload your license copy
                                    </Label>
                                    <FileInput
                                        id="license_file"
                                        name="license_file"
                                        accept="application/pdf,image/*"
                                        disabled={processing}
                                    />
                                    {processing && (
                                        <div className="space-y-1">
                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all"
                                                    style={{
                                                        width: `${progress?.percentage ?? 0}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Uploading
                                                {progress?.percentage
                                                    ? ` — ${progress.percentage}%`
                                                    : '…'}
                                            </p>
                                        </div>
                                    )}
                                    <InputError message={errors.license_file} />
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full"
                                    >
                                        {processing && <Spinner />}
                                        {processing
                                            ? 'Uploading…'
                                            : 'Submit license copy'}
                                    </Button>
                                </div>
                            )}
                        </Form>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
