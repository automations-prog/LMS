<?php

namespace Database\Factories;

use App\Models\EligibilityAttestation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EligibilityAttestation>
 */
class EligibilityAttestationFactory extends Factory
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
            'date_of_birth' => fake()->dateTimeBetween('-60 years', '-19 years'),
            'home_state' => fake()->randomElement(['CA', 'TX', 'NY', 'FL', 'WA']),
            'has_felony_conviction' => false,
            'felony_details' => null,
            'is_us_citizen' => true,
            'work_authorization_path' => null,
            'status' => EligibilityAttestation::STATUS_CLEARED,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ];
    }

    /**
     * Indicate that the attestation discloses a felony and is flagged for review.
     */
    public function flaggedForWaiver(): static
    {
        return $this->state(fn (array $attributes) => [
            'has_felony_conviction' => true,
            'felony_details' => fake()->sentence(),
            'status' => EligibilityAttestation::STATUS_FLAGGED_FOR_WAIVER,
        ]);
    }
}
