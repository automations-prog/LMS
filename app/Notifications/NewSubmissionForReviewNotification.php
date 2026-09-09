<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewSubmissionForReviewNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  User  $agent  The agent who submitted the document — not the
     *                       notifiable; every reviewer gets the same notification.
     * @param  string  $documentLabel  e.g. "eligibility attestation", "XCEL
     *                                 training certificate", "license copy",
     *                                 "AHIP certification".
     */
    public function __construct(
        private readonly User $agent,
        private readonly string $documentLabel,
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
            'title' => __('New submission awaiting review'),
            'body' => __(':name submitted a :document.', [
                'name' => $this->agent->name,
                'document' => $this->documentLabel,
            ]),
            'level' => 'info',
            'action_url' => route('onboarding.show', $this->agent),
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(User $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('New :document submitted for review', ['document' => $this->documentLabel]))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line(__(':name has submitted a :document. Please review it when you have a moment.', [
                'name' => $this->agent->name,
                'document' => $this->documentLabel,
            ]))
            ->action(__('Review submission'), route('onboarding.show', $this->agent));
    }
}
