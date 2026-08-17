<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Seed a handful of starter course categories.
     */
    public function run(): void
    {
        $categories = [
            'General',
            'Onboarding',
            'Compliance',
            'Sales',
            'Technical',
        ];

        foreach ($categories as $category) {
            Category::firstOrCreate(['name' => $category]);
        }
    }
}
