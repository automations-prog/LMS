<?php

namespace Database\Factories;

use App\Models\LicenseSubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LicenseSubmission>
 */
class LicenseSubmissionFactory extends Factory
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
            'license_path' => 'license-documents/'.fake()->uuid().'.pdf',
            'status' => LicenseSubmission::STATUS_PENDING_REVIEW,
            'note' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ];
    }

    /**
     * Indicate that the license copy was rejected, with a reviewer note.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => LicenseSubmission::STATUS_REJECTED,
            'note' => fake()->sentence(),
        ]);
    }

    /**
     * Indicate that the license copy was verified, with an expiration date.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => LicenseSubmission::STATUS_VERIFIED,
            'expires_at' => now()->addYear(),
        ]);
    }
}
