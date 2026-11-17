<?php

namespace Database\Seeders;

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\ProveedorRecurso;
use App\Models\RespuestaAutoevaluacion;
use App\Models\SimulacionRevision;
use App\Models\Subsanacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoWalkthroughSeeder extends Seeder
{
    /**
     * Corre el seeder interactivo con los 3 arquetipos de comerciantes para demo en vivo:
     *
     * 1. Don Lucho  (donlucho@huancayo.pe)   -> Caso 100% Conforme y Sellado con SHA-256 (Anexos CENEPRED listos)
     * 2. Doña María (donamaria@huancayo.pe)  -> Caso Observado con 2 subsanaciones pendientes (Extintor y Cables)
     * 3. Nuevo      (nuevo@huancayo.pe)      -> Comerciante nuevo sin locales (Empty State y Nuevo Local)
     *
     * Contraseña estándar para todos: password123
     */
    public function run(): void
    {
        $this->command?->info('Iniciando poblamiento de datos para Demo Walkthrough CheckITSE Huancayo...');

        // Asegurar que el catálogo normativo y proveedores existan
        if (CriterioNormativo::count() === 0) {
            $this->command?->info('Sembrando catálogo normativo oficial...');
            $this->call(NormativaCatalogSeeder::class);
        }

        if (ProveedorRecurso::count() === 0) {
            $this->command?->info('Sembrando catálogo de proveedores y aliados técnicos...');
            $this->call(ProveedorRecursoSeeder::class);
        }

        $applicabilityEngine = app(ApplicabilityEngineService::class);
        $criterios = CriterioNormativo::where('activo', true)->orderBy('orden')->get()->keyBy('codigo_criterio');

        DB::transaction(function () use ($applicabilityEngine, $criterios) {
            $this->seedDonLucho($applicabilityEngine, $criterios);
            $this->seedDonaMaria($applicabilityEngine, $criterios);
            $this->seedComercianteNuevo();
        });

        $this->command?->newLine();
        $this->command?->info('======================================================================');
        $this->command?->info('   DEMO WALKTHROUGH SEEDER - USUARIOS LISTOS PARA PROBAR EN VIVO     ');
        $this->command?->info('======================================================================');
        $this->command?->info('Contraseña estándar para todas las cuentas: password123');
        $this->command?->newLine();
        $this->command?->info('1. DON LUCHO (Caso 100% Conforme y Sellado con SHA-256):');
        $this->command?->line('   - Correo:       donlucho@huancayo.pe');
        $this->command?->line('   - Local:        Pollería El Brasero (El Tambo, 145 m², con GLP)');
        $this->command?->line('   - Semáforo:     VERDE (100% Cumplimiento, 0 observaciones)');
        $this->command?->line('   - Sirve para:   Descargar los 4 Anexos CENEPRED en A4, copiar hash SHA-256');
        $this->command?->line('                   y verificar el semáforo verde en el Dashboard.');
        $this->command?->newLine();
        $this->command?->info('2. DOÑA MARÍA (Caso con Observaciones Pendientes de Subsanar):');
        $this->command?->line('   - Correo:       donamaria@huancayo.pe');
        $this->command?->line('   - Local:        Minimarket El Carmen (Huancayo Cercado, 85 m²)');
        $this->command?->line('   - Semáforo:     ÁMBAR (80% Cumplimiento, 2 observaciones técnicas)');
        $this->command?->line('   - Pendientes:   Extintor PQS vencido (CRIT-01) y cables mellizos (CRIT-07)');
        $this->command?->line('   - Sirve para:   Probar botón "Subsanar (2)", modal de carga de fotos/evidencias');
        $this->command?->line('                   y enlace al Directorio de Aliados Técnicos homologados.');
        $this->command?->newLine();
        $this->command?->info('3. COMERCIANTE NUEVO (Sin Locales Registrados):');
        $this->command?->line('   - Correo:       nuevo@huancayo.pe');
        $this->command?->line('   - Locales:      0 registrados (Estado vacío interactivo)');
        $this->command?->line('   - Sirve para:   Probar el botón "+ Nueva Autoevaluación" e iniciar el flujo');
        $this->command?->line('                   preventivo paso a paso desde cero.');
        $this->command?->info('======================================================================');
        $this->command?->newLine();
    }

    /**
     * Usuario 1: Don Lucho Palomino (Pollería El Brasero) - 100% Conforme y Sellado.
     */
    private function seedDonLucho(ApplicabilityEngineService $applicabilityEngine, $criterios): void
    {
        $user = User::updateOrCreate(
            ['email' => 'donlucho@huancayo.pe'],
            [
                'name' => 'Don Lucho Palomino Huamán',
                'telefono' => '964123456',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Limpiar autoevaluaciones previas para reseteo limpio
        Autoevaluacion::where('user_id', $user->id)->get()->each->delete();

        $uuid = 'c8b9d3e4-5f6a-4b1c-8d2e-3a4b5c6d7e8f';
        $caracteristicas = [
            'usa_glp' => true,
            'galones_glp' => 120.0,
            'tiene_equipos_fritura' => true,
            'tiene_escaleras' => false,
            'tiene_estanterias_altas' => false,
        ];

        // Construir detalle del checklist (11 aplicables en CUMPLE, 2 NO_APLICA)
        $detalleChecklist = [];
        foreach ($criterios as $cod => $criterio) {
            $aplica = ! in_array($cod, ['CRIT-11', 'CRIT-13'], true);
            $detalleChecklist[] = [
                'codigo' => $cod,
                'nombre' => $criterio->titulo,
                'norma' => $criterio->norma_base,
                'es_critico' => $criterio->riesgo_asociado === 'ALTO',
                'cumple' => $aplica,
                'estado' => $aplica ? 'CUMPLE' : 'NO_APLICA',
                'observacion' => $aplica ? 'Conforme a inspección preventiva.' : 'No aplica por giro y características.',
            ];
        }

        $autoevaluacion = Autoevaluacion::create([
            'user_id' => $user->id,
            'uuid_trazabilidad' => $uuid,
            'codigo_acceso' => 'BRASERO-2026',
            'estado' => Autoevaluacion::ESTADO_REGISTRADA,
            'registrada_at' => now()->subDays(2),
            'nombre_comercio' => 'Pollería El Brasero',
            'funcion_economica' => 'Encuentro',
            'ruc' => '10458923411',
            'distrito' => 'El Tambo',
            'sector_huancayo' => 'El Tambo - Av. Mariscal Castilla',
            'direccion' => 'Av. Mariscal Castilla 1240, El Tambo',
            'referencia' => 'Frente al Parque Bolognesi',
            'area_m2' => 145.0,
            'pisos' => 1,
            'aforo' => 48,
            'usa_glp' => true,
            'galones_glp' => 120.0,
            'tiene_equipos_fritura' => true,
            'tiene_escaleras' => false,
            'tiene_estanterias_altas' => false,
            'tipo_tramite' => 'EX_ANTE',
            'nivel_riesgo' => 'ALTO_MUY_ALTO',
            'porcentaje_cumplimiento' => 100.0,
            'semaforo' => 'VERDE',
            'total_condiciones_evaluadas' => 11,
            'total_cumple_declarado' => 11,
            'total_pendiente_atender' => 0,
            'total_por_revisar' => 0,
            'total_no_aplica' => 2,
            'caracteristicas_declaradas' => $caracteristicas,
            'detalle_checklist' => $detalleChecklist,
        ]);

        // Registrar respuestas normalizadas en la tabla relacional
        foreach ($criterios as $cod => $criterio) {
            $aplica = ! in_array($cod, ['CRIT-11', 'CRIT-13'], true);
            RespuestaAutoevaluacion::create([
                'autoevaluacion_id' => $autoevaluacion->id,
                'criterio_id' => $criterio->id,
                'estado_respuesta' => $aplica ? 'CUMPLE_DECLARADO' : 'NO_APLICA',
                'notas_ciudadano' => $aplica ? 'Inspección técnica interna conforme.' : null,
            ]);
        }

        // Generar el snapshot canónico y hash criptográfico SHA-256
        $payloadCanonico = $applicabilityEngine->generarPayloadCanonico($autoevaluacion);
        $applicabilityEngine->normalizarArrayDeterminista($payloadCanonico);
        $jsonCanonico = (string) json_encode($payloadCanonico, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $hashIntegridad = hash('sha256', $jsonCanonico);

        $autoevaluacion->update([
            'payload_canonico' => $payloadCanonico,
            'hash_integridad' => $hashIntegridad,
        ]);

        // Simulación de revisión previa 100% aprobada
        $detalleRevision = [];
        foreach ($criterios as $cod => $criterio) {
            if (! in_array($cod, ['CRIT-11', 'CRIT-13'], true)) {
                $detalleRevision[$cod] = true;
            }
        }

        SimulacionRevision::create([
            'autoevaluacion_id' => $autoevaluacion->id,
            'codigo_revision' => 'PREV-2026-ITSE-001',
            'total_observaciones' => 0,
            'porcentaje_revision' => 100.0,
            'metrica_gap' => 0.0,
            'resultado' => 'SIN_OBSERVACIONES',
            'detalle_revision' => $detalleRevision,
        ]);
    }

    /**
     * Usuario 2: Doña María Quispe (Minimarket El Carmen) - Con 2 Observaciones Pendientes.
     */
    private function seedDonaMaria(ApplicabilityEngineService $applicabilityEngine, $criterios): void
    {
        $user = User::updateOrCreate(
            ['email' => 'donamaria@huancayo.pe'],
            [
                'name' => 'Doña María Quispe Gómez',
                'telefono' => '954987654',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Limpiar autoevaluaciones previas
        Autoevaluacion::where('user_id', $user->id)->get()->each->delete();

        $uuid = 'b1ffcd88-8b1a-4de7-aa5c-5aa8ac271b22';
        $caracteristicas = [
            'usa_glp' => false,
            'galones_glp' => null,
            'tiene_equipos_fritura' => false,
            'tiene_escaleras' => false,
            'tiene_estanterias_altas' => true,
        ];

        // Códigos observados: CRIT-01 (Extintor) y CRIT-07 (Cables eléctricos expuestos)
        $codigosObservados = ['CRIT-01', 'CRIT-07'];
        $codigosNoAplican = ['CRIT-02A', 'CRIT-10', 'CRIT-11']; // Sin freidora, sin GLP, sin escaleras

        $detalleChecklist = [];
        foreach ($criterios as $cod => $criterio) {
            $noAplica = in_array($cod, $codigosNoAplican, true);
            $observado = in_array($cod, $codigosObservados, true);

            $estado = $noAplica ? 'NO_APLICA' : ($observado ? 'NO_CUMPLE' : 'CUMPLE');
            $cumple = ! $noAplica && ! $observado;

            $obs = null;
            if ($cod === 'CRIT-01') {
                $obs = 'Extintor portátil PQS con carga vencida y aguja en franja roja (despresurizado).';
            } elseif ($cod === 'CRIT-07') {
                $obs = 'Presencia de cable mellizo suelto sin canaleta sobre anaqueles metálicos de abarrotes.';
            }

            $detalleChecklist[] = [
                'codigo' => $cod,
                'nombre' => $criterio->titulo,
                'norma' => $criterio->norma_base,
                'es_critico' => $criterio->riesgo_asociado === 'ALTO',
                'cumple' => $cumple,
                'estado' => $estado,
                'observacion' => $obs,
            ];
        }

        $autoevaluacion = Autoevaluacion::create([
            'user_id' => $user->id,
            'uuid_trazabilidad' => $uuid,
            'codigo_acceso' => 'CARMEN-2026',
            'estado' => Autoevaluacion::ESTADO_REGISTRADA,
            'registrada_at' => now()->subDays(1),
            'nombre_comercio' => 'Minimarket El Carmen',
            'funcion_economica' => 'Comercio',
            'ruc' => '10204567891',
            'distrito' => 'Huancayo',
            'sector_huancayo' => 'Huancayo Cercado - Jr. Puno',
            'direccion' => 'Jr. Puno 450, Huancayo Cercado',
            'referencia' => 'A media cuadra de la Plaza Constitución',
            'area_m2' => 85.0,
            'pisos' => 1,
            'aforo' => 15,
            'usa_glp' => false,
            'galones_glp' => null,
            'tiene_equipos_fritura' => false,
            'tiene_escaleras' => false,
            'tiene_estanterias_altas' => true,
            'tipo_tramite' => 'EX_POST',
            'nivel_riesgo' => 'BAJO_MEDIO',
            'porcentaje_cumplimiento' => 80.0,
            'semaforo' => 'AMBAR',
            'total_condiciones_evaluadas' => 10,
            'total_cumple_declarado' => 8,
            'total_pendiente_atender' => 2,
            'total_por_revisar' => 0,
            'total_no_aplica' => 3,
            'caracteristicas_declaradas' => $caracteristicas,
            'detalle_checklist' => $detalleChecklist,
        ]);

        // Guardar respuestas en tabla relacional
        foreach ($criterios as $cod => $criterio) {
            $noAplica = in_array($cod, $codigosNoAplican, true);
            $observado = in_array($cod, $codigosObservados, true);

            $estado = $noAplica ? 'NO_APLICA' : ($observado ? 'PENDIENTE_ATENDER' : 'CUMPLE_DECLARADO');

            RespuestaAutoevaluacion::create([
                'autoevaluacion_id' => $autoevaluacion->id,
                'criterio_id' => $criterio->id,
                'estado_respuesta' => $estado,
                'notas_ciudadano' => $observado ? 'Cotizando recarga y adecuación con técnico electricista.' : 'Conforme.',
            ]);
        }

        // Generar hash canónico SHA-256
        $payloadCanonico = $applicabilityEngine->generarPayloadCanonico($autoevaluacion);
        $applicabilityEngine->normalizarArrayDeterminista($payloadCanonico);
        $jsonCanonico = (string) json_encode($payloadCanonico, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $hashIntegridad = hash('sha256', $jsonCanonico);

        $autoevaluacion->update([
            'payload_canonico' => $payloadCanonico,
            'hash_integridad' => $hashIntegridad,
        ]);

        // Simulación de revisión previa con observaciones
        $detalleRevision = [];
        foreach ($criterios as $cod => $criterio) {
            if (! in_array($cod, $codigosNoAplican, true)) {
                $detalleRevision[$cod] = ! in_array($cod, $codigosObservados, true);
            }
        }

        $revision = SimulacionRevision::create([
            'autoevaluacion_id' => $autoevaluacion->id,
            'codigo_revision' => 'PREV-2026-ITSE-002',
            'total_observaciones' => 2,
            'porcentaje_revision' => 80.0,
            'metrica_gap' => 20.0,
            'resultado' => 'CON_OBSERVACIONES',
            'detalle_revision' => $detalleRevision,
        ]);

        // Crear las 2 subsanaciones pendientes en estado inicial PENDIENTE
        Subsanacion::create([
            'simulacion_revision_id' => $revision->id,
            'codigo_item' => 'CRIT-01',
            'descripcion' => 'Recarga y certificación anual de extintor PQS de 6kg con tarjeta de control y precinto nuevo.',
            'estado' => 'PENDIENTE',
            'observacion' => 'Manómetro en franja roja, carga vencida el mes anterior.',
            'notas_ciudadano' => 'Pendiente de coordinar con proveedor del Directorio de Aliados.',
        ]);

        Subsanacion::create([
            'simulacion_revision_id' => $revision->id,
            'codigo_item' => 'CRIT-07',
            'descripcion' => 'Retiro de cable mellizo y canalización con canaletas adosadas de PVC libres de empalmes expuestos.',
            'estado' => 'PENDIENTE',
            'observacion' => 'Empalmes expuestos y cable mellizo sobre estante metálico de conservas.',
            'notas_ciudadano' => 'Electricista visitará el local este sábado.',
        ]);
    }

    /**
     * Usuario 3: Comerciante Nuevo - Sin Locales Registrados.
     */
    private function seedComercianteNuevo(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'nuevo@huancayo.pe'],
            [
                'name' => 'Comerciante Emprendedor Huancayo',
                'telefono' => '964555888',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Asegurar que no tenga locales
        Autoevaluacion::where('user_id', $user->id)->get()->each->delete();
    }
}
