<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Whether a given feature (config('features') key) is turned on for a
 * given agent segment (User::AGENT_TYPES key). Missing row = enabled — see
 * App\Support\FeatureAccess, the only thing that should read this table.
 *
 * @property int $id
 * @property string $agent_type
 * @property string $feature
 * @property bool $enabled
 */
#[Fillable(['agent_type', 'feature', 'enabled'])]
class FeatureToggle extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
        ];
    }
}
