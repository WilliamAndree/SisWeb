<?php

namespace Database\Seeders;

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use App\Models\Subsanacion;
use App\Models\User;
use App\Services\ApplicabilityEngineService;
use App\Services\Evaluacion\SubsanacionSyncService;
use App\Services\ItseRiskService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Datos de DEMOSTRACIÓN para el módulo de reportes de impacto.
 *
 * Registra locales ficticios de Huancayo, El Tambo y Chilca a lo largo de seis meses
 * usando el propio motor del sistema: misma aplicabilidad de condiciones, mismo sellado
 * (payload canónico + SHA-256) y el mismo servicio de correcciones. Así los reportes
 * leen registros reales de la base de datos, no números escritos a mano.
 *
 * Todos llevan código DEMO-xxxx y pertenecen a demo.reportes@checkitse.local, para que
 * el reporte pueda separarlos de los registros de usuarios reales (filtro "Origen").
 * Es determinista (semilla fija) e idempotente: al volver a ejecutarlo reemplaza su lote.
 */
class DemoImpactoSeeder extends Seeder
{
    public const PREFIJO = 'DEMO-';

    public const CORREO = 'demo.reportes@checkitse.local';

    private const TOTAL_LOCALES = 42;

    /** Giros más comunes en Huancayo con su peso relativo y un nombre de ejemplo. */
    private const GIROS = [
        ['Comercio', 5, ['Bodega', 'Minimarket', 'Botica', 'Bazar', 'Ferretería', 'Librería']],
        ['Encuentro', 3, ['Pollería', 'Restaurante', 'Cevichería', 'Cafetería']],
        ['Salud', 1, ['Consultorio dental', 'Laboratorio clínico']],
        ['Educacion', 1, ['Academia', 'Nido']],
        ['Oficinas', 1, ['Estudio contable', 'Agencia de viajes']],
    ];

    private const DISTRITOS = [
        'Huancayo' => ['Jr. Puno', 'Av. Giráldez', 'Jr. Ancash', 'Calle Real'],
        'El Tambo' => ['Av. Mariscal Castilla', 'Av. Huancavelica', 'Jr. Julio Sumar'],
        'Chilca' => ['Av. 9 de Diciembre', 'Jr. Leoncio Prado', 'Av. Ferrocarril'],
    ];

    /** Probabilidad de que cada condición falte al evaluar (las más comunes en la práctica). */
    private const PROBABILIDAD_FALTA = [
        'CRIT-01' => 0.45, // Extintor
        'CRIT-02B' => 0.40, // Señalización
        'CRIT-05' => 0.38, // Pozo a tierra
        'CRIT-06' => 0.30, // Tablero y diferencial
        'CRIT-07' => 0.28, // Cables
        'CRIT-08' => 0.42, // Luces de emergencia
        'CRIT-13' => 0.33, // Estanterías ancladas
    ];

    /** Estado del generador pseudoaleatorio con semilla fija: los datos de demostración son reproducibles. */
    private int $semilla = 2026;

    /**
     * Número entero entre $minimo y $maximo con un generador congruencial lineal de semilla fija.
     * No es criptográfico ni necesita serlo: solo reparte datos ficticios (distritos, nombres, fechas).
     */
    private function azar(int $minimo, int $maximo): int
    {
        $this->semilla = ($this->semilla * 1103515245 + 12345) & 0x7FFFFFFF;

        return $minimo + ($this->semilla % ($maximo - $minimo + 1));
    }

    public function run(): void
    {
        if (CriterioNormativo::count() === 0) {
            $this->call(NormativaCatalogSeeder::class);
        }
        $motor = app(ApplicabilityEngineService::class);
        $riesgo = app(ItseRiskService::class);
        $correcciones = app(SubsanacionSyncService::class);
        $criterios = CriterioNormativo::where('activo', true)->get()->keyBy('codigo_criterio');

        $usuario = User::updateOrCreate(
            ['email' => self::CORREO],
            ['name' => 'Datos de demostración', 'password' => Hash::make(Str::random(32)), 'tipo_cuenta' => User::TIPO_CLIENTE],
        );

        DB::transaction(function () use ($usuario, $motor, $riesgo, $correcciones, $criterios) {
            Autoevaluacion::where('codigo_acceso', 'like', self::PREFIJO.'%')->get()->each->delete();

            for ($i = 1; $i <= self::TOTAL_LOCALES; $i++) {
                // Más locales en los meses recientes: la plataforma va ganando usuarios.
                $diasAtras = (int) round(180 * (1 - sqrt($this->azar(0, 1000) / 1000)));
                $momento = Carbon::now()->subDays($diasAtras)->setTime($this->azar(8, 19), $this->azar(0, 59));
                Carbon::setTestNow($momento);

                $evaluacion = $this->crearLocal($i, $usuario, $motor, $criterios);
                $this->sellar($evaluacion, $motor, $riesgo);

                // Corrige parte de lo que le faltaba, días después de evaluar.
                Carbon::setTestNow($momento->copy()->addDays($this->azar(2, 25)));
                $this->corregirParte($evaluacion, $correcciones);
                Carbon::setTestNow();
            }
        });

        $this->command?->info('Locales de demostración: '.self::TOTAL_LOCALES.' (código '.self::PREFIJO.'xxxx).');
    }

    /** @param  Collection<string, CriterioNormativo>  $criterios */
    private function crearLocal(int $numero, User $usuario, ApplicabilityEngineService $motor, $criterios): Autoevaluacion
    {
        [$giro, , $nombres] = $this->elegirGiro();
        $distrito = array_keys(self::DISTRITOS)[$this->azar(0, 2)];
        $calles = self::DISTRITOS[$distrito];
        $area = $this->azar(25, 160);
        $caracteristicas = [
            'aforo' => max(5, (int) round($area / 4)),
            'area_m2' => $area,
            'galones_glp' => $giro === 'Encuentro' ? $this->azar(20, 80) : null,
            'pisos' => $this->azar(1, 10) > 8 ? 2 : 1,
            'tiene_equipos_fritura' => $giro === 'Encuentro',
            'tiene_escaleras' => $this->azar(1, 10) > 7,
            'tiene_estanterias_altas' => in_array($giro, ['Comercio', 'Educacion'], true),
            'usa_caldero' => false,
            'usa_glp' => $giro === 'Encuentro',
            'usa_liquidos_inflamables' => false,
        ];

        $evaluacion = Autoevaluacion::create([
            'user_id' => $usuario->id,
            'uuid_trazabilidad' => (string) Str::uuid(),
            'codigo_acceso' => self::PREFIJO.str_pad((string) $numero, 4, '0', STR_PAD_LEFT),
            'estado' => Autoevaluacion::ESTADO_INICIADA,
            'nombre_comercio' => $nombres[$this->azar(0, count($nombres) - 1)].' '.$this->apellido(),
            'funcion_economica' => $giro,
            'distrito' => $distrito,
            'sector_huancayo' => $distrito,
            'direccion' => $calles[$this->azar(0, count($calles) - 1)].' '.$this->azar(100, 1500).', '.$distrito,
            'area_m2' => $area,
            'pisos' => $caracteristicas['pisos'],
            'aforo' => $caracteristicas['aforo'],
            'usa_glp' => $caracteristicas['usa_glp'],
            'galones_glp' => $caracteristicas['galones_glp'],
            'tiene_equipos_fritura' => $caracteristicas['tiene_equipos_fritura'],
            'tiene_escaleras' => $caracteristicas['tiene_escaleras'],
            'tiene_estanterias_altas' => $caracteristicas['tiene_estanterias_altas'],
            'caracteristicas_declaradas' => $caracteristicas,
            'porcentaje_cumplimiento' => 0,
            'semaforo' => 'PENDIENTE',
            'detalle_checklist' => [],
        ]);

        // Responde solo las condiciones que el motor considera aplicables a este local.
        foreach ($motor->generarChecklistDinamico($evaluacion)['criterios'] as $item) {
            $criterio = $criterios->get($item['codigo']);
            if (! $criterio) {
                continue;
            }
            $falta = $this->azar(0, 100) / 100 < (self::PROBABILIDAD_FALTA[$item['codigo']] ?? 0.15);
            $estado = $falta
                ? ($this->azar(1, 10) > 8 ? ApplicabilityEngineService::ESTADO_POR_REVISAR : ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER)
                : ApplicabilityEngineService::ESTADO_CUMPLE_DECLARADO;
            RespuestaAutoevaluacion::create([
                'autoevaluacion_id' => $evaluacion->id,
                'criterio_id' => $criterio->id,
                'estado_respuesta' => $estado,
                'notas_ciudadano' => null,
            ]);
        }

        return $evaluacion;
    }

    /** Mismo cierre que EvaluacionController::finalizar: foto sellada, hash y totales. */
    private function sellar(Autoevaluacion $evaluacion, ApplicabilityEngineService $motor, ItseRiskService $riesgo): void
    {
        $evaluacion->unsetRelation('respuestas');
        $payload = $motor->generarPayloadCanonico($evaluacion);
        $motor->normalizarArrayDeterminista($payload);
        $conteos = $motor->generarResumenDescriptivo($evaluacion)['conteos'];
        $metricas = $riesgo->calcularMetricasCumplimiento((int) $conteos['total_criterios_aplicables'], (int) $conteos['total_cumple_declarado']);

        $evaluacion->update([
            'estado' => Autoevaluacion::ESTADO_REGISTRADA,
            'registrada_at' => now(),
            'payload_canonico' => $payload,
            'hash_integridad' => $motor->calcularHashIntegridad($evaluacion),
            'porcentaje_cumplimiento' => $metricas['porcentaje'],
            'semaforo' => $metricas['semaforo'],
            'total_condiciones_evaluadas' => $conteos['total_criterios_aplicables'],
            'total_cumple_declarado' => $conteos['total_cumple_declarado'],
            'total_pendiente_atender' => $conteos['total_pendiente_atender'],
            'total_por_revisar' => $conteos['total_por_revisar'],
            'total_no_aplica' => $conteos['total_no_aplica'],
        ]);
    }

    private function corregirParte(Autoevaluacion $evaluacion, SubsanacionSyncService $correcciones): void
    {
        $pendientes = $evaluacion->respuestas()
            ->with('criterioNormativo')
            ->whereIn('estado_respuesta', [ApplicabilityEngineService::ESTADO_PENDIENTE_ATENDER, ApplicabilityEngineService::ESTADO_POR_REVISAR])
            ->get();

        foreach ($pendientes as $respuesta) {
            if ($this->azar(1, 100) > 64) {
                continue; // Esta condición sigue pendiente.
            }
            Subsanacion::create([
                'autoevaluacion_id' => $evaluacion->id,
                'criterio_id' => $respuesta->criterio_id,
                'codigo_item' => $respuesta->criterioNormativo->codigo_criterio,
                'descripcion' => $this->azar(1, 10) > 4 ? 'Lo compré a un aliado de CheckITSE y ya está instalado.' : 'Lo resolví por mi cuenta.',
                'estado' => SubsanacionSyncService::ESTADO_SUBSANADO,
                'fecha_subsanacion' => now(),
            ]);
        }

        $correcciones->sincronizar($evaluacion->fresh());
    }

    /** @return array{0: string, 1: int, 2: array<int, string>} */
    private function elegirGiro(): array
    {
        $total = array_sum(array_column(self::GIROS, 1));
        $valor = $this->azar(1, $total);
        foreach (self::GIROS as $giro) {
            $valor -= $giro[1];
            if ($valor <= 0) {
                return $giro;
            }
        }

        return self::GIROS[0];
    }

    private function apellido(): string
    {
        $apellidos = ['Quispe', 'Huamán', 'Rojas', 'Ccanto', 'Poma', 'Soto', 'Yupanqui', 'Mendoza', 'Vilca', 'Huaynate', 'Rivera', 'Ñaupari'];

        return $apellidos[$this->azar(0, count($apellidos) - 1)];
    }
}
