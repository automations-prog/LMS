<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $excel_id
 * @property array<string, mixed>|null $metadata
 * @property bool $is_active
 * @property bool $must_change_password
 * @property Carbon|null $last_login_at
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'excel_id', 'metadata', 'is_active', 'must_change_password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'metadata' => 'array',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    /**
     * @return HasOne<EligibilityAttestation, $this>
     */
    public function eligibilityAttestation(): HasOne
    {
        return $this->hasOne(EligibilityAttestation::class);
    }

    /**
     * @return HasOne<TrainingCompletion, $this>
     */
    public function trainingCompletion(): HasOne
    {
        return $this->hasOne(TrainingCompletion::class);
    }

    /**
     * @return HasOne<LicenseSubmission, $this>
     */
    public function licenseSubmission(): HasOne
    {
        return $this->hasOne(LicenseSubmission::class);
    }

    /**
     * @return HasOne<AhipCertification, $this>
     */
    public function ahipCertification(): HasOne
    {
        return $this->hasOne(AhipCertification::class);
    }

    /**
     * @return HasMany<TrainingProgress, $this>
     */
    public function trainingProgresses(): HasMany
    {
        return $this->hasMany(TrainingProgress::class);
    }

    /**
     * Everyone who can review onboarding submissions — the audience for
     * new-submission and roster-sync notifications.
     *
     * @return Collection<int, User>
     */
    public static function onboardingReviewers(): Collection
    {
        return static::permission('onboarding.review')->get();
    }
}
