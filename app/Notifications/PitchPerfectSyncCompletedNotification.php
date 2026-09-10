<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PitchPerfectSyncCompletedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly int $synced,
        private readonly int $created,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(User $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * Get the array representation of the notification, for the in-app
     * notification bell.
     *
     * @return array<string, mixed>
     */
    public function toArray(User $notifiable): array
    {
        return [
            'title' => __('PitchPerfect data synced from Airtable'),
            'body' => $this->summary(),
            'level' => 'info',
            'action_url' => route('users.index'),
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('PitchPerfect data synced'))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line($this->summary())
            ->action(__('View users'), route('users.index'));
    }

    /**
     * The one-line summary shared by both the in-app and mail notification.
     */
    private function summary(): string
    {
        return trans_choice(
            ':count submission was synced.|:count submissions were synced.',
            $this->synced,
            ['count' => $this->synced],
        ).' '.trans_choice(
            ':count new agent was invited.|:count new agents were invited.',
            $this->created,
            ['count' => $this->created],
        );
    }
}
