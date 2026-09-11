<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent once, the first time an admin activates a self-registered account —
 * not on every suspend/reactivate toggle. See
 * UserController::updateStatus().
 */
class AccountApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @return array<int, string>
     */
    public function via(User $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Your :app account is ready', ['app' => config('app.name')]))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line(__('Your account has been approved. You can now log in and get started.'))
            ->action(__('Log in'), route('login'));
    }
}
