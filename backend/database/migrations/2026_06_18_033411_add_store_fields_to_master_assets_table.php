<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('master_assets', function (Blueprint $table) {
            $table->unsignedBigInteger('store_id')->nullable()->index()->after('location_id');
            $table->string('store_name')->nullable()->after('store_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('master_assets', function (Blueprint $table) {
            $table->dropColumn(['store_id', 'store_name']);
        });
    }
};
