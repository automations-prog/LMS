<?php

use App\Http\Controllers\EligibilityController;
use App\Http\Controllers\EligibilityReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('onboarding/eligibility', [EligibilityController::class, 'create'])->name('eligibility.create');
    Route::post('onboarding/eligibility', [EligibilityController::class, 'store'])->name('eligibility.store');
    Route::get('onboarding/eligibility/pending', [EligibilityController::class, 'pending'])->name('eligibility.pending');
    Route::post('onboarding/eligibility/complete-enrollment', [EligibilityController::class, 'completeEnrollment'])->name('eligibility.complete-enrollment');
    Route::post('onboarding/eligibility/schedule-exam', [EligibilityController::class, 'scheduleExam'])->name('eligibility.schedule-exam');
    Route::post('onboarding/eligibility/complete-fingerprinting', [EligibilityController::class, 'completeFingerprinting'])->name('eligibility.complete-fingerprinting');
    Route::post('onboarding/eligibility/submit-license-application', [EligibilityController::class, 'submitLicenseApplication'])->name('eligibility.submit-license-application');

    Route::post('admin/eligibility/bulk-decision', [EligibilityReviewController::class, 'bulkDecision'])->name('eligibility.bulk-decision');
    Route::get('admin/eligibility/{eligibilityAttestation}/document', [EligibilityReviewController::class, 'document'])->name('eligibility.document');
    Route::post('admin/eligibility/{eligibilityAttestation}/decision', [EligibilityReviewController::class, 'decision'])->name('eligibility.decision');
    Route::post('admin/eligibility/{eligibilityAttestation}/line-of-authority', [EligibilityReviewController::class, 'updateLineOfAuthority'])->name('eligibility.line-of-authority.update');
    Route::post('admin/eligibility/{eligibilityAttestation}/exam-schedule', [EligibilityReviewController::class, 'updateExamSchedule'])->name('eligibility.exam-schedule.update');
    Route::post('admin/eligibility/{eligibilityAttestation}/contracting-stages', [EligibilityReviewController::class, 'updateContractingStages'])->name('eligibility.contracting-stages.update');
});
