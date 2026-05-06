<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('master_users', function (Blueprint $table) {
            $table->id();
            $table->string('employee_name');
            $table->unsignedBigInteger('department_id')->nullable();
            $table->string('role_id')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('approval_role')->nullable();
            $table->string('status')->default('Active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('master_users');
    }
};