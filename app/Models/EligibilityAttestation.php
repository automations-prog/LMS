<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property Carbon $date_of_birth
 * @property string $home_state
 * @property bool $has_felony_conviction
 * @property string|null $felony_details
 * @property bool $is_us_citizen
 * @property string|null $work_authorization_path
 * @property string $status
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $enrollment_completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'user_id',
    'date_of_birth',
    'home_state',
    'has_felony_conviction',
    'felony_details',
    'is_us_citizen',
    'work_authorization_path',
    'status',
    'reviewed_by',
    'reviewed_at',
    'enrollment_completed_at',
])]
class EligibilityAttestation extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_CLEARED = 'cleared';

    public const STATUS_FLAGGED_FOR_WAIVER = 'flagged_for_waiver';

    public const STATUS_NOT_ELIGIBLE = 'not_eligible';

    /**
     * Statuses that mean "not yet decided" — the agent still just sees the
     * pending-review page for either of these.
     *
     * @var list<string>
     */
    public const UNDER_REVIEW_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_FLAGGED_FOR_WAIVER,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'has_felony_conviction' => 'boolean',
            'is_us_citizen' => 'boolean',
            'reviewed_at' => 'datetime',
            'enrollment_completed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
