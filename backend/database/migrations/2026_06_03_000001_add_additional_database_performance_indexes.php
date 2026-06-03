<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addIndexIfMissing('master_assets', 'location_id', 'idx_assets_location_id');
        $this->addIndexIfMissing('master_assets', 'assigned_user_id', 'idx_assets_assigned_user_id');
        $this->addIndexIfMissing('master_assets', ['status', 'created_at'], 'idx_assets_status_created_at');
        $this->addIndexIfMissing('master_assets', ['condition_status', 'created_at'], 'idx_assets_condition_created_at');
        $this->addIndexIfMissing('master_assets', ['category_id', 'created_at'], 'idx_assets_category_created_at');
        $this->addIndexIfMissing('master_assets', ['location_id', 'created_at'], 'idx_assets_location_created_at');
        $this->addIndexIfMissing('master_assets', 'warranty_expired', 'idx_assets_warranty_expired');

        $this->addIndexIfMissing('asset_assignments', 'assign_date', 'idx_assignments_assign_date');
        $this->addIndexIfMissing('asset_assignments', 'deleted_at', 'idx_assignments_deleted_at');
        $this->addIndexIfMissing('asset_assignments', ['asset_id', 'return_date'], 'idx_assignments_asset_return_date');
        $this->addIndexIfMissing('asset_assignments', ['return_date', 'created_at'], 'idx_assignments_return_created_at');
        $this->addIndexIfMissing('asset_assignments', ['asset_id', 'assign_date'], 'idx_assignments_asset_assign_date');

        $this->addIndexIfMissing('maintenance_logs', 'deleted_at', 'idx_maintenance_deleted_at');
        $this->addIndexIfMissing('maintenance_logs', ['asset_id', 'status'], 'idx_maintenance_asset_status');
        $this->addIndexIfMissing('maintenance_logs', ['status', 'date'], 'idx_maintenance_status_date');
        $this->addIndexIfMissing('maintenance_logs', ['asset_id', 'date'], 'idx_maintenance_asset_date');

        $this->addIndexIfMissing('audit_logs', ['asset_id', 'created_at'], 'idx_audit_asset_created_at');
        $this->addIndexIfMissing('audit_logs', ['action', 'created_at'], 'idx_audit_action_created_at');

        $this->addIndexIfMissing('asset_properties', 'asset_id', 'idx_asset_properties_asset_id');
        $this->addIndexIfMissing('asset_properties', 'property_name', 'idx_asset_properties_property_name');
        $this->addIndexIfMissing('asset_properties', ['asset_id', 'property_name'], 'idx_asset_properties_asset_property');

        $this->addIndexIfMissing('logs', ['user_id', 'created_at'], 'idx_logs_user_created_at');
        $this->addIndexIfMissing('logs', ['activity', 'created_at'], 'idx_logs_activity_created_at');

        $this->addIndexIfMissing('categories', 'name', 'idx_categories_name');

        $this->addIndexIfMissing('locations', 'is_active', 'idx_locations_is_active');
        $this->addIndexIfMissing('locations', 'created_at', 'idx_locations_created_at');
    }

    public function down(): void
    {
        $this->dropIndexIfExists('locations', 'idx_locations_is_active');
        $this->dropIndexIfExists('locations', 'idx_locations_created_at');

        $this->dropIndexIfExists('logs', 'idx_logs_user_created_at');
        $this->dropIndexIfExists('logs', 'idx_logs_activity_created_at');

        $this->dropIndexIfExists('categories', 'idx_categories_name');

        $this->dropIndexIfExists('asset_properties', 'idx_asset_properties_asset_id');
        $this->dropIndexIfExists('asset_properties', 'idx_asset_properties_property_name');
        $this->dropIndexIfExists('asset_properties', 'idx_asset_properties_asset_property');

        $this->dropIndexIfExists('audit_logs', 'idx_audit_asset_created_at');
        $this->dropIndexIfExists('audit_logs', 'idx_audit_action_created_at');

        $this->dropIndexIfExists('maintenance_logs', 'idx_maintenance_deleted_at');
        $this->dropIndexIfExists('maintenance_logs', 'idx_maintenance_asset_status');
        $this->dropIndexIfExists('maintenance_logs', 'idx_maintenance_status_date');
        $this->dropIndexIfExists('maintenance_logs', 'idx_maintenance_asset_date');

        $this->dropIndexIfExists('asset_assignments', 'idx_assignments_assign_date');
        $this->dropIndexIfExists('asset_assignments', 'idx_assignments_deleted_at');
        $this->dropIndexIfExists('asset_assignments', 'idx_assignments_asset_return_date');
        $this->dropIndexIfExists('asset_assignments', 'idx_assignments_return_created_at');
        $this->dropIndexIfExists('asset_assignments', 'idx_assignments_asset_assign_date');

        $this->dropIndexIfExists('master_assets', 'idx_assets_location_id');
        $this->dropIndexIfExists('master_assets', 'idx_assets_assigned_user_id');
        $this->dropIndexIfExists('master_assets', 'idx_assets_status_created_at');
        $this->dropIndexIfExists('master_assets', 'idx_assets_condition_created_at');
        $this->dropIndexIfExists('master_assets', 'idx_assets_category_created_at');
        $this->dropIndexIfExists('master_assets', 'idx_assets_location_created_at');
        $this->dropIndexIfExists('master_assets', 'idx_assets_warranty_expired');
    }

    private function addIndexIfMissing(string $tableName, array|string $columns, string $indexName): void
    {
        if (! Schema::hasTable($tableName) || $this->indexExists($tableName, $indexName)) {
            return;
        }

        foreach ((array) $columns as $column) {
            if (! Schema::hasColumn($tableName, $column)) {
                return;
            }
        }

        Schema::table($tableName, function (Blueprint $table) use ($columns, $indexName) {
            $table->index($columns, $indexName);
        });
    }

    private function dropIndexIfExists(string $tableName, string $indexName): void
    {
        if (! Schema::hasTable($tableName) || ! $this->indexExists($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexName) {
            $table->dropIndex($indexName);
        });
    }

    private function indexExists(string $tableName, string $indexName): bool
    {
        $database = DB::getDatabaseName();

        return DB::table('information_schema.statistics')
            ->where('table_schema', $database)
            ->where('table_name', $tableName)
            ->where('index_name', $indexName)
            ->exists();
    }
};
