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
        Schema::create('eligibility_attestations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->date('date_of_birth');
            $table->string('home_state');
            $table->boolean('has_felony_conviction');
            $table->text('felony_details')->nullable();
            $table->boolean('is_us_citizen');
            $table->string('work_authorization_path')->nullable();
            $table->string('status');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('enrollment_completed_at')->nullable();
            $table->string('line_of_authority')->nullable();
            $table->timestamp('exam_scheduled_at')->nullable();
            $table->string('proctoring_type')->nullable();
            $table->timestamp('fingerprinting_completed_at')->nullable();
            $table->timestamp('license_application_submitted_at')->nullable();
            $table->timestamp('contracting_confirmed_at')->nullable();
            $table->timestamp('contracting_forwarded_at')->nullable();
            $table->timestamp('contracting_issued_at')->nullable();
            $table->timestamp('contracting_carrier_certs_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('eligibility_attestations');
    }
};
