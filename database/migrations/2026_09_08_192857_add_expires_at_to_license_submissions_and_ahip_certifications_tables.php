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
        Schema::table('license_submissions', function (Blueprint $table) {
            $table->date('expires_at')->nullable()->after('status');
        });

        Schema::table('ahip_certifications', function (Blueprint $table) {
            $table->date('expires_at')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('license_submissions', function (Blueprint $table) {
            $table->dropColumn('expires_at');
        });

        Schema::table('ahip_certifications', function (Blueprint $table) {
            $table->dropColumn('expires_at');
        });
    }
};
