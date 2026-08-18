<?php

use App\Http\Controllers\ImpersonateController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('users', [UserController::class, 'index'])->name('users.index');
    Route::post('users', [UserController::class, 'store'])->name('users.store');
    Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
    Route::patch('users/{user}/status', [UserController::class, 'updateStatus'])->name('users.update-status');
    Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

    Route::post('users/bulk-suspend', [UserController::class, 'bulkSuspend'])->name('users.bulk-suspend');
    Route::post('users/bulk-destroy', [UserController::class, 'bulkDestroy'])->name('users.bulk-destroy');

    Route::post('users/{user}/impersonate', [ImpersonateController::class, 'store'])->name('users.impersonate');
});

// No `verified` requirement — an impersonated account may itself be unverified,
// and they must still be able to return to the account that started it.
Route::delete('impersonate', [ImpersonateController::class, 'destroy'])
    ->middleware('auth')
    ->name('impersonate.stop');
