<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('roleplay_sessions', function (Blueprint $table) {
            // Which config('roleplay.verticals') entry this session was
            // scripted against (medicare, aca, ...) — recorded on the
            // session itself, not derived from the agent's current
            // agent_type, so a session already in progress or scored keeps
            // using the persona/rubric it started with even if an admin
            // later reassigns the agent to a different vertical.
            $table->string('vertical')->default('medicare')->after('scenario_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('roleplay_sessions', function (Blueprint $table) {
            $table->dropColumn('vertical');
        });
    }
};
