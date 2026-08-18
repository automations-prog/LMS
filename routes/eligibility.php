<?php

use App\Http\Controllers\EligibilityController;
use App\Http\Controllers\EligibilityReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('onboarding/eligibility', [EligibilityController::class, 'create'])->name('eligibility.create');
    Route::post('onboarding/eligibility', [EligibilityController::class, 'store'])->name('eligibility.store');
    Route::get('onboarding/eligibility/pending', [EligibilityController::class, 'pending'])->name('eligibility.pending');
    Route::post('onboarding/eligibility/complete-enrollment', [EligibilityController::class, 'completeEnrollment'])->name('eligibility.complete-enrollment');

    Route::get('admin/eligibility/{eligibilityAttestation}/document', [EligibilityReviewController::class, 'document'])->name('eligibility.document');
    Route::post('admin/eligibility/{eligibilityAttestation}/decision', [EligibilityReviewController::class, 'decision'])->name('eligibility.decision');
});
