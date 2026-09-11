<?php

use App\Http\Controllers\FeatureAccessController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('admin/features', [FeatureAccessController::class, 'index'])->name('features.index');
    Route::put('admin/features', [FeatureAccessController::class, 'update'])->name('features.update');
});
