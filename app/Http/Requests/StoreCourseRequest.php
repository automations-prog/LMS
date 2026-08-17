<?php

namespace App\Http\Requests;

use App\Models\Course;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCourseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', Course::class);
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
            'resource_file' => ['required_if:resource_type,pdf', 'nullable', 'file', 'mimes:pdf', 'max:10240'],
            'resource_url' => ['required_if:resource_type,link', 'nullable', 'url', 'max:2048'],
            'due_days' => ['nullable', 'integer', 'min:1'],
            'status' => ['required', Rule::in(['draft', 'published'])],
        ];
    }
}
