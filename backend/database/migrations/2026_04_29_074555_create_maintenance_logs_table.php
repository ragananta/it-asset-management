<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_logs', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('asset_id');

            $table->foreign('asset_id')
                ->references('id')
                ->on('master_assets')
                ->onDelete('cascade');

            $table->date('maintenance_date');
            $table->string('maintenance_type');

            $table->text('description')->nullable();
            $table->decimal('cost', 15, 2)->nullable();
            $table->string('technician')->nullable();
            $table->string('status')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_logs');
    }
};