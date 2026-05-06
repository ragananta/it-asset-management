<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_schedules', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('asset_id');

            $table->date('scheduled_date');
            $table->string('maintenance_type');
            $table->string('priority')->default('Medium');
            $table->string('status')->default('Pending');

            $table->text('notes')->nullable();

            $table->timestamps();

            $table->foreign('asset_id')
                ->references('id')
                ->on('master_assets')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_schedules');
    }
};