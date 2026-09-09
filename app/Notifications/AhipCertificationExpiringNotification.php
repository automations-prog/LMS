<?php

namespace App\Notifications;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AhipCertificationExpiringNotification extends Notification implements ShouldQueue
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
            'title' => __('Your AHIP certification is expiring soon'),
            'body' => __('Your AHIP certification expires on :date (:days days from now). It renews annually — recertify to keep selling Medicare products.', [
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
            ->subject(__('Your AHIP certification expires in :days days', ['days' => $this->daysUntilExpiration]))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line(__('Your AHIP/FWA certification on file is set to expire on :date.', [
                'date' => $this->expiresAt->toFormattedDateString(),
            ]))
            ->line(__('AHIP certification renews annually. Please recertify and upload the updated certificate from your dashboard before it expires.'));
    }
}
