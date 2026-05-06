<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
{
    Schema::create('notifications', function (Blueprint $table) {
        $table->id();

        $table->unsignedBigInteger('user_id')->nullable();

        $table->string('title');
        $table->text('message');

        $table->string('type')->nullable(); // warranty, maintenance, approval
        $table->string('status')->default('Unread'); // Unread / Read

        $table->timestamp('sent_at')->nullable();

        $table->timestamps();

        $table->foreign('user_id')
            ->references('id')
            ->on('master_users')
            ->onDelete('set null');
    });
}
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
