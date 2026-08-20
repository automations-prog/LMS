<?php

namespace App\Http\Requests;

use App\Models\EligibilityAttestation;
use App\Models\LicenseSubmission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreLicenseSubmissionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * Eligibility must be cleared before a license copy can be submitted at
     * all, and beyond that a submission is allowed when there's no existing
     * record yet, or the existing one was rejected — the agent may not
     * resubmit while pending_review or already verified.
     */
    public function authorize(): bool
    {
        if ($this->user()->eligibilityAttestation?->status !== EligibilityAttestation::STATUS_CLEARED) {
            return false;
        }

        $submission = $this->user()->licenseSubmission;

        return ! $submission || $submission->status === LicenseSubmission::STATUS_REJECTED;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'license_file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
