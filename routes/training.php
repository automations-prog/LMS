<?php

use App\Http\Controllers\TrainingController;
use App\Http\Controllers\TrainingReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('onboarding/training', [TrainingController::class, 'store'])->name('training.store');

    Route::get('admin/training/{trainingCompletion}/document', [TrainingReviewController::class, 'document'])->name('training.document');
    Route::post('admin/training/{trainingCompletion}/decision', [TrainingReviewController::class, 'decision'])->name('training.decision');
});
