<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_assignments', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('asset_id');
            $table->unsignedBigInteger('user_id');

            $table->date('assigned_date');
            $table->date('return_date')->nullable(); // tambahkan ini

            $table->string('status')->default('Assigned');
            $table->text('notes')->nullable();

            $table->timestamps();

            $table->foreign('asset_id')
                ->references('id')
                ->on('master_assets')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('master_users')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_assignments');
    }
};