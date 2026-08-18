<?php

namespace App\Http\Requests;

use App\Rules\Age18OrOlder;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEligibilityAttestationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * An attestation is terminal once created (whatever its status), so a
     * user who already has one can never submit another.
     */
    public function authorize(): bool
    {
        return ! $this->user()->eligibilityAttestation()->exists();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * `Rule::requiredIf()` with a closure is used instead of the
     * `required_if:field,value` string rule — that string form does a loose
     * comparison against the raw request value, which doesn't reliably match
     * when the field is a real boolean rather than the literal string "1"/"0".
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'date_of_birth' => ['required', 'date', 'before:today', new Age18OrOlder],
            'home_state' => ['required', 'string', 'size:2'],
            'has_felony_conviction' => ['required', 'boolean'],
            'felony_details' => [Rule::requiredIf($this->boolean('has_felony_conviction')), 'nullable', 'string', 'max:2000'],
            'is_us_citizen' => ['required', 'boolean'],
            'work_authorization_file' => [Rule::requiredIf(! $this->boolean('is_us_citizen')), 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
