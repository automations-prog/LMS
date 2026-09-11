<?php

namespace App\Support;

use App\Models\User;

/**
 * Maps an agent to the roleplay vertical (script + rubric) they should
 * practice against — starting with Medicare, then ACA, then others as
 * they're built (see config/roleplay.php).
 */
class RoleplayVertical
{
    /** Everyone without a vertical-specific agent_type defaults here — the
     * business is Medicare-focused today, so that's the sensible default
     * for an agent nobody has segmented yet. */
    private const DEFAULT = 'medicare';

    /**
     * Which vertical key the given agent should practice against.
     */
    public static function forUser(User $user): string
    {
        return match ($user->agent_type) {
            'aca_agent' => 'aca',
            'medicare_agent' => 'medicare',
            default => self::DEFAULT,
        };
    }

    /**
     * Whether the given vertical has a real scenario/rubric to serve.
     */
    public static function isAvailable(string $vertical): bool
    {
        return in_array($vertical, config('roleplay.enabled_verticals'), true)
            && config("roleplay.verticals.{$vertical}") !== null;
    }

    /**
     * @return array{scenario: array<string, mixed>, rubric: array<int, array<string, mixed>>}|null
     */
    public static function config(string $vertical): ?array
    {
        return config("roleplay.verticals.{$vertical}");
    }
}
