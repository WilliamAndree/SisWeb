<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('session_token', 64)->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('autoevaluaciones', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn('session_token');
        });
    }
};
