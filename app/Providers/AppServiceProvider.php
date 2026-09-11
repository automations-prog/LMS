<?php

namespace App\Providers;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {

        // URL::forceScheme('https');
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureAuthorization();
        $this->configureLoginTracking();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(
            fn (): ?Password => app()->isProduction()
                ? Password::min(12)
                    ->mixedCase()
                    ->letters()
                    ->numbers()
                    ->symbols()
                    ->uncompromised()
                : null,
        );
    }

    /**
     * Configure application-wide authorization rules.
     */
    protected function configureAuthorization(): void
    {
        Gate::before(fn ($user, string $ability) => $user->hasRole('super-admin') ? true : null);
    }

    /**
     * Record `last_login_at` on every genuine login (password or passkey).
     * Excludes impersonation: ImpersonateController binds 'impersonating'
     * into the container around its Auth::login()/loginUsingId() calls,
     * since those also fire this same event but aren't a real login.
     *
     * Also excludes inactive accounts — Fortify's registration flow logs a
     * brand-new (pending-approval, inactive) user in for an instant before
     * our custom RegisterResponse logs them straight back out, and that
     * shouldn't read as a real login either.
     */
    protected function configureLoginTracking(): void
    {
        Event::listen(Login::class, function (Login $event): void {
            if (
                app()->bound('impersonating')
                || ! $event->user instanceof User
                || ! $event->user->is_active
            ) {
                return;
            }

            $event->user->forceFill(['last_login_at' => now()])->saveQuietly();
        });
    }
}
