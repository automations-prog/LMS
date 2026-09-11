<?php

namespace App\Http\Requests;

use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', User::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * Agents are invited via a signed "set your password" link, so no
     * password is collected for them here. Admins and super admins are
     * created directly and log in immediately, so a password is required.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules(),
            'role' => ['required', 'string', Rule::in(UserPolicy::assignableRoles($this->user()))],
            // 'none' is the Select's explicit "no segment" option — Radix's
            // Select can't submit an empty string as a value, so the
            // frontend sends this sentinel instead; the controller maps it
            // back to null before saving.
            'agent_type' => ['nullable', 'string', Rule::in([...array_keys(User::AGENT_TYPES), 'none'])],
            'password' => ['nullable', 'required_if:role,admin,super-admin', 'string', Password::default()],
        ];
    }
}
