<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id')->nullable();

            $table->string('module');
            $table->string('action');

            $table->text('description')->nullable();

            $table->timestamp('activity_time')->useCurrent();

            $table->timestamps();

            $table->foreign('user_id')
                ->references('id')
                ->on('master_users')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};