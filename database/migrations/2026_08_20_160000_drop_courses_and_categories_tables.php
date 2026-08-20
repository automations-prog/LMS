<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // `courses` before `categories` — it holds the FK.
        Schema::dropIfExists('courses');
        Schema::dropIfExists('categories');
    }

    /**
     * Reverse the migrations.
     *
     * Deliberately not reversible — this migration removes a feature, not
     * just adjusts its schema, so there's no "old shape" to restore.
     */
    public function down(): void {}
};
