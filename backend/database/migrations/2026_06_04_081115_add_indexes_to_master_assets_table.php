<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('master_assets', function (Blueprint $table) {
            $table->index('asset_name');
            $table->index('status');
            $table->index('condition_status');
            $table->index('brand');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('master_assets', function (Blueprint $table) {
            $table->dropIndex(['asset_name']);
            $table->dropIndex(['status']);
            $table->dropIndex(['condition_status']);
            $table->dropIndex(['brand']);
            $table->dropIndex(['created_at']);
        });
    }
};