<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Launched
    |--------------------------------------------------------------------------
    |
    | The agent-facing "Sales Roleplay" entry point (RoleplayController)
    | shows a "Coming Soon" landing page instead of the real call/scenario
    | UI while this is false — the feature, its per-agent access toggle,
    | and the admin Roleplay Coaching page all still work underneath, this
    | just hides the front door until it's ready to launch.
    */
    'launched' => env('ROLEPLAY_LAUNCHED', false),

    /*
    |--------------------------------------------------------------------------
    | Enabled verticals
    |--------------------------------------------------------------------------
    |
    | Which of the keys under `verticals` below actually have a scenario
    | ready to practice against — starting with Medicare, then ACA, then
    | others as their scripts get built (see App\Support\RoleplayVertical).
    | A vertical present in `verticals` but missing here is scaffolding for
    | a script that hasn't been written yet, not something to serve.
    */
    'enabled_verticals' => ['medicare'],

    /*
    |--------------------------------------------------------------------------
    | Verticals
    |--------------------------------------------------------------------------
    |
    | Each vertical is its own fixed, generic sales-rebuttal scenario/rubric
    | rather than an admin-authored one — see App\Services\RoleplayRubric.
    | Keeping it here (rather than the database) makes it trivial to tune
    | the wording without a migration; promote it to an admin-editable
    | model later if scenarios need to vary further within a vertical.
    |
    | App\Support\RoleplayVertical maps an agent's `agent_type` to one of
    | these keys.
    */
    'verticals' => [

        'medicare' => [
            'scenario' => [
                'key' => 'generic-cold-call-v1',
                'title' => 'Cold Call: Price-Sensitive Prospect',
                'summary' => 'Practice a cold sales call against a realistic, mildly skeptical prospect who raises common objections — price, timing, and "I already have someone".',

                // The system prompt for the realtime model, which plays
                // the *prospect*, not the agent. The agent is the human on
                // the call.
                'persona_instructions' => <<<'PROMPT'
                    You are roleplaying as a prospective customer receiving a cold sales call. Stay in character for the entire call — never break character, never offer coaching or meta-commentary, and never reveal that you are an AI unless directly and explicitly asked.

                    Your character:
                    - Busy, mildly skeptical, but not hostile — a real person who might plausibly buy if the agent earns it.
                    - You have a reasonable need the agent's product/service could plausibly solve, but you did not ask for this call.
                    - You raise realistic objections over the course of the conversation, roughly one at a time, such as: price/cost concerns, "I need to think about it", "I already work with someone else", timing ("this isn't a good time"), or skepticism about whether it actually works.
                    - You respond to how well the agent handles each objection: if they address it with genuine empathy, a clear answer, and a concrete next step, soften and move the conversation forward; if they're pushy, generic, or ignore what you said, stay guarded or push back harder.
                    - Keep your turns conversational and brief (1-3 sentences), like a real phone call — not a monologue.
                    - After a few exchanges (roughly 5-10 turns), naturally head toward a resolution: either a tentative yes/next step, a polite no, or a request to follow up later, depending on how the call went.

                    Speak naturally, with realistic pauses in phrasing. Begin the call once the agent greets you.
                    PROMPT,

                'greeting' => 'Hello?',
            ],

            // The rubric an LLM judge scores the finished transcript
            // against. Each criterion is scored 0-5; `overall_score` in
            // the stored result is the average scaled to 0-100. Keep keys
            // stable — they're referenced by the scoring job's JSON schema
            // and by the frontend score breakdown.
            'rubric' => [
                [
                    'key' => 'rapport',
                    'label' => 'Rapport & tone',
                    'description' => 'Opens warmly, sounds natural and confident rather than reading a script, and builds genuine rapport before pitching.',
                ],
                [
                    'key' => 'discovery',
                    'label' => 'Needs discovery',
                    'description' => 'Asks open questions to understand the prospect\'s situation before jumping to a pitch, and listens to (references) what the prospect actually said.',
                ],
                [
                    'key' => 'price_objection',
                    'label' => 'Price objection handling',
                    'description' => 'When cost comes up, reframes around value rather than just discounting or getting defensive, and keeps the conversation moving.',
                ],
                [
                    'key' => 'stall_objection',
                    'label' => '"Need to think about it" / timing objection handling',
                    'description' => 'Uncovers the real hesitation behind a stall instead of accepting it at face value, without being pushy.',
                ],
                [
                    'key' => 'competitor_objection',
                    'label' => '"Already have someone" objection handling',
                    'description' => 'Handles being told the prospect already has a provider with curiosity and differentiation rather than trash-talking the competitor or giving up.',
                ],
                [
                    'key' => 'closing',
                    'label' => 'Closing & next steps',
                    'description' => 'Ends the call with a clear, specific next step (not a vague "I\'ll follow up") appropriate to how the conversation went.',
                ],
            ],
        ],

        // 'aca' => [...] — next vertical up, not written yet. Left out of
        // `verticals` entirely (rather than a placeholder with invented
        // content) until its script and rubric exist; RoleplayVertical
        // treats a missing key the same as a disabled one.

    ],

];
