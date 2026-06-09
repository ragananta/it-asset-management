<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('asset_assignments', 'deleted_at')) {
            Schema::table('asset_assignments', function (Blueprint $table) {
                $table->softDeletes()->after('note');
            });
        }
    }

    public function down(): void
    {
        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};