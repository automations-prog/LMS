<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Course;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->unique()->sentence(3);

        return [
            'title' => $title,
            'slug' => Str::slug($title).'-'.fake()->unique()->numberBetween(1, 100000),
            'description' => fake()->paragraph(),
            'category_id' => Category::factory(),
            'resource_type' => 'link',
            'resource_url' => fake()->url(),
            'due_days' => null,
            'status' => 'draft',
        ];
    }

    /**
     * Indicate that the course is published.
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'published',
        ]);
    }
}
