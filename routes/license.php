<?php

use App\Http\Controllers\LicenseController;
use App\Http\Controllers\LicenseReviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('onboarding/license', [LicenseController::class, 'store'])->name('license.store');

    Route::get('admin/license/{licenseSubmission}/document', [LicenseReviewController::class, 'document'])->name('license.document');
    Route::post('admin/license/{licenseSubmission}/decision', [LicenseReviewController::class, 'decision'])->name('license.decision');
});
