<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'customer_api' => [
        'domain' => env('CUSTOMER_API_DOMAIN'),
        'key' => env('CUSTOMER_API_KEY'),
        'location_id' => env('CUSTOMER_API_LOCATION_ID'),
    ],

    'airtable' => [
        'token' => env('AIRTABLE_API_TOKEN'),
        'pitch_health_base_id' => env('AIRTABLE_PITCH_HEALTH_BASE_ID'),
        'pitch_health_table_id' => env('AIRTABLE_PITCH_HEALTH_TABLE_ID'),
        'pitchperfect_token' => env('AIRTABLE_PITCHPERFECT_TOKEN'),
        'pitchperfect_base_id' => env('AIRTABLE_PITCHPERFECT_BASE_ID'),
        'pitchperfect_table_id' => env('AIRTABLE_PITCHPERFECT_TABLE_ID'),
    ],

];
