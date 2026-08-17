<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCourseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('course'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'thumbnail' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'resource_type' => ['required', Rule::in(['pdf', 'link'])],
            // Only require a (re-)upload if switching to/staying on "pdf" with no
            // existing file on record — otherwise leaving it blank keeps the current file.
            'resource_file' => [
                Rule::requiredIf(fn () => $this->input('resource_type') === 'pdf' && ! $this->route('course')->resource_path),
                'nullable', 'file', 'mimes:pdf', 'max:10240',
            ],
            'resource_url' => ['required_if:resource_type,link', 'nullable', 'url', 'max:2048'],
            'due_days' => ['nullable', 'integer', 'min:1'],
            'status' => ['required', Rule::in(['draft', 'published'])],
        ];
    }
}
