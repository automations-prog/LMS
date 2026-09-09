<?php

namespace Database\Factories;

use App\Models\AhipCertification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AhipCertification>
 */
class AhipCertificationFactory extends Factory
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
            'certificate_path' => 'ahip-certificates/'.fake()->uuid().'.pdf',
            'status' => AhipCertification::STATUS_PENDING_REVIEW,
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
            'status' => AhipCertification::STATUS_REJECTED,
            'note' => fake()->sentence(),
        ]);
    }

    /**
     * Indicate that the certificate was verified, with an expiration date.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => AhipCertification::STATUS_VERIFIED,
            'expires_at' => now()->addYear(),
        ]);
    }
}
