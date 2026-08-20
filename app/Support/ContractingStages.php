<?php

namespace App\Support;

class ContractingStages
{
    public const CONFIRMED = 'confirmed';

    public const FORWARDED = 'forwarded';

    public const ISSUED = 'issued';

    public const CARRIER_CERTS = 'carrier_certs';

    public const COMPLETE = 'complete';

    /**
     * @var list<string>
     */
    public const ALL = [
        self::CONFIRMED,
        self::FORWARDED,
        self::ISSUED,
        self::CARRIER_CERTS,
        self::COMPLETE,
    ];

    /**
     * Stage => the other stage that must already be checked before this one
     * can be. `confirmed` has no prerequisite. `carrier_certs` only needs
     * `forwarded` — it's an optional side branch, not required for
     * `complete`.
     *
     * @var array<string, string>
     */
    public const DEPENDENCIES = [
        self::FORWARDED => self::CONFIRMED,
        self::ISSUED => self::FORWARDED,
        self::CARRIER_CERTS => self::FORWARDED,
        self::COMPLETE => self::ISSUED,
    ];

    /**
     * The `eligibility_attestations` column that stores when a given stage
     * was completed.
     */
    public static function column(string $stage): string
    {
        return "contracting_{$stage}_at";
    }
}
