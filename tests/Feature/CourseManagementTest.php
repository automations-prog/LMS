<?php

use App\Models\Category;
use App\Models\Course;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    Storage::fake('public');
});

test('admin can view the course list', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('courses.index'))
        ->assertOk();
});

test('agent cannot access course management', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('courses.index'))
        ->assertForbidden();
});

test('admin can create a course with an uploaded pdf', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $category = Category::factory()->create();

    $file = UploadedFile::fake()->create('resource.pdf', 500, 'application/pdf');

    $this->actingAs($admin)
        ->post(route('courses.store'), [
            'title' => 'Intro to Widgets',
            'description' => 'Learn the basics.',
            'category_id' => $category->id,
            'resource_type' => 'pdf',
            'resource_file' => $file,
            'status' => 'draft',
        ])
        ->assertRedirect(route('courses.index'));

    $course = Course::where('title', 'Intro to Widgets')->first();
    expect($course)->not->toBeNull();
    expect($course->resource_type)->toBe('pdf');
    expect($course->resource_path)->not->toBeNull();
    expect($course->status)->toBe('draft');

    Storage::disk('public')->assertExists($course->resource_path);
});

test('admin can create a course with an external link', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $category = Category::factory()->create();

    $this->actingAs($admin)
        ->post(route('courses.store'), [
            'title' => 'External Resource Course',
            'description' => 'Learn from a link.',
            'category_id' => $category->id,
            'resource_type' => 'link',
            'resource_url' => 'https://example.com/resource',
            'status' => 'published',
        ])
        ->assertRedirect(route('courses.index'));

    $course = Course::where('title', 'External Resource Course')->first();
    expect($course->resource_type)->toBe('link');
    expect($course->resource_url)->toBe('https://example.com/resource');
    expect($course->resource_path)->toBeNull();
    expect($course->status)->toBe('published');
});

test('creating a pdf course without a file fails validation', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $category = Category::factory()->create();

    $this->actingAs($admin)
        ->post(route('courses.store'), [
            'title' => 'Missing File Course',
            'description' => 'Should fail.',
            'category_id' => $category->id,
            'resource_type' => 'pdf',
            'status' => 'draft',
        ])
        ->assertSessionHasErrors('resource_file');
});

test('creating a link course without a url fails validation', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $category = Category::factory()->create();

    $this->actingAs($admin)
        ->post(route('courses.store'), [
            'title' => 'Missing Url Course',
            'description' => 'Should fail.',
            'category_id' => $category->id,
            'resource_type' => 'link',
            'status' => 'draft',
        ])
        ->assertSessionHasErrors('resource_url');
});

test('agent cannot create a course', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');
    $category = Category::factory()->create();

    $this->actingAs($agent)
        ->post(route('courses.store'), [
            'title' => 'Should Not Work',
            'description' => 'Blocked.',
            'category_id' => $category->id,
            'resource_type' => 'link',
            'resource_url' => 'https://example.com',
            'status' => 'draft',
        ])
        ->assertForbidden();
});

test('admin can toggle course status', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $course = Course::factory()->create(['status' => 'draft']);
    $referer = route('courses.index', ['page' => 2]);

    $this->actingAs($admin)
        ->from($referer)
        ->patch(route('courses.update-status', $course))
        ->assertRedirect($referer);

    expect($course->fresh()->status)->toBe('published');
});

test('admin can delete a course and its stored files', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $category = Category::factory()->create();

    $file = UploadedFile::fake()->create('resource.pdf', 200, 'application/pdf');

    $this->actingAs($admin)->post(route('courses.store'), [
        'title' => 'Course To Delete',
        'description' => 'Temp.',
        'category_id' => $category->id,
        'resource_type' => 'pdf',
        'resource_file' => $file,
        'status' => 'draft',
    ]);

    $course = Course::where('title', 'Course To Delete')->first();
    $path = $course->resource_path;
    $referer = route('courses.index', ['page' => 2]);

    $this->actingAs($admin)
        ->from($referer)
        ->delete(route('courses.destroy', $course))
        ->assertRedirect($referer);

    expect(Course::find($course->id))->toBeNull();
    Storage::disk('public')->assertMissing($path);
});

test('course list can be searched and filtered', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $category = Category::factory()->create(['name' => 'Sales']);
    $other = Category::factory()->create(['name' => 'Technical']);

    Course::factory()->create(['title' => 'Findable Course', 'category_id' => $category->id, 'status' => 'draft']);
    Course::factory()->create(['title' => 'Other Course', 'category_id' => $other->id, 'status' => 'published']);

    $this->actingAs($admin)
        ->get(route('courses.index', ['search' => 'Findable']))
        ->assertInertia(fn ($page) => $page
            ->has('courses.data', 1)
            ->where('courses.data.0.title', 'Findable Course'));

    $this->actingAs($admin)
        ->get(route('courses.index', ['status' => 'published']))
        ->assertInertia(fn ($page) => $page
            ->has('courses.data', 1)
            ->where('courses.data.0.title', 'Other Course'));
});

test('admin can create, rename, and delete a category', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->post(route('categories.store'), ['name' => 'New Category'])
        ->assertRedirect();

    $category = Category::where('name', 'New Category')->first();
    expect($category)->not->toBeNull();

    $this->actingAs($admin)
        ->put(route('categories.update', $category), ['name' => 'Renamed Category'])
        ->assertRedirect();

    expect($category->fresh()->name)->toBe('Renamed Category');

    $this->actingAs($admin)
        ->delete(route('categories.destroy', $category))
        ->assertRedirect();

    expect(Category::find($category->id))->toBeNull();
});

test('a category still in use cannot be deleted', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $category = Category::factory()->create();
    Course::factory()->create(['category_id' => $category->id]);

    $this->actingAs($admin)
        ->delete(route('categories.destroy', $category))
        ->assertRedirect();

    expect(Category::find($category->id))->not->toBeNull();
});

test('agent can browse only published courses', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $category = Category::factory()->create();
    Course::factory()->create(['title' => 'Published Course', 'category_id' => $category->id, 'status' => 'published']);
    Course::factory()->create(['title' => 'Draft Course', 'category_id' => $category->id, 'status' => 'draft']);

    $this->actingAs($agent)
        ->get(route('courses.browse'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('courses', 1)
            ->where('courses.0.title', 'Published Course'));
});

test('browse computes remaining due days and progress from the publish date', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $withDueDate = Course::factory()->create([
        'title' => 'Has A Due Date',
        'status' => 'published',
        'due_days' => 30,
        'created_at' => now()->subDays(10),
    ]);

    $withoutDueDate = Course::factory()->create([
        'title' => 'No Due Date',
        'status' => 'published',
        'due_days' => null,
    ]);

    $response = $this->actingAs($agent)->get(route('courses.browse'));

    $response->assertInertia(fn ($page) => $page
        ->where('courses.0.title', 'Has A Due Date')
        ->where('courses.0.due_in_days', 20)
        ->where('courses.0.progress_percent', 33)
        ->where('courses.1.title', 'No Due Date')
        ->where('courses.1.due_in_days', null)
        ->where('courses.1.progress_percent', null));
});

test('agent cannot access the course management table', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('courses.index'))
        ->assertForbidden();
});

test('admin cannot access the agent browse route', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('courses.browse'))
        ->assertForbidden();
});

test('creating a resource returns to the page you came from', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $category = Category::factory()->create();
    $returnTo = route('courses.index', ['page' => 2, 'per_page' => 10]);

    $this->actingAs($admin)
        ->post(route('courses.store'), [
            'title' => 'Returns Somewhere',
            'description' => 'Test.',
            'category_id' => $category->id,
            'resource_type' => 'link',
            'resource_url' => 'https://example.com',
            'status' => 'draft',
            'return_to' => $returnTo,
        ])
        ->assertRedirect($returnTo);
});

test('updating a resource returns to the page you came from', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $course = Course::factory()->create();
    $returnTo = route('courses.index', ['page' => 2, 'per_page' => 10]);

    $this->actingAs($admin)
        ->put(route('courses.update', $course), [
            'title' => $course->title,
            'description' => $course->description,
            'category_id' => $course->category_id,
            'resource_type' => 'link',
            'resource_url' => 'https://example.com',
            'status' => 'draft',
            'return_to' => $returnTo,
        ])
        ->assertRedirect($returnTo);
});

test('an off-site return_to value is ignored', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');
    $category = Category::factory()->create();

    $this->actingAs($admin)
        ->post(route('courses.store'), [
            'title' => 'Ignores Malicious Return',
            'description' => 'Test.',
            'category_id' => $category->id,
            'resource_type' => 'link',
            'resource_url' => 'https://example.com',
            'status' => 'draft',
            'return_to' => 'https://evil.example.com/phishing',
        ])
        ->assertRedirect(route('courses.index'));
});

test('admin can view the categories page', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->get(route('categories.index'))
        ->assertOk();
});

test('agent cannot view the categories page', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $this->actingAs($agent)
        ->get(route('categories.index'))
        ->assertForbidden();
});

test('admin can bulk unpublish resources, leaving drafts untouched', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $published = Course::factory()->create(['status' => 'published']);
    $otherPublished = Course::factory()->create(['status' => 'published']);
    $alreadyDraft = Course::factory()->create(['status' => 'draft']);

    $this->actingAs($admin)
        ->patch(route('courses.bulk-unpublish'), [
            'course_ids' => [$published->id, $otherPublished->id, $alreadyDraft->id],
        ])
        ->assertRedirect();

    expect($published->fresh()->status)->toBe('draft');
    expect($otherPublished->fresh()->status)->toBe('draft');
    expect($alreadyDraft->fresh()->status)->toBe('draft');
});

test('agent cannot bulk unpublish resources', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $course = Course::factory()->create(['status' => 'published']);

    $this->actingAs($agent)
        ->patch(route('courses.bulk-unpublish'), ['course_ids' => [$course->id]])
        ->assertForbidden();

    expect($course->fresh()->status)->toBe('published');
});

test('admin can bulk delete resources', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $courseOne = Course::factory()->create();
    $courseTwo = Course::factory()->create();

    $this->actingAs($admin)
        ->delete(route('courses.bulk-destroy'), [
            'course_ids' => [$courseOne->id, $courseTwo->id],
        ])
        ->assertRedirect();

    expect(Course::find($courseOne->id))->toBeNull();
    expect(Course::find($courseTwo->id))->toBeNull();
});

test('agent cannot bulk delete resources', function () {
    $agent = User::factory()->create();
    $agent->assignRole('agent');

    $course = Course::factory()->create();

    $this->actingAs($agent)
        ->delete(route('courses.bulk-destroy'), ['course_ids' => [$course->id]])
        ->assertForbidden();

    expect(Course::find($course->id))->not->toBeNull();
});
