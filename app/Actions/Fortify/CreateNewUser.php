<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Notifications\NewAgentRegistrationNotification;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly self-registered agent account. Lands
     * inactive — an admin has to approve it (UserController::updateStatus,
     * same "Activate" action already used for everything else) before it
     * can log in.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'company_name' => ['nullable', 'string', 'max:255'],
            'password' => $this->passwordRules(),
        ])->validate();

        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'company_name' => $input['company_name'] ?? null,
            'source' => User::SOURCE_SELF_REGISTERED,
            'is_active' => false,
        ]);

        $user->syncRoles(['agent']);

        Notification::send(User::accountApprovers(), new NewAgentRegistrationNotification($user));

        return $user;
    }
}
