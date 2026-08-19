<?php

use App\Http\Controllers\AhipCertificationController;
use App\Http\Controllers\AhipCertificationReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('onboarding/ahip-certification', [AhipCertificationController::class, 'store'])->name('ahip-certification.store');

    Route::get('admin/ahip-certification/{ahipCertification}/document', [AhipCertificationReviewController::class, 'document'])->name('ahip-certification.document');
    Route::post('admin/ahip-certification/{ahipCertification}/decision', [AhipCertificationReviewController::class, 'decision'])->name('ahip-certification.decision');
});
