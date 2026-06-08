<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asset_properties', function (Blueprint $table) {
            $table->index('property_name');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('asset_properties', function (Blueprint $table) {
            $table->dropIndex(['property_name']);
            $table->dropIndex(['created_at']);
        });
    }
};