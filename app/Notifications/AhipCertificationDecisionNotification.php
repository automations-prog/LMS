<?php

namespace App\Notifications;

use App\Models\AhipCertification;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AhipCertificationDecisionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $status,
        private readonly ?string $note = null,
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
        $verified = $this->status === AhipCertification::STATUS_VERIFIED;

        return [
            'title' => $verified
                ? __('Your AHIP certification has been verified')
                : __('Your AHIP certification needs attention'),
            'body' => $verified
                ? __('Your AHIP/FWA certification has been reviewed and verified.')
                : ($this->note ?: __('Your uploaded AHIP completion certificate could not be verified. Please upload a new one.')),
            'level' => $verified ? 'success' : 'error',
            'action_url' => route('dashboard'),
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(User $notifiable): MailMessage
    {
        if ($this->status === AhipCertification::STATUS_VERIFIED) {
            return (new MailMessage)
                ->subject(__('Your AHIP certification has been verified'))
                ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
                ->line(__('Good news — your AHIP/FWA certification has been reviewed and verified.'));
        }

        $message = (new MailMessage)
            ->subject(__('Your AHIP certification needs attention'))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line(__('Your uploaded AHIP completion certificate could not be verified.'));

        if ($this->note) {
            $message->line(__('Note from the reviewer: :note', ['note' => $this->note]));
        }

        return $message->line(__('Please upload a new certificate from your dashboard.'));
    }
}
