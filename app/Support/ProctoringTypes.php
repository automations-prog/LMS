<?php

namespace App\Support;

class ProctoringTypes
{
    public const IN_PERSON = 'in_person';

    public const REMOTE = 'remote';

    /**
     * @var list<string>
     */
    public const ALL = [
        self::IN_PERSON,
        self::REMOTE,
    ];
}
