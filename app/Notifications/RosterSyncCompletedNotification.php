<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RosterSyncCompletedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
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
            'title' => __('Agent roster synced from the Customer API'),
            'body' => trans_choice(
                ':count new agent was invited.|:count new agents were invited.',
                $this->created,
                ['count' => $this->created],
            ),
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
            ->subject(__('Agent roster synced'))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line(trans_choice(
                'The scheduled Customer API roster pull just ran and invited :count new agent.|The scheduled Customer API roster pull just ran and invited :count new agents.',
                $this->created,
                ['count' => $this->created],
            ))
            ->action(__('View users'), route('users.index'));
    }
}
