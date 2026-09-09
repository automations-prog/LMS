<?php

use App\Http\Controllers\AgentDocumentsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('documents', [AgentDocumentsController::class, 'index'])->name('documents.index');
});
