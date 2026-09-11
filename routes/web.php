<?php

use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('welcome'))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('onboarding-journey', [DashboardController::class, 'onboardingJourney'])->name('onboarding.journey');
});

require __DIR__.'/settings.php';
require __DIR__.'/notifications.php';
require __DIR__.'/documents.php';
require __DIR__.'/users.php';
require __DIR__.'/invite.php';
require __DIR__.'/eligibility.php';
require __DIR__.'/training.php';
require __DIR__.'/license.php';
require __DIR__.'/ahip-certification.php';
require __DIR__.'/onboarding.php';
require __DIR__.'/agents.php';
require __DIR__.'/roles.php';
require __DIR__.'/roleplay.php';
require __DIR__.'/features.php';
