<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * An append-only compliance record of who changed what status on which
 * onboarding artifact, and what it changed from/to. Written alongside the
 * decision itself — never updated afterward — so it stays a trustworthy
 * trail even once the artifact's own `status` column has moved on again.
 *
 * @property int $id
 * @property int|null $actor_id
 * @property string $auditable_type
 * @property int $auditable_id
 * @property string $action
 * @property string|null $from_status
 * @property string|null $to_status
 * @property string|null $note
 * @property Carbon|null $created_at
 */
#[Fillable([
    'actor_id',
    'auditable_type',
    'auditable_id',
    'action',
    'from_status',
    'to_status',
    'note',
])]
class AuditLog extends Model
{
    public const UPDATED_AT = null;

    /**
     * Write one audit record for a status change on an onboarding artifact.
     * The actor is nullable — a system-driven change (e.g. a future
     * automated process) has no reviewing admin to attribute it to.
     */
    public static function record(
        Model $auditable,
        ?User $actor,
        string $action,
        ?string $fromStatus,
        ?string $toStatus,
        ?string $note = null,
    ): self {
        return static::create([
            'actor_id' => $actor?->id,
            'auditable_type' => $auditable->getMorphClass(),
            'auditable_id' => $auditable->getKey(),
            'action' => $action,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'note' => $note,
        ]);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }
}
