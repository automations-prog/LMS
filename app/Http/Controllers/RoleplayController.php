<?php

namespace App\Http\Controllers;

use App\Jobs\ScoreRoleplaySessionJob;
use App\Models\RoleplaySession;
use App\Services\OpenAiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class RoleplayController extends Controller
{
    /**
     * The agent's roleplay landing page — access state plus their past
     * sessions.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $sessions = $user->roleplaySessions()
            ->latest()
            ->paginate(10);

        return Inertia::render('roleplay/index', [
            'enabled' => $user->hasRoleplayAccess(),
            'scenario' => [
                'title' => config('roleplay.scenario.title'),
                'summary' => config('roleplay.scenario.summary'),
            ],
            'sessions' => $sessions,
        ]);
    }

    /**
     * Start a new live roleplay call.
     */
    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('create', RoleplaySession::class);

        $session = RoleplaySession::create([
            'user_id' => $request->user()->id,
            'scenario_key' => config('roleplay.scenario.key'),
            'status' => RoleplaySession::STATUS_IN_PROGRESS,
            'started_at' => now(),
        ]);

        return redirect()->route('roleplay.sessions.show', $session);
    }

    /**
     * Show a session — the live call UI while in progress, otherwise the
     * transcript and (once ready) its score.
     */
    public function show(Request $request, RoleplaySession $roleplaySession): Response
    {
        Gate::authorize('view', $roleplaySession);

        return Inertia::render('roleplay/show', [
            'session' => $roleplaySession,
            'scenario' => [
                'title' => config('roleplay.scenario.title'),
                'rubric' => config('roleplay.rubric'),
            ],
            'isOwner' => $request->user()->id === $roleplaySession->user_id,
        ]);
    }

    /**
     * Mint a fresh short-lived OpenAI Realtime client secret for the
     * browser to open its WebRTC connection with. Minted on demand right
     * before connecting, rather than embedded in the page, so a session
     * left open in a tab doesn't hand out a stale/expired secret.
     */
    public function token(Request $request, RoleplaySession $roleplaySession, OpenAiClient $client): JsonResponse
    {
        Gate::authorize('update', $roleplaySession);

        $secret = $client->mintRealtimeClientSecret(
            config('roleplay.scenario.persona_instructions'),
            config('roleplay.scenario.greeting'),
        );

        return response()->json([
            'client_secret' => $secret['value'],
            'model' => config('services.openai.realtime_model'),
        ]);
    }

    /**
     * Called once the browser has hung up the call — stores the transcript
     * it captured client-side and queues scoring.
     */
    public function complete(Request $request, RoleplaySession $roleplaySession): RedirectResponse
    {
        Gate::authorize('update', $roleplaySession);

        $validated = $request->validate([
            'transcript' => ['required', 'array', 'min:1'],
            'transcript.*.role' => ['required', 'in:agent,assistant'],
            'transcript.*.text' => ['required', 'string'],
            'transcript.*.at' => ['nullable', 'string'],
        ]);

        $roleplaySession->update([
            'status' => RoleplaySession::STATUS_COMPLETED,
            'transcript' => $validated['transcript'],
            'ended_at' => now(),
        ]);

        ScoreRoleplaySessionJob::dispatch($roleplaySession);

        return redirect()->route('roleplay.sessions.show', $roleplaySession);
    }
}
