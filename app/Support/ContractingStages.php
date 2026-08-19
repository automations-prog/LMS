<?php

namespace App\Support;

class ContractingStages
{
    public const CONFIRMED = 'confirmed';

    public const FORWARDED = 'forwarded';

    public const ISSUED = 'issued';

    public const CARRIER_CERTS = 'carrier_certs';

    /**
     * @var list<string>
     */
    public const ALL = [
        self::CONFIRMED,
        self::FORWARDED,
        self::ISSUED,
        self::CARRIER_CERTS,
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
