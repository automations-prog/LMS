<?php

namespace App\Support;

use App\Models\FeatureToggle;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Per-agent-segment feature toggles (Sales Roleplay today, more as they
 * come up) — an admin can turn a feature off for, say, pre-licensees
 * without touching fronters or Medicare agents.
 */
class FeatureAccess
{
    /**
     * Whether the given feature is on for this user's segment. A user with
     * no agent_type assigned yet, or a segment/feature pair with no row in
     * `feature_toggles` at all, is unrestricted — toggles are opt-out, not
     * opt-in, so adding a new feature or a new segment never silently
     * locks anyone out.
     */
    public static function enabledFor(User $user, string $feature): bool
    {
        if ($user->agent_type === null) {
            return true;
        }

        $toggle = FeatureToggle::query()
            ->where('agent_type', $user->agent_type)
            ->where('feature', $feature)
            ->first();

        return $toggle === null || $toggle->enabled;
    }

    /**
     * Turn a feature on/off for a whole segment.
     */
    public static function setEnabled(string $agentType, string $feature, bool $enabled): void
    {
        FeatureToggle::query()->updateOrCreate(
            ['agent_type' => $agentType, 'feature' => $feature],
            ['enabled' => $enabled],
        );
    }

    /**
     * Every segment x feature combination and its current state, for the
     * admin Feature Access grid.
     *
     * @return Collection<int, array{agent_type: string, agent_type_label: string, feature: string, feature_label: string, enabled: bool}>
     */
    public static function grid(): Collection
    {
        $toggles = FeatureToggle::all()->keyBy(fn (FeatureToggle $toggle) => "{$toggle->agent_type}:{$toggle->feature}");

        return collect(User::AGENT_TYPES)
            ->flatMap(fn (string $label, string $agentType) => collect(config('features'))
                ->map(fn (string $featureLabel, string $feature) => [
                    'agent_type' => $agentType,
                    'agent_type_label' => $label,
                    'feature' => $feature,
                    'feature_label' => $featureLabel,
                    'enabled' => $toggles->get("{$agentType}:{$feature}")?->enabled ?? true,
                ])
                // flatMap collapses its callback's results with array_merge
                // semantics — without re-indexing here first, every agent
                // type's entry would share the same string keys (the
                // feature names) and overwrite all but the last agent
                // type's row.
                ->values())
            ->values();
    }
}
