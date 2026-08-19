<?php

namespace App\Support;

class LinesOfAuthority
{
    public const LIFE = 'life';

    public const HEALTH = 'health';

    public const LIFE_AND_HEALTH = 'life_and_health';

    /**
     * @var list<string>
     */
    public const ALL = [
        self::LIFE,
        self::HEALTH,
        self::LIFE_AND_HEALTH,
    ];
}
