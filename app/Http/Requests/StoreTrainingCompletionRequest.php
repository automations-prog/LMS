<?php

namespace App\Http\Requests;

use App\Models\TrainingCompletion;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreTrainingCompletionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * A submission is allowed when there's no existing record yet, or the
     * existing one was rejected — the agent may not resubmit while
     * pending_review or already verified.
     */
    public function authorize(): bool
    {
        $completion = $this->user()->trainingCompletion;

        return ! $completion || $completion->status === TrainingCompletion::STATUS_REJECTED;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'certificate_file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
