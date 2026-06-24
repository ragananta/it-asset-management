<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // ── master_assets ────────────────────────────────────────────────────
        Schema::table('master_assets', function (Blueprint $table) {
            $this->addIndexIfMissing('master_assets', ['deleted_at', 'category_id', 'status', 'created_at'], 'idx_assets_del_cat_stat_created');
            $this->addIndexIfMissing('master_assets', ['deleted_at', 'status', 'condition_status', 'created_at'], 'idx_assets_del_stat_cond_created');
        });

        // ── asset_assignments ────────────────────────────────────────────────
        Schema::table('asset_assignments', function (Blueprint $table) {
            $this->addIndexIfMissing('asset_assignments', ['deleted_at', 'return_date', 'assign_date'], 'idx_assignments_del_ret_assign');
            $this->addIndexIfMissing('asset_assignments', ['user_name'], 'idx_assignments_user_name');
        });

        // ── audit_logs ───────────────────────────────────────────────────────
        Schema::table('audit_logs', function (Blueprint $table) {
            $this->addIndexIfMissing('audit_logs', ['deleted_at', 'created_at'], 'idx_audit_del_created');
        });

        // ── categories ───────────────────────────────────────────────────────
        Schema::table('categories', function (Blueprint $table) {
            $this->addIndexIfMissing('categories', ['deleted_at'], 'idx_categories_del');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('master_assets', function (Blueprint $table) {
            $this->dropIndexIfExists('master_assets', 'idx_assets_del_cat_stat_created');
            $this->dropIndexIfExists('master_assets', 'idx_assets_del_stat_cond_created');
        });

        Schema::table('asset_assignments', function (Blueprint $table) {
            $this->dropIndexIfExists('asset_assignments', 'idx_assignments_del_ret_assign');
            $this->dropIndexIfExists('asset_assignments', 'idx_assignments_user_name');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $this->dropIndexIfExists('audit_logs', 'idx_audit_del_created');
        });

        Schema::table('categories', function (Blueprint $table) {
            $this->dropIndexIfExists('categories', 'idx_categories_del');
        });
    }

    private function addIndexIfMissing(string $tableName, array $columns, string $indexName): void
    {
        if (!Schema::hasTable($tableName) || $this->indexExists($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($columns, $indexName) {
            $table->index($columns, $indexName);
        });
    }

    private function dropIndexIfExists(string $tableName, string $indexName): void
    {
        if (!Schema::hasTable($tableName) || !$this->indexExists($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexName) {
            $table->dropIndex($indexName);
        });
    }

    private function indexExists(string $tableName, string $indexName): bool
    {
        $database = DB::getDatabaseName();
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            $result = DB::select("PRAGMA index_info('{$indexName}')");
            return !empty($result) || DB::table('sqlite_master')
                ->where('type', 'index')
                ->where('name', $indexName)
                ->exists();
        }

        return DB::table('information_schema.statistics')
            ->where('table_schema', $database)
            ->where('table_name', $tableName)
            ->where('index_name', $indexName)
            ->exists();
    }
};
