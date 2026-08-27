<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A single external training program's synced progress for a user, pulled
 * from the Customer API's per-user trainingprogress endpoint. One row per
 * program per user (an agent can have several, e.g. separate Life/Health
 * pre-licensing enrollments).
 *
 * @property int $id
 * @property int $user_id
 * @property string|null $enrollment_id
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $synced_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['user_id', 'enrollment_id', 'metadata', 'synced_at'])]
class TrainingProgress extends Model
{
    use HasFactory;

    // Laravel's pluralizer treats "progress" as uncountable, so the
    // guessed table name would otherwise be the singular
    // "training_progress" instead of "training_progresses".
    protected $table = 'training_progresses';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'synced_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
