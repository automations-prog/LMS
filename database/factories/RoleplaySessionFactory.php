<?php

namespace Database\Factories;

use App\Models\RoleplaySession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RoleplaySession>
 */
class RoleplaySessionFactory extends Factory
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
            'scenario_key' => config('roleplay.scenario.key'),
            'status' => RoleplaySession::STATUS_IN_PROGRESS,
            'started_at' => now(),
        ];
    }

    /**
     * The call ended and the transcript was captured, awaiting scoring.
     */
    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => RoleplaySession::STATUS_COMPLETED,
            'transcript' => [
                ['role' => 'assistant', 'text' => 'Hello?', 'at' => now()->toIso8601String()],
                ['role' => 'agent', 'text' => 'Hi, is this a good time to talk?', 'at' => now()->toIso8601String()],
            ],
            'ended_at' => now(),
        ]);
    }

    /**
     * The transcript has been graded.
     */
    public function scored(): static
    {
        /** @var array<int, array{key: string, label: string, description: string}> $rubric */
        $rubric = config('roleplay.rubric');

        return $this->completed()->state(fn () => [
            'status' => RoleplaySession::STATUS_SCORED,
            'overall_score' => 78,
            'score' => [
                'criteria' => array_map(fn (array $criterion) => [
                    'key' => $criterion['key'],
                    'label' => $criterion['label'],
                    'score' => 4,
                    'feedback' => 'Solid, could be more specific.',
                ], $rubric),
                'overall_score' => 78,
                'summary' => 'A solid first attempt with room to tighten up objection handling.',
            ],
            'scored_at' => now(),
        ]);
    }
}
