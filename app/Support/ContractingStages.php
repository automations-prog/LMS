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
}
