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
        Schema::create('ploting_devices', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('store_name');
            $table->text('description')->nullable();
            $table->text('qr_code')->nullable();
            $table->enum('status', ['available', 'borrowed', 'maintenance', 'incomplete', 'lost'])->default('available');
            $table->string('borrowed_by')->nullable();
            $table->timestamp('borrowed_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('ploting_device_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ploting_device_id')->constrained('ploting_devices')->onDelete('cascade');
            $table->foreignId('asset_id')->constrained('master_assets')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ploting_device_items');
        Schema::dropIfExists('ploting_devices');
    }
};
