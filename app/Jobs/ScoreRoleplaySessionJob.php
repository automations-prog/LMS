<?php

namespace App\Jobs;

use App\Models\RoleplaySession;
use App\Notifications\RoleplaySessionScoredNotification;
use App\Services\OpenAiClient;
use App\Support\RoleplayVertical;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class ScoreRoleplaySessionJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(
        private readonly RoleplaySession $session,
    ) {}

    public function handle(OpenAiClient $client): void
    {
        // Nothing to grade, or already graded — most likely this job was
        // queued twice for the same session.
        if ($this->session->status !== RoleplaySession::STATUS_COMPLETED || ! $this->session->transcript) {
            return;
        }

        $rubric = RoleplayVertical::config($this->session->vertical)['rubric'];

        $score = $client->scoreTranscript($this->session->transcript, $rubric);

        $this->session->update([
            'status' => RoleplaySession::STATUS_SCORED,
            'score' => $score,
            'overall_score' => $score['overall_score'],
            'scored_at' => now(),
        ]);

        $this->session->user->notify(new RoleplaySessionScoredNotification($this->session));
    }

    /**
     * Both attempts failed — leave the transcript intact but mark the
     * session so the agent isn't left staring at a permanent
     * "scoring in progress" spinner.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('Roleplay session scoring failed.', [
            'roleplay_session_id' => $this->session->id,
            'exception' => $exception->getMessage(),
        ]);

        $this->session->update([
            'status' => RoleplaySession::STATUS_FAILED,
            'failure_reason' => $exception->getMessage(),
        ]);
    }
}
