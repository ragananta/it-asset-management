<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->index('user_name');
            $table->index('assign_date');
            $table->index('return_date');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->dropIndex(['user_name']);
            $table->dropIndex(['assign_date']);
            $table->dropIndex(['return_date']);
            $table->dropIndex(['created_at']);
        });
    }
};