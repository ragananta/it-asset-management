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
        // Drop old tables if they exist
        Schema::dropIfExists('ploting_device_items');
        Schema::dropIfExists('ploting_devices');

        // Create new table asset_containers
        Schema::create('asset_containers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('container_asset_id')->constrained('master_assets')->onDelete('cascade');
            $table->foreignId('contained_asset_id')->unique()->constrained('master_assets')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('asset_containers');
    }
};
