<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Togglable features
    |--------------------------------------------------------------------------
    |
    | Features an admin can turn on/off per agent segment (User::AGENT_TYPES)
    | from the Feature Access admin page — see App\Support\FeatureAccess.
    | Add a key here whenever a new feature needs to vary by segment; a
    | feature with no row in `feature_toggles` for a given segment defaults
    | to enabled.
    */

    'roleplay' => 'Sales Roleplay Call',

];
