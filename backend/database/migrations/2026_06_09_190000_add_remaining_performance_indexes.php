<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── master_assets ────────────────────────────────────────────────────
        Schema::table('master_assets', function (Blueprint $table) {
            $this->addIndexIfMissing('master_assets', 'updated_at', 'idx_assets_updated_at');
            $this->addIndexIfMissing('master_assets', 'vendor', 'idx_assets_vendor');
        });

        // ── maintenance_logs ─────────────────────────────────────────────────
        Schema::table('maintenance_logs', function (Blueprint $table) {
            $this->addIndexIfMissing('maintenance_logs', 'updated_at', 'idx_maintenance_updated_at');
        });

        // ── asset_assignments ────────────────────────────────────────────────
        Schema::table('asset_assignments', function (Blueprint $table) {
            $this->addIndexIfMissing('asset_assignments', 'updated_at', 'idx_assignments_updated_at');
        });

        // ── categories ───────────────────────────────────────────────────────
        Schema::table('categories', function (Blueprint $table) {
            $this->addIndexIfMissing('categories', 'updated_at', 'idx_categories_updated_at');
        });

        // ── locations ────────────────────────────────────────────────────────
        Schema::table('locations', function (Blueprint $table) {
            $this->addIndexIfMissing('locations', 'updated_at', 'idx_locations_updated_at');
        });

        // ── audit_logs ───────────────────────────────────────────────────────
        Schema::table('audit_logs', function (Blueprint $table) {
            $this->addIndexIfMissing('audit_logs', 'updated_at', 'idx_audit_logs_updated_at');
        });
    }

    public function down(): void
    {
        $this->dropIndexIfExists('master_assets', 'idx_assets_updated_at');
        $this->dropIndexIfExists('master_assets', 'idx_assets_vendor');
        $this->dropIndexIfExists('maintenance_logs', 'idx_maintenance_updated_at');
        $this->dropIndexIfExists('asset_assignments', 'idx_assignments_updated_at');
        $this->dropIndexIfExists('categories', 'idx_categories_updated_at');
        $this->dropIndexIfExists('locations', 'idx_locations_updated_at');
        $this->dropIndexIfExists('audit_logs', 'idx_audit_logs_updated_at');
    }

    private function addIndexIfMissing(string $tableName, string $column, string $indexName): void
    {
        if (!Schema::hasTable($tableName) || !Schema::hasColumn($tableName, $column) || $this->indexExists($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($column, $indexName) {
            $table->index($column, $indexName);
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
