// Shared shapes for the sales roleplay feature — the agent-facing pages
// (pages/roleplay/index.tsx, pages/roleplay/show.tsx), the live-call
// WebRTC hook (hooks/use-roleplay-call.ts), and the admin access page
// (pages/admin/roleplay/index.tsx).

export type RoleplaySessionStatus =
    | 'in_progress'
    | 'completed'
    | 'scored'
    | 'failed';

export type RoleplayTranscriptEntry = {
    role: 'agent' | 'assistant';
    text: string;
    at: string | null;
};

export type RoleplayRubricCriterion = {
    key: string;
    label: string;
    description: string;
};

export type RoleplayScoreCriterion = {
    key: string;
    score: number;
    feedback: string;
};

export type RoleplayScore = {
    criteria: RoleplayScoreCriterion[];
    overall_score: number;
    summary: string;
};

export type RoleplaySession = {
    id: number;
    user_id: number;
    scenario_key: string;
    status: RoleplaySessionStatus;
    transcript: RoleplayTranscriptEntry[] | null;
    score: RoleplayScore | null;
    overall_score: number | null;
    failure_reason: string | null;
    started_at: string | null;
    ended_at: string | null;
    scored_at: string | null;
    created_at: string;
};
