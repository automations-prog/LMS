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
        Schema::create('feature_toggles', function (Blueprint $table) {
            $table->id();
            // User::AGENT_TYPES key this toggle applies to.
            $table->string('agent_type');
            // config('features') key, e.g. 'roleplay'.
            $table->string('feature');
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique(['agent_type', 'feature']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('feature_toggles');
    }
};
