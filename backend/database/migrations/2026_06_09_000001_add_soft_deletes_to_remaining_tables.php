<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration ini menambahkan kolom deleted_at (soft delete) ke tabel yang belum memilikinya.
 *
 * Setelah migration ini dijalankan, pastikan model-model berikut menggunakan SoftDeletes trait:
 *   - App\Models\MasterAsset      → tambahkan: use SoftDeletes;
 *   - App\Models\Category         → tambahkan: use SoftDeletes;
 *   - App\Models\AssetProperty    → tambahkan: use SoftDeletes;
 *   - App\Models\AuditLog         → tambahkan: use SoftDeletes;
 *
 * Tabel yang sudah punya soft delete:
 *   - maintenance_logs   (migration 2026_05_24)
 *   - asset_assignments  (migration create table)
 */
return new class extends Migration
{
    public function up(): void
    {
        // master_assets
        if (!Schema::hasColumn('master_assets', 'deleted_at')) {
            Schema::table('master_assets', function (Blueprint $table) {
                $table->softDeletes()->after('note');
            });
        }

        // categories
        if (!Schema::hasColumn('categories', 'deleted_at')) {
            Schema::table('categories', function (Blueprint $table) {
                $table->softDeletes()->after('is_active');
            });
        }

        // asset_properties
        if (!Schema::hasColumn('asset_properties', 'deleted_at')) {
            Schema::table('asset_properties', function (Blueprint $table) {
                $table->softDeletes()->after('note');
            });
        }

        // audit_logs
        if (!Schema::hasColumn('audit_logs', 'deleted_at')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->softDeletes()->after('pic');
            });
        }

        // Setelah kolom ditambahkan, aktifkan SoftDeletes di model
        self::enableSoftDeletesInModels();
    }

    public function down(): void
    {
        Schema::table('master_assets', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::table('categories', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::table('asset_properties', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }

    /**
     * Aktifkan trait SoftDeletes di model-model terkait setelah kolom berhasil dibuat.
     */
    private static function enableSoftDeletesInModels(): void
    {
        $modelPath = app_path('Models');

        $updates = [
            'MasterAsset.php'   => [
                'find'    => "use HasFactory, LogsActivity;\n",
                'replace' => "use HasFactory, SoftDeletes, LogsActivity;\n",
                'import'  => "use Illuminate\\Database\\Eloquent\\SoftDeletes;\n",
            ],
            'Category.php'      => [
                'find'    => "use HasFactory, LogsActivity;\n",
                'replace' => "use HasFactory, SoftDeletes, LogsActivity;\n",
                'import'  => "use Illuminate\\Database\\Eloquent\\SoftDeletes;\n",
            ],
            'AssetProperty.php' => [
                'find'    => "use HasFactory;\n",
                'replace' => "use HasFactory, SoftDeletes;\n",
                'import'  => "use Illuminate\\Database\\Eloquent\\SoftDeletes;\n",
            ],
            'AuditLog.php'      => [
                'find'    => "use HasFactory;\n",
                'replace' => "use HasFactory, SoftDeletes;\n",
                'import'  => "use Illuminate\\Database\\Eloquent\\SoftDeletes;\n",
            ],
        ];

        foreach ($updates as $file => $config) {
            $path    = $modelPath . DIRECTORY_SEPARATOR . $file;
            if (!file_exists($path)) continue;
            $content = file_get_contents($path);

            // Tambahkan import jika belum ada
            if (!str_contains($content, 'SoftDeletes')) {
                $content = str_replace(
                    "use Illuminate\\Database\\Eloquent\\Model;\n",
                    "use Illuminate\\Database\\Eloquent\\Model;\n" . $config['import'],
                    $content
                );
                // Ganti use statement
                $content = str_replace($config['find'], $config['replace'], $content);
                file_put_contents($path, $content);
            }
        }
    }
};
