<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adapta la tabla recursos_educativos para su integración formal con criterios_normativos:
     * - Agrega criterio_normativo_id como FK nullable hacia criterios_normativos.id
     * - Renombra descripcion_didactica a descripcion_corta
     * - Agrega fuente_autor, duracion_estimada, fecha_revision
     * - Adapta los valores de tipo (YOUTUBE -> VIDEO, PDF/GUIA -> GUIA_DIGITAL)
     * - Mapea registros existentes no ambiguos (EXTINTOR_PQS -> CRIT-01) y preserva los demás como nullable
     * - Elimina columnas obsoletas: codigo_normativo, base_legal, evidencia_sugerida
     */
    public function up(): void
    {
        // 1. Agregar nuevas columnas si no existen
        Schema::table('recursos_educativos', function (Blueprint $table) {
            if (! Schema::hasColumn('recursos_educativos', 'criterio_normativo_id')) {
                $table->foreignId('criterio_normativo_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('criterios_normativos')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('recursos_educativos', 'fuente_autor')) {
                $table->string('fuente_autor', 100)->nullable()->after('url');
            }

            if (! Schema::hasColumn('recursos_educativos', 'duracion_estimada')) {
                $table->string('duracion_estimada', 20)->nullable()->after('fuente_autor');
            }

            if (! Schema::hasColumn('recursos_educativos', 'fecha_revision')) {
                $table->date('fecha_revision')->nullable()->after('activo');
            }
        });

        // 2. Normalización de datos existentes (transformación de tipo)
        DB::table('recursos_educativos')
            ->where('tipo', 'YOUTUBE')
            ->update(['tipo' => 'VIDEO']);

        DB::table('recursos_educativos')
            ->whereIn('tipo', ['PDF', 'GUIA'])
            ->update(['tipo' => 'GUIA_DIGITAL']);

        // 3. Mapeo no ambiguo de registros legacy
        // Solo EXTINTOR_PQS corresponde inequívocamente a CRIT-01.
        // LUCES_EMERG, TERMOMAGNETICO y EVACUACION quedan con criterio_normativo_id = null
        // para posterior curación controlada, evitando asociaciones arbitrarias.
        if (Schema::hasColumn('recursos_educativos', 'codigo_normativo')) {
            $criterio01 = DB::table('criterios_normativos')
                ->where('codigo_criterio', 'CRIT-01')
                ->first();

            if ($criterio01) {
                DB::table('recursos_educativos')
                    ->where('codigo_normativo', 'EXTINTOR_PQS')
                    ->update([
                        'criterio_normativo_id' => $criterio01->id,
                        'fuente_autor' => 'CGBVP / Indeci',
                        'duracion_estimada' => '3 min',
                    ]);
            }
        }

        // 4. Renombrar descripcion_didactica a descripcion_corta si aún existe
        if (Schema::hasColumn('recursos_educativos', 'descripcion_didactica')) {
            Schema::table('recursos_educativos', function (Blueprint $table) {
                $table->renameColumn('descripcion_didactica', 'descripcion_corta');
            });
        }

        // 5. Eliminar índice y columnas obsoletas de forma segura en cualquier motor
        if (Schema::hasIndex('recursos_educativos', ['codigo_normativo'])) {
            Schema::table('recursos_educativos', function (Blueprint $table) {
                $table->dropIndex(['codigo_normativo']);
            });
        }

        $columnasAEliminar = array_filter(
            ['codigo_normativo', 'base_legal', 'evidencia_sugerida'],
            fn ($col) => Schema::hasColumn('recursos_educativos', $col)
        );

        if (! empty($columnasAEliminar)) {
            Schema::table('recursos_educativos', function (Blueprint $table) use ($columnasAEliminar) {
                $table->dropColumn($columnasAEliminar);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('recursos_educativos', function (Blueprint $table) {
            $table->string('codigo_normativo', 50)->nullable()->index();
            $table->string('base_legal')->nullable();
            $table->string('evidencia_sugerida')->nullable();
            $table->renameColumn('descripcion_corta', 'descripcion_didactica');
            $table->dropConstrainedForeignId('criterio_normativo_id');
            $table->dropColumn(['fuente_autor', 'duracion_estimada', 'fecha_revision']);
        });

        DB::table('recursos_educativos')
            ->where('tipo', 'VIDEO')
            ->update(['tipo' => 'YOUTUBE']);
    }
};
