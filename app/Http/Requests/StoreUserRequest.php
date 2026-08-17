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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules(),
            'password' => ['required', 'string', Password::default()],
            'role' => ['required', 'string', Rule::in(UserPolicy::assignableRoles($this->user()))],
        ];
    }
}
