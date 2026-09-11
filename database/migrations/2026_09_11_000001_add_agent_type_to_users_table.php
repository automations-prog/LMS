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
        Schema::table('users', function (Blueprint $table) {
            // The agent segment (pre-licensee, fronter, Medicare agent, ACA
            // agent, ...) — separate from the agent/admin/super-admin auth
            // role. Drives per-segment feature toggles (FeatureAccess) and
            // which roleplay vertical/script an agent practices against.
            // Nullable: most existing accounts predate this and simply
            // aren't segmented yet, which FeatureAccess treats as
            // unrestricted rather than locked out.
            $table->string('agent_type')->nullable()->after('source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('agent_type');
        });
    }
};
