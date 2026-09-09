<?php

namespace App\Notifications;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LicenseExpiringNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly CarbonImmutable $expiresAt,
        private readonly int $daysUntilExpiration,
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
            'title' => __('Your license is expiring soon'),
            'body' => __('Your license expires on :date (:days days from now). Renew it to stay in good standing.', [
                'date' => $this->expiresAt->toFormattedDateString(),
                'days' => $this->daysUntilExpiration,
            ]),
            'level' => 'error',
            'action_url' => route('dashboard'),
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Your license expires in :days days', ['days' => $this->daysUntilExpiration]))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line(__('Your license on file is set to expire on :date.', [
                'date' => $this->expiresAt->toFormattedDateString(),
            ]))
            ->line(__('Please renew your license and upload the updated copy from your dashboard before it expires.'));
    }
}
