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
            // Where this account came from — 'manual' (created by hand via
            // the Users form), 'customer_api' (the agent roster pull),
            // 'pitch_health', or 'pitch_perfect'. Null for accounts created
            // before this column existed.
            $table->string('source')->nullable()->after('metadata');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
