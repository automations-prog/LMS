<?php

namespace Database\Factories;

use App\Models\TrainingCompletion;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TrainingCompletion>
 */
class TrainingCompletionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'certificate_path' => 'training-certificates/'.fake()->uuid().'.pdf',
            'status' => TrainingCompletion::STATUS_PENDING_REVIEW,
            'note' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ];
    }

    /**
     * Indicate that the certificate was rejected, with a reviewer note.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => TrainingCompletion::STATUS_REJECTED,
            'note' => fake()->sentence(),
        ]);
    }
}
