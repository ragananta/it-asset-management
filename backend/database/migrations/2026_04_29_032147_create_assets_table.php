<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('master_assets', function (Blueprint $table) {
            $table->id();

            $table->string('asset_code')->unique();
            $table->string('asset_name');

            $table->unsignedBigInteger('category_id')->nullable();
            $table->unsignedBigInteger('vendor_id')->nullable();
            $table->unsignedBigInteger('assigned_user_id')->nullable();
            $table->unsignedBigInteger('location_id')->nullable();

            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable();

            $table->date('purchase_date')->nullable();
            $table->date('warranty_expiry')->nullable();

            $table->decimal('purchase_price', 15, 2)->nullable();
            $table->decimal('current_value', 15, 2)->nullable();
            $table->decimal('depreciation_value', 15, 2)->nullable();

            $table->string('condition_status')->default('Good');
            $table->string('lifecycle_status')->default('Active');

            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('master_assets');
    }
};