<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('request_workflows', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('asset_id')->nullable();

            $table->string('request_type')->nullable();

            $table->unsignedBigInteger('requester_id')->nullable();
            $table->unsignedBigInteger('approver_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable();

            $table->date('request_date')->nullable();
            $table->date('completion_date')->nullable();

            $table->string('approval_status')->default('Pending');
            $table->text('approval_notes')->nullable();

            $table->string('priority_level')->default('Normal');

            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('request_workflows');
    }
};