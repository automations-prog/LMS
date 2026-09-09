<?php

namespace App\Http\Controllers;

use App\Actions\SyncTrainingProgressForUser;
use App\Models\User;
use App\Services\CustomerApiClient;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class TrainingProgressController extends Controller
{
    /**
     * Show the current agent's own synced XCEL training progress.
     */
    public function show(Request $request, CustomerApiClient $client, SyncTrainingProgressForUser $sync): Response
    {
        return $this->render($request, $client, $sync, $request->user());
    }

    /**
     * Show any agent's synced XCEL training progress, for admin review.
     */
    public function showForUser(Request $request, CustomerApiClient $client, SyncTrainingProgressForUser $sync, User $user): Response
    {
        abort_unless($request->user()->can('onboarding.review'), 403);
        abort_unless($user->hasRole('agent'), 404);

        return $this->render($request, $client, $sync, $user);
    }

    /**
     * Sync the target's training programs from the Customer API (falling
     * back to whatever was last synced on failure) and render the page.
     */
    private function render(Request $request, CustomerApiClient $client, SyncTrainingProgressForUser $sync, User $target): Response
    {
        try {
            $sync->handle($target, $client);
        } catch (Throwable) {
            // Fall back to whatever was last synced rather than
            // breaking the page over a transient API outage.
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => __('Could not refresh training progress from XCEL. Showing the last synced data.'),
            ]);
        }

        return Inertia::render('training-progress/show', [
            'agent' => [
                'id' => $target->id,
                'name' => $target->name,
                'email' => $target->email,
            ],
            'programs' => $target->trainingProgresses()->latest('synced_at')->get(),
            'isOwnProgress' => $target->is($request->user()),
        ]);
    }
}
