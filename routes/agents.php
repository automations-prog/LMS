<?php

use App\Http\Controllers\VerifiedAgentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('admin/agents', [VerifiedAgentController::class, 'index'])->name('agents.index');
});
