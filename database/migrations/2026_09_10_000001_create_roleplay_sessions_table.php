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
        Schema::create('roleplay_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('scenario_key');
            // in_progress -> completed (transcript captured, awaiting the
            // scoring job) -> scored, or failed if the live call or the
            // scoring pass errored out.
            $table->string('status')->default('in_progress');
            $table->json('transcript')->nullable();
            $table->json('score')->nullable();
            // Denormalized out of `score` for cheap sorting/filtering on
            // the admin coaching list without decoding the JSON column.
            $table->unsignedTinyInteger('overall_score')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamp('scored_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roleplay_sessions');
    }
};
