<?php

namespace Database\Factories;

use App\Models\TrainingProgress;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TrainingProgress>
 */
class TrainingProgressFactory extends Factory
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
            'enrollment_id' => fake()->unique()->uuid(),
            'metadata' => ['Name' => fake()->words(3, true)],
            'synced_at' => now(),
        ];
    }
}
