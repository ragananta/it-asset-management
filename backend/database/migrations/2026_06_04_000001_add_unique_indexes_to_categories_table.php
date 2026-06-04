<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->addUniqueIfMissing('categories', 'name', 'uniq_categories_name');
        $this->addUniqueIfMissing('categories', 'code', 'uniq_categories_code');
    }

    public function down(): void
    {
        $this->dropIndexIfExists('categories', 'uniq_categories_code');
        $this->dropIndexIfExists('categories', 'uniq_categories_name');
    }

    private function addUniqueIfMissing(string $tableName, string $column, string $indexName): void
    {
        if (
            ! Schema::hasTable($tableName)
            || ! Schema::hasColumn($tableName, $column)
            || $this->indexExists($tableName, $indexName)
            || $this->uniqueColumnIndexExists($tableName, $column)
        ) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($column, $indexName) {
            $table->unique($column, $indexName);
        });
    }

    private function dropIndexIfExists(string $tableName, string $indexName): void
    {
        if (! Schema::hasTable($tableName) || ! $this->indexExists($tableName, $indexName)) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexName) {
            $table->dropUnique($indexName);
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

    private function uniqueColumnIndexExists(string $tableName, string $column): bool
    {
        $database = DB::getDatabaseName();

        return DB::table('information_schema.statistics')
            ->where('table_schema', $database)
            ->where('table_name', $tableName)
            ->where('column_name', $column)
            ->where('non_unique', 0)
            ->exists();
    }
};
