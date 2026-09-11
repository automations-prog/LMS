<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\FeatureAccess;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
 * @property string|null $source
 * @property string|null $agent_type
 * @property string|null $company_name
 * @property Carbon|null $roleplay_enabled_at
 * @property int|null $roleplay_enabled_by
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
#[Fillable(['name', 'email', 'password', 'excel_id', 'metadata', 'source', 'agent_type', 'company_name', 'is_active', 'must_change_password', 'roleplay_enabled_at', 'roleplay_enabled_by'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Where an account was created from — recorded in `source` so admins
     * can tell an agent invited by hand from one pulled in automatically.
     */
    public const SOURCE_MANUAL = 'manual';

    public const SOURCE_CUSTOMER_API = 'customer_api';

    public const SOURCE_PITCH_HEALTH = 'pitch_health';

    public const SOURCE_PITCH_PERFECT = 'pitch_perfect';

    /** Signed up themselves via the public registration form. */
    public const SOURCE_SELF_REGISTERED = 'self_registered';

    /**
     * Agent segments — separate from the agent/admin/super-admin auth
     * role. Drives per-segment feature toggles (App\Support\FeatureAccess)
     * and which roleplay vertical/script an agent practices against (see
     * App\Support\RoleplayVertical). Keyed by the value stored in
     * `agent_type`, valued by the admin-facing label.
     *
     * @var array<string, string>
     */
    public const AGENT_TYPES = [
        'pre_licensee' => 'Pre-licensee',
        'fronter' => 'Fronter',
        'medicare_agent' => 'Medicare agent',
        'aca_agent' => 'ACA agent',
    ];

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
            'roleplay_enabled_at' => 'datetime',
        ];
    }

    /**
     * Whether an admin has granted this user access to the sales roleplay
     * feature — both individually (roleplay_enabled_at) and at the
     * segment level (FeatureAccess, e.g. an admin turning roleplay off for
     * every pre-licensee at once).
     */
    public function hasRoleplayAccess(): bool
    {
        return $this->roleplay_enabled_at !== null
            && FeatureAccess::enabledFor($this, 'roleplay');
    }

    /**
     * @return HasOne<EligibilityAttestation, $this>
     */
    public function eligibilityAttestation(): HasOne
    {
        return $this->hasOne(EligibilityAttestation::class);
    }

    /**
     * The agent-facing eligibility status — collapses the two "not yet
     * decided" statuses (pending, flagged for waiver) into one
     * 'under_review' the frontend doesn't need to distinguish between, and
     * is null before an attestation exists at all. Shared by the dashboard
     * (DashboardController), the onboarding journey page, and the sidebar
     * (HandleInertiaRequests, to hide nav items until this is decided).
     */
    public function eligibilityDisplayStatus(): ?string
    {
        $status = $this->eligibilityAttestation?->status;

        return in_array($status, EligibilityAttestation::UNDER_REVIEW_STATUSES, true)
            ? 'under_review'
            : $status;
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
     * @return HasMany<RoleplaySession, $this>
     */
    public function roleplaySessions(): HasMany
    {
        return $this->hasMany(RoleplaySession::class);
    }

    /**
     * The admin/super-admin who granted this user roleplay access.
     *
     * @return BelongsTo<User, $this>
     */
    public function roleplayEnabledBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'roleplay_enabled_by');
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

    /**
     * Everyone who can approve a pending self-registration — the audience
     * for NewAgentRegistrationNotification.
     *
     * @return Collection<int, User>
     */
    public static function accountApprovers(): Collection
    {
        return static::permission('users.update')->get();
    }
}
