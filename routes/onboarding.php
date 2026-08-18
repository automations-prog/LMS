<?php

use App\Http\Controllers\OnboardingReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('admin/onboarding', [OnboardingReviewController::class, 'index'])->name('onboarding.index');
    Route::get('admin/onboarding/{user}', [OnboardingReviewController::class, 'show'])->name('onboarding.show');
});
