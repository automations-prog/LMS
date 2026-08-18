<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Display the category management page.
     */
    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('courses.view'), 403);

        $perPage = $this->perPage($request);

        $search = $request->string('search')->trim()->toString();

        $categories = Category::withCount('courses')
            ->when($search !== '', fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('name')
            ->paginate($perPage, ['id', 'name'])
            // Not ->withQueryString(): see the identical note in
            // UserController::index() — it would silently drop the
            // empty-string `search` filter from every pagination link.
            ->appends([
                'search' => $search,
                'per_page' => $perPage,
            ]);

        return Inertia::render('courses/categories', [
            'categories' => $categories,
            'filters' => [
                'search' => $search,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Store a newly created category.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('courses.create'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
        ]);

        Category::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category created.')]);

        return back();
    }

    /**
     * Update the given category.
     */
    public function update(Request $request, Category $category): RedirectResponse
    {
        abort_unless($request->user()->can('courses.update'), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('categories', 'name')->ignore($category->id)],
        ]);

        $category->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category updated.')]);

        return back();
    }

    /**
     * Remove the given category.
     */
    public function destroy(Request $request, Category $category): RedirectResponse
    {
        abort_unless($request->user()->can('courses.delete'), 403);

        if ($category->courses()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Cannot delete a category that still has resources.')]);

            return back();
        }

        $category->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category deleted.')]);

        return back();
    }
}
