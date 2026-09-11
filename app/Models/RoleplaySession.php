<?php

namespace App\Models;

use Database\Factories\RoleplaySessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One live AI voice roleplay call — the WebRTC audio itself never touches
 * our server (the browser talks to OpenAI's Realtime API directly with a
 * short-lived token, see OpenAiClient::mintRealtimeClientSecret); this
 * table only stores what the browser reports back: the captured transcript
 * and, once ScoreRoleplaySessionJob runs, the rubric score.
 *
 * @property int $id
 * @property int $user_id
 * @property string $scenario_key
 * @property string $vertical
 * @property string $status
 * @property array<int, array{role: string, text: string, at: string}>|null $transcript
 * @property array{criteria: array<int, array{key: string, label: string, score: int, feedback: string}>, overall_score: int, summary: string}|null $score
 * @property int|null $overall_score
 * @property string|null $failure_reason
 * @property Carbon|null $started_at
 * @property Carbon|null $ended_at
 * @property Carbon|null $scored_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'user_id',
    'scenario_key',
    'vertical',
    'status',
    'transcript',
    'score',
    'overall_score',
    'failure_reason',
    'started_at',
    'ended_at',
    'scored_at',
])]
class RoleplaySession extends Model
{
    /** @use HasFactory<RoleplaySessionFactory> */
    use HasFactory;

    /** The live call is in progress; the browser is connected to OpenAI. */
    public const STATUS_IN_PROGRESS = 'in_progress';

    /** The call ended and the transcript was captured; scoring is queued. */
    public const STATUS_COMPLETED = 'completed';

    /** The transcript has been graded against the rubric. */
    public const STATUS_SCORED = 'scored';

    /** The call or the scoring pass failed — see `failure_reason`. */
    public const STATUS_FAILED = 'failed';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'transcript' => 'array',
            'score' => 'array',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'scored_at' => 'datetime',
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
