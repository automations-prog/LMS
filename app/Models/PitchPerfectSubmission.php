<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A single PitchPerfect onboarding submission, pulled verbatim from the
 * Airtable base's PitchPerfect table. Not matched or linked to a User —
 * this is a raw mirror of what Airtable holds, for reviewers to browse.
 *
 * @property int $id
 * @property string $airtable_record_id
 * @property string|null $email
 * @property string|null $full_name
 * @property string|null $status
 * @property Carbon|null $submitted_at
 * @property array<string, mixed>|null $metadata
 * @property Carbon|null $synced_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['airtable_record_id', 'email', 'full_name', 'status', 'submitted_at', 'metadata', 'synced_at'])]
class PitchPerfectSubmission extends Model
{
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'metadata' => 'array',
            'synced_at' => 'datetime',
        ];
    }
}
