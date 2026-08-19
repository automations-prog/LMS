<?php

namespace App\Notifications;

use App\Models\LicenseSubmission;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LicenseDecisionNotification extends Notification implements ShouldQueue
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
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(User $notifiable): MailMessage
    {
        if ($this->status === LicenseSubmission::STATUS_VERIFIED) {
            return (new MailMessage)
                ->subject(__('Your license has been verified'))
                ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
                ->line(__('Good news — your uploaded license copy has been reviewed and verified.'));
        }

        $message = (new MailMessage)
            ->subject(__('Your license submission needs attention'))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line(__('Your uploaded license copy could not be verified.'));

        if ($this->note) {
            $message->line(__('Note from the reviewer: :note', ['note' => $this->note]));
        }

        return $message->line(__('Please upload a new copy from your dashboard.'));
    }
}
