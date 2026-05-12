<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asset_properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained('master_assets')->onDelete('cascade');
            $table->string('property_name');
            $table->text('value')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asset_properties');
    }
};