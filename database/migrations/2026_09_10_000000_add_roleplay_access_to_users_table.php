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
            // Access to the sales roleplay feature is granted per agent by
            // an admin/super-admin (not permission-based) — null means the
            // agent has no access yet.
            $table->timestamp('roleplay_enabled_at')->nullable()->after('source');
            $table->foreignId('roleplay_enabled_by')->nullable()->after('roleplay_enabled_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('roleplay_enabled_by');
            $table->dropColumn('roleplay_enabled_at');
        });
    }
};
