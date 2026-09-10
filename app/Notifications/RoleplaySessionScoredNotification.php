<?php

namespace App\Notifications;

use App\Models\RoleplaySession;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class RoleplaySessionScoredNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly RoleplaySession $session,
    ) {}

    /**
     * In-app only — this isn't worth an email, the agent is (or was just)
     * in the app to run the call in the first place.
     *
     * @return array<int, string>
     */
    public function via(User $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(User $notifiable): array
    {
        return [
            'title' => __('Your roleplay call was scored'),
            'body' => __('You scored :score/100 on your sales roleplay call.', [
                'score' => $this->session->overall_score,
            ]),
            'level' => 'info',
            'action_url' => route('roleplay.sessions.show', $this->session),
        ];
    }
}
