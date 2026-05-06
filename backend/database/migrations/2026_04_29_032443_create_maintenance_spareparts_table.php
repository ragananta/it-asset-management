<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('maintenance_spareparts', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('maintenance_log_id')->nullable();

            $table->string('part_name')->nullable();
            $table->string('part_serial')->nullable();

            $table->integer('qty')->default(1);

            $table->decimal('unit_price', 15, 2)->nullable();
            $table->decimal('total_price', 15, 2)->nullable();

            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_spareparts');
    }
};