<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CourseController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('courses', [CourseController::class, 'index'])->name('courses.index');
    Route::get('my-courses', [CourseController::class, 'browse'])->name('courses.browse');
    Route::get('courses/create', [CourseController::class, 'create'])->name('courses.create');
    Route::post('courses', [CourseController::class, 'store'])->name('courses.store');
    Route::get('courses/{course}/edit', [CourseController::class, 'edit'])->name('courses.edit');
    Route::put('courses/{course}', [CourseController::class, 'update'])->name('courses.update');
    Route::patch('courses/{course}/status', [CourseController::class, 'updateStatus'])->name('courses.update-status');
    Route::delete('courses/{course}', [CourseController::class, 'destroy'])->name('courses.destroy');

    Route::post('categories', [CategoryController::class, 'store'])->name('categories.store');
    Route::put('categories/{category}', [CategoryController::class, 'update'])->name('categories.update');
    Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->name('categories.destroy');
});
