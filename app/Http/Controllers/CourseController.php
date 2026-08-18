<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Category;
use App\Models\Course;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    /**
     * Display the course management list.
     */
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Course::class);

        $perPage = $this->perPage($request);

        $search = $request->string('search')->trim()->toString();
        $category = $request->string('category')->trim()->toString();
        $status = $request->string('status')->trim()->toString();

        $courses = Course::query()
            ->with('category')
            ->when($search !== '', fn ($query) => $query->where('title', 'like', "%{$search}%"))
            ->when($category !== '', fn ($query) => $query->where('category_id', $category))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate($perPage)
            // Not ->withQueryString(): see the identical note in
            // UserController::index() — it would silently drop empty-string
            // filters (search=, category=, status=) from every pagination link.
            ->appends([
                'search' => $search,
                'category' => $category,
                'status' => $status,
                'per_page' => $perPage,
            ]);

        return Inertia::render('courses/index', [
            'courses' => $courses,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $search,
                'category' => $category,
                'status' => $status,
                'per_page' => $perPage,
            ],
            'counts' => [
                'total' => Course::count(),
                'draft' => Course::where('status', 'draft')->count(),
                'published' => Course::where('status', 'published')->count(),
            ],
        ]);
    }

    /**
     * Display the read-only, card-based browsing view of published courses.
     */
    public function browse(Request $request): Response
    {
        Gate::authorize('browse', Course::class);

        $search = $request->string('search')->trim()->toString();
        $category = $request->string('category')->trim()->toString();

        $courses = Course::query()
            ->with('category')
            ->where('status', 'published')
            ->when($search !== '', fn ($query) => $query->where('title', 'like', "%{$search}%"))
            ->when($category !== '', fn ($query) => $query->where('category_id', $category))
            ->orderBy('title')
            ->get()
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'title' => $course->title,
                'description' => $course->description,
                'category' => $course->category,
                'due_days' => $course->due_days,
                'resource_type' => $course->resource_type,
                'resource_url' => $course->resource_type === 'link'
                    ? $course->resource_url
                    : Storage::disk('public')->url($course->resource_path),
                'thumbnail_url' => $course->thumbnail_path
                    ? Storage::disk('public')->url($course->thumbnail_path)
                    : null,
            ]);

        return Inertia::render('courses/browse', [
            'courses' => $courses,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $search,
                'category' => $category,
            ],
        ]);
    }

    /**
     * Show the form for creating a new course.
     */
    public function create(Request $request): Response
    {
        Gate::authorize('create', Course::class);

        return Inertia::render('courses/create', [
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'returnTo' => $this->safeReturnTo(),
        ]);
    }

    /**
     * Store a newly created course.
     */
    public function store(StoreCourseRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $validated['slug'] = $this->uniqueSlug($validated['title']);
        $validated['created_by'] = $request->user()->id;

        if ($request->hasFile('thumbnail')) {
            $validated['thumbnail_path'] = $request->file('thumbnail')->store('course-thumbnails', 'public');
        }

        if ($validated['resource_type'] === 'pdf' && $request->hasFile('resource_file')) {
            $validated['resource_path'] = $request->file('resource_file')->store('course-resources', 'public');
        }

        Course::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Resource created.')]);

        return redirect($this->resolveReturnTo($request));
    }

    /**
     * Show the form for editing the given course.
     */
    public function edit(Request $request, Course $course): Response
    {
        Gate::authorize('update', $course);

        return Inertia::render('courses/edit', [
            'course' => $course,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'returnTo' => $this->safeReturnTo(),
        ]);
    }

    /**
     * Update the given course.
     */
    public function update(UpdateCourseRequest $request, Course $course): RedirectResponse
    {
        $validated = $request->validated();

        if ($validated['title'] !== $course->title) {
            $validated['slug'] = $this->uniqueSlug($validated['title'], $course->id);
        }

        if ($request->hasFile('thumbnail')) {
            if ($course->thumbnail_path) {
                Storage::disk('public')->delete($course->thumbnail_path);
            }

            $validated['thumbnail_path'] = $request->file('thumbnail')->store('course-thumbnails', 'public');
        }

        if ($validated['resource_type'] === 'pdf') {
            if ($request->hasFile('resource_file')) {
                if ($course->resource_path) {
                    Storage::disk('public')->delete($course->resource_path);
                }

                $validated['resource_path'] = $request->file('resource_file')->store('course-resources', 'public');
            }

            $validated['resource_url'] = null;
        } else {
            if ($course->resource_path) {
                Storage::disk('public')->delete($course->resource_path);
            }

            $validated['resource_path'] = null;
        }

        $course->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Resource updated.')]);

        return redirect($this->resolveReturnTo($request));
    }

    /**
     * Toggle the given course's draft/published status.
     */
    public function updateStatus(Course $course): RedirectResponse
    {
        Gate::authorize('update', $course);

        $course->update(['status' => $course->status === 'published' ? 'draft' : 'published']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $course->status === 'published'
                ? __(':title has been published.', ['title' => $course->title])
                : __(':title has been unpublished.', ['title' => $course->title]),
        ]);

        return back();
    }

    /**
     * Remove the given course.
     */
    public function destroy(Course $course): RedirectResponse
    {
        Gate::authorize('delete', $course);

        if ($course->thumbnail_path) {
            Storage::disk('public')->delete($course->thumbnail_path);
        }

        if ($course->resource_path) {
            Storage::disk('public')->delete($course->resource_path);
        }

        $course->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Resource deleted.')]);

        return back();
    }

    /**
     * Unpublish a batch of resources at once.
     */
    public function bulkUnpublish(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('courses.update'), 403);

        $validated = $request->validate([
            'course_ids' => ['required', 'array'],
            'course_ids.*' => ['integer'],
        ]);

        $unpublished = Course::whereIn('id', $validated['course_ids'])
            ->where('status', 'published')
            ->update(['status' => 'draft']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => trans_choice(':count resource unpublished.|:count resources unpublished.', $unpublished, ['count' => $unpublished]),
        ]);

        return back();
    }

    /**
     * Delete a batch of resources at once.
     */
    public function bulkDestroy(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('courses.delete'), 403);

        $validated = $request->validate([
            'course_ids' => ['required', 'array'],
            'course_ids.*' => ['integer'],
        ]);

        $deleted = 0;

        foreach (Course::whereIn('id', $validated['course_ids'])->get() as $course) {
            if ($course->thumbnail_path) {
                Storage::disk('public')->delete($course->thumbnail_path);
            }

            if ($course->resource_path) {
                Storage::disk('public')->delete($course->resource_path);
            }

            $course->delete();
            $deleted++;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => trans_choice(':count resource deleted.|:count resources deleted.', $deleted, ['count' => $deleted]),
        ]);

        return back();
    }

    /**
     * Generate a unique slug for the given title.
     */
    private function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title);
        $slug = $base;
        $suffix = 1;

        while (
            Course::where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->whereNot('id', $ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    /**
     * The URL to return to after create/edit — wherever the user came from,
     * as long as it's actually a page on this app (never an open redirect).
     */
    private function safeReturnTo(): string
    {
        return $this->onlyIfLocal(url()->previous());
    }

    /**
     * Resolve the client-supplied `return_to` field submitted with the
     * create/update form back to `courses.index` if it's missing or points
     * off-site — never trust it blindly, it's user-controlled input.
     */
    private function resolveReturnTo(Request $request): string
    {
        return $this->onlyIfLocal($request->input('return_to', ''));
    }

    /**
     * Only accept same-origin URLs; anything else falls back to the index.
     */
    private function onlyIfLocal(string $url): string
    {
        return $url !== '' && str_starts_with($url, url('/')) ? $url : route('courses.index');
    }
}
