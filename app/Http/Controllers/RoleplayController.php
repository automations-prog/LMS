<?php

namespace App\Http\Controllers;

use App\Jobs\ScoreRoleplaySessionJob;
use App\Models\RoleplaySession;
use App\Services\OpenAiClient;
use App\Support\RoleplayVertical;
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
        // Front door is closed until launch — everyone sees the same
        // "Coming Soon" page here regardless of their own roleplay access,
        // so switching that on ahead of launch doesn't jump the gun.
        if (! config('roleplay.launched')) {
            return Inertia::render('roleplay/coming-soon');
        }

        $user = $request->user();

        $sessions = $user->roleplaySessions()
            ->latest()
            ->paginate(10);

        $vertical = RoleplayVertical::forUser($user);
        $verticalAvailable = RoleplayVertical::isAvailable($vertical);
        $verticalConfig = $verticalAvailable ? RoleplayVertical::config($vertical) : null;

        return Inertia::render('roleplay/index', [
            // Access requires both: the vertical they'd practice actually
            // has a script ready, and an admin has granted them access
            // (individually and at the segment level — see
            // User::hasRoleplayAccess).
            'enabled' => $verticalAvailable && $user->hasRoleplayAccess(),
            'verticalAvailable' => $verticalAvailable,
            'scenario' => $verticalConfig ? [
                'title' => $verticalConfig['scenario']['title'],
                'summary' => $verticalConfig['scenario']['summary'],
            ] : null,
            'sessions' => $sessions,
        ]);
    }

    /**
     * Start a new live roleplay call.
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless(config('roleplay.launched'), 404);

        $user = $request->user();
        $vertical = RoleplayVertical::forUser($user);
        $verticalConfig = RoleplayVertical::config($vertical);

        // The vertical is re-derived from the agent's current agent_type
        // here, server-side — never trust a vertical the client might
        // send — and re-checked for availability rather than relying on
        // whatever the index page last rendered.
        abort_unless($verticalConfig !== null && RoleplayVertical::isAvailable($vertical), 404);

        Gate::authorize('create', RoleplaySession::class);

        $session = RoleplaySession::create([
            'user_id' => $user->id,
            'scenario_key' => $verticalConfig['scenario']['key'],
            'vertical' => $vertical,
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

        // The session's own vertical, not whatever the agent's agent_type
        // maps to today — see the migration note on roleplay_sessions.vertical.
        $verticalConfig = RoleplayVertical::config($roleplaySession->vertical);

        return Inertia::render('roleplay/show', [
            'session' => $roleplaySession,
            'scenario' => [
                'title' => $verticalConfig['scenario']['title'] ?? null,
                'rubric' => $verticalConfig['rubric'] ?? [],
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

        $scenario = RoleplayVertical::config($roleplaySession->vertical)['scenario'];

        $secret = $client->mintRealtimeClientSecret(
            $scenario['persona_instructions'],
            $scenario['greeting'],
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
