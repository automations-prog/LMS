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
        Schema::create('pitch_perfect_submissions', function (Blueprint $table) {
            $table->id();
            // Airtable's own record id, so a re-pull updates the same row
            // instead of duplicating it.
            $table->string('airtable_record_id')->unique();
            $table->string('email')->nullable();
            $table->string('full_name')->nullable();
            // Raw 'Status' value from Airtable (e.g. "Active", "Non-active")
            // — only "Active" submissions get a user account created.
            $table->string('status')->nullable();
            $table->timestamp('submitted_at')->nullable();
            // Every other field from the Airtable record, verbatim — kept
            // as-is rather than modeled column-by-column since the form's
            // fields are expected to keep changing.
            $table->json('metadata')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pitch_perfect_submissions');
    }
};
