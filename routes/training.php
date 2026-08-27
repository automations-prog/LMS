<?php

use App\Http\Controllers\TrainingController;
use App\Http\Controllers\TrainingProgressController;
use App\Http\Controllers\TrainingReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('onboarding/training', [TrainingController::class, 'store'])->name('training.store');

    Route::post('admin/training/bulk-decision', [TrainingReviewController::class, 'bulkDecision'])->name('training.bulk-decision');
    Route::get('admin/training/{trainingCompletion}/document', [TrainingReviewController::class, 'document'])->name('training.document');
    Route::post('admin/training/{trainingCompletion}/decision', [TrainingReviewController::class, 'decision'])->name('training.decision');

    Route::get('onboarding/training-progress', [TrainingProgressController::class, 'show'])->name('training-progress.show');
    Route::get('admin/onboarding/{user}/training-progress', [TrainingProgressController::class, 'showForUser'])->name('training-progress.show-for-user');
});
