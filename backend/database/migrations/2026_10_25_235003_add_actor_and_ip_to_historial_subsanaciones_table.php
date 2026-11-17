<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('historial_subsanaciones', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('subsanacion_id')->constrained('users')->nullOnDelete();
            $table->string('ip_address', 45)->nullable()->after('comentario');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('historial_subsanaciones', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn(['user_id', 'ip_address']);
        });
    }
};
