<?php

use App\Http\Controllers\RoleplayAccessController;
use App\Http\Controllers\RoleplayController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('roleplay', [RoleplayController::class, 'index'])->name('roleplay.index');
    Route::post('roleplay/sessions', [RoleplayController::class, 'store'])->name('roleplay.sessions.store');
    Route::get('roleplay/sessions/{roleplaySession}', [RoleplayController::class, 'show'])->name('roleplay.sessions.show');
    Route::post('roleplay/sessions/{roleplaySession}/token', [RoleplayController::class, 'token'])->name('roleplay.sessions.token');
    Route::post('roleplay/sessions/{roleplaySession}/complete', [RoleplayController::class, 'complete'])->name('roleplay.sessions.complete');

    Route::get('admin/roleplay', [RoleplayAccessController::class, 'index'])->name('roleplay.access.index');
    Route::post('admin/roleplay/{user}/grant', [RoleplayAccessController::class, 'grant'])->name('roleplay.access.grant');
    Route::post('admin/roleplay/{user}/revoke', [RoleplayAccessController::class, 'revoke'])->name('roleplay.access.revoke');
});
