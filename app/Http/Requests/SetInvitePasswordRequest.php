<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class SetInvitePasswordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * The `signed` route middleware is the real gate here — a request can
     * only reach this form with a valid, unexpired invite signature.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => ['required', 'string', 'confirmed', Password::default()],
        ];
    }
}
