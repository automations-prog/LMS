<?php

use App\Http\Controllers\InviteController;
use Illuminate\Support\Facades\Route;

// Guest-only, signed-URL protected: the invitee isn't authenticated yet, and
// both the GET and POST must carry a valid, unexpired invite signature.
Route::middleware(['guest', 'signed'])->group(function () {
    Route::get('invite/{user}/accept', [InviteController::class, 'show'])->name('invite.accept');
    Route::post('invite/{user}/accept', [InviteController::class, 'store'])->name('invite.store');
});
