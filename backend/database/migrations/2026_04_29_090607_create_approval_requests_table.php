<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approval_requests', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('asset_id')->nullable();

            $table->string('request_type');
            $table->text('request_description')->nullable();

            $table->string('status')->default('Pending');
            $table->date('request_date');

            $table->text('approval_notes')->nullable();
            $table->date('approved_date')->nullable();

            $table->timestamps();

            $table->foreign('user_id')
                ->references('id')
                ->on('master_users')
                ->onDelete('cascade');

            $table->foreign('asset_id')
                ->references('id')
                ->on('master_assets')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_requests');
    }
};