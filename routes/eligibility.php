<?php

use App\Http\Controllers\EligibilityController;
use App\Http\Controllers\EligibilityReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('onboarding/eligibility', [EligibilityController::class, 'create'])->name('eligibility.create');
    Route::post('onboarding/eligibility', [EligibilityController::class, 'store'])->name('eligibility.store');
    Route::get('onboarding/eligibility/pending', [EligibilityController::class, 'pending'])->name('eligibility.pending');

    Route::get('admin/eligibility', [EligibilityReviewController::class, 'index'])->name('eligibility.index');
    Route::get('admin/eligibility/{eligibilityAttestation}', [EligibilityReviewController::class, 'show'])->name('eligibility.show');
    Route::get('admin/eligibility/{eligibilityAttestation}/document', [EligibilityReviewController::class, 'document'])->name('eligibility.document');
    Route::post('admin/eligibility/{eligibilityAttestation}/decision', [EligibilityReviewController::class, 'decision'])->name('eligibility.decision');
});
