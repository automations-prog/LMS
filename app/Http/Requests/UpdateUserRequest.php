<?php

namespace App\Http\Requests;

use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Policies\UserPolicy;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('user'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->route('user')->id),
            'password' => ['nullable', 'string', Password::default()],
            'role' => ['required', 'string', Rule::in(UserPolicy::assignableRoles($this->user()))],
        ];
    }
}
