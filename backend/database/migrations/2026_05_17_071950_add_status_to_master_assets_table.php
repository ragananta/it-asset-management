<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
{
    Schema::table('master_assets', function (Blueprint $table) {
        $table->enum('status', ['active', 'borrowed', 'disposed'])
              ->default('active')
              ->after('condition_status');
    });
}

public function down()
{
    Schema::table('master_assets', function (Blueprint $table) {
        $table->dropColumn('status');
    });
}
};
