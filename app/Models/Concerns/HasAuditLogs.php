<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Shared by every onboarding artifact that gets a reviewer decision
 * (eligibility, training, license, AHIP) so each can list its own audit
 * trail without repeating the relation four times.
 */
trait HasAuditLogs
{
    /**
     * @return MorphMany<AuditLog, $this>
     */
    public function auditLogs(): MorphMany
    {
        // Ordered by id, not created_at — this table is append-only and
        // insert order is chronological order, so id sorts correctly even
        // when two entries land in the same second.
        return $this->morphMany(AuditLog::class, 'auditable')->latest('id');
    }
}
