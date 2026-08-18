<?php

namespace App\Notifications;

use App\Models\EligibilityAttestation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EligibilityDecisionNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $status,
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
        if ($this->status === EligibilityAttestation::STATUS_CLEARED) {
            return (new MailMessage)
                ->subject(__('Your eligibility review is complete'))
                ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
                ->line(__('Good news — your eligibility attestation has been reviewed and cleared.'))
                ->line(__('You can now continue onto the next step.'));
        }

        return (new MailMessage)
            ->subject(__('Update on your eligibility review'))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line(__('Your eligibility attestation has been reviewed, and unfortunately you have not been cleared to proceed.'))
            ->line(__('Please contact an administrator if you have questions about this decision.'));
    }
}
