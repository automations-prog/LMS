<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewAgentRegistrationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  User  $registrant  The person who just self-registered — not
     *                            the notifiable; every approver gets the
     *                            same notification.
     */
    public function __construct(
        private readonly User $registrant,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(User $notifiable): array
    {
        return ['mail', 'database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(User $notifiable): array
    {
        return [
            'title' => __('New registration awaiting approval'),
            'body' => $this->registrant->company_name
                ? __(':name (:company) registered and is waiting for approval.', [
                    'name' => $this->registrant->name,
                    'company' => $this->registrant->company_name,
                ])
                : __(':name registered and is waiting for approval.', [
                    'name' => $this->registrant->name,
                ]),
            'level' => 'info',
            'action_url' => route('users.show', $this->registrant),
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(User $notifiable): MailMessage
    {
        $line = $this->registrant->company_name
            ? __(':name from :company just created an account and is waiting for approval.', [
                'name' => $this->registrant->name,
                'company' => $this->registrant->company_name,
            ])
            : __(':name just created an account and is waiting for approval.', [
                'name' => $this->registrant->name,
            ]);

        return (new MailMessage)
            ->subject(__('New registration awaiting approval'))
            ->greeting(__('Hello :name!', ['name' => $notifiable->name]))
            ->line($line)
            ->line(__('Email: :email', ['email' => $this->registrant->email]))
            ->action(__('Review account'), route('users.show', $this->registrant));
    }
}
