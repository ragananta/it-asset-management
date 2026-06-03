<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── master_assets ────────────────────────────────────────────────────
        Schema::table('master_assets', function (Blueprint $table) {
            $table->index('condition_status', 'idx_assets_condition_status');
            $table->index('status',           'idx_assets_status');
            $table->index('category_id',      'idx_assets_category_id');
            $table->index('created_at',       'idx_assets_created_at');
        });

        // ── maintenance_logs ─────────────────────────────────────────────────
        Schema::table('maintenance_logs', function (Blueprint $table) {
            $table->index('asset_id',   'idx_maintenance_asset_id');
            $table->index('status',     'idx_maintenance_status');
            $table->index('date',       'idx_maintenance_date');
            $table->index('created_at', 'idx_maintenance_created_at');
        });

        // ── audit_logs ───────────────────────────────────────────────────────
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index('asset_id',   'idx_audit_asset_id');
            $table->index('action',     'idx_audit_action');
            $table->index('created_at', 'idx_audit_created_at');
        });

        // ── asset_assignments ────────────────────────────────────────────────
        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->index('asset_id',    'idx_assignments_asset_id');
            $table->index('return_date', 'idx_assignments_return_date');
            $table->index('created_at',  'idx_assignments_created_at');
        });

        // ── logs (activity logs) ─────────────────────────────────────────────
        Schema::table('logs', function (Blueprint $table) {
            $table->index('user_id',    'idx_logs_user_id');
            $table->index('activity',   'idx_logs_activity');
            $table->index('ip_address', 'idx_logs_ip_address');
            $table->index('created_at', 'idx_logs_created_at');
        });

        // ── categories ───────────────────────────────────────────────────────
        Schema::table('categories', function (Blueprint $table) {
            $table->index('is_active',  'idx_categories_is_active');
            $table->index('created_at', 'idx_categories_created_at');
        });
    }

    public function down(): void
    {
        Schema::table('master_assets', function (Blueprint $table) {
            $table->dropIndex('idx_assets_condition_status');
            $table->dropIndex('idx_assets_status');
            $table->dropIndex('idx_assets_category_id');
            $table->dropIndex('idx_assets_created_at');
        });

        Schema::table('maintenance_logs', function (Blueprint $table) {
            $table->dropIndex('idx_maintenance_asset_id');
            $table->dropIndex('idx_maintenance_status');
            $table->dropIndex('idx_maintenance_date');
            $table->dropIndex('idx_maintenance_created_at');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('idx_audit_asset_id');
            $table->dropIndex('idx_audit_action');
            $table->dropIndex('idx_audit_created_at');
        });

        Schema::table('asset_assignments', function (Blueprint $table) {
            $table->dropIndex('idx_assignments_asset_id');
            $table->dropIndex('idx_assignments_return_date');
            $table->dropIndex('idx_assignments_created_at');
        });

        Schema::table('logs', function (Blueprint $table) {
            $table->dropIndex('idx_logs_user_id');
            $table->dropIndex('idx_logs_activity');
            $table->dropIndex('idx_logs_ip_address');
            $table->dropIndex('idx_logs_created_at');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex('idx_categories_is_active');
            $table->dropIndex('idx_categories_created_at');
        });
    }
};