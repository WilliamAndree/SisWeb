<?php

namespace Tests\Support;

use App\Models\AnalisisEvidencia;
use App\Models\Autoevaluacion;
use App\Models\ResultadoAnalisisEvidencia;
use App\Models\Subsanacion;
use App\Models\SugerenciaEspacial;
use App\Models\User;
use App\Services\Espacio\GestionEspacialService;
use App\Services\Espacio\SugerenciaEspacialService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class EspacioFixture
{
    public static function cadena(int $cantidad): array
    {
        $geometria = self::geometria();
        $nivel = &$geometria['niveles'][0];
        $base = $nivel['ambientes'][0];
        $nivel['ambientes'] = [];
        $nivel['conectores'][0]['ambiente_origen_codigo'] = 'N0';
        $nivel['conectores'][0]['posicion_x'] = 0;
        $nivel['conectores'][0]['posicion_y'] = 2;
        for ($i = 0; $i < $cantidad; $i++) {
            $nivel['ambientes'][] = array_replace($base, ['codigo' => 'N'.$i, 'posicion_x' => 4 * $i]);
            if ($i > 0) {
                $nivel['conectores'][] = [
                    'tipo' => 'PUERTA_INTERIOR', 'conduce_a_salida_publica' => false,
                    'ambiente_origen_codigo' => 'N'.($i - 1), 'ambiente_destino_codigo' => 'N'.$i,
                    'posicion_x' => 4 * $i, 'posicion_y' => 2,
                ];
            }
        }

        return $geometria;
    }

    public static function sugerencia(array $contexto): SugerenciaEspacial
    {
        Storage::fake('local');
        $path = 'evidencias/sintetica.png';
        $bytes = GeminiFixture::imagen();
        Storage::disk('local')->put($path, $bytes);
        $evaluacion = $contexto['evaluacion'];
        $sub = Subsanacion::create([
            'autoevaluacion_id' => $evaluacion->id, 'codigo_item' => 'CRIT-01', 'estado' => 'PENDIENTE',
            'descripcion' => 'Fotografía sintética', 'evidencia_url' => $path, 'hash_sha256' => hash('sha256', $bytes),
        ]);
        $analisis = AnalisisEvidencia::create([
            'uuid_analisis' => (string) Str::uuid(), 'autoevaluacion_id' => $evaluacion->id,
            'subsanacion_id' => $sub->id, 'estado_analisis' => 'COMPLETADO',
            'hash_evidencia_analizada' => $sub->hash_sha256, 'modelo_solicitado' => 'simulado',
        ]);
        ResultadoAnalisisEvidencia::create([
            'analisis_evidencia_id' => $analisis->id, 'criterio_codigo' => 'CRIT-01',
            'calidad_imagen' => 'OPTIMA', 'relevancia_evidencia' => 'DIRECTAMENTE_PERTINENTE',
            'nivel_incertidumbre' => 'BAJO', 'elementos_detectados' => GeminiFixture::datos()['detected_elements'],
        ]);

        return app(SugerenciaEspacialService::class)->obtenerSugerencias($evaluacion)->firstOrFail();
    }

    public static function geometria(): array
    {
        return ['niveles' => [[
            'numero_piso' => 1, 'nombre' => 'Piso 1',
            'ambientes' => [[
                'codigo' => 'A', 'nombre' => 'Local', 'ancho_metros' => 4, 'largo_metros' => 4,
                'posicion_x' => 0, 'posicion_y' => 0,
            ]],
            'conectores' => [[
                'tipo' => 'PUERTA_SALIDA', 'ancho_metros' => 1, 'conduce_a_salida_publica' => true,
                'ambiente_origen_codigo' => 'A', 'posicion_x' => 2, 'posicion_y' => 0,
            ]],
        ]]];
    }

    public static function evaluacion(): Autoevaluacion
    {
        return Autoevaluacion::create([
            'user_id' => User::factory()->create()->id,
            'uuid_trazabilidad' => (string) Str::uuid(), 'nombre_comercio' => 'Local espacial sintético',
            'estado' => 'REGISTRADA', 'porcentaje_cumplimiento' => 0, 'semaforo' => 'PENDIENTE',
            'detalle_checklist' => [], 'payload_canonico' => ['dato' => 1],
            'hash_integridad' => hash('sha256', '{"dato":1}'),
        ]);
    }

    public static function persistir(?array $geometria = null): array
    {
        $evaluacion = self::evaluacion();
        $service = app(GestionEspacialService::class);
        $plano = $service->obtenerOInicializarPlano($evaluacion);
        $version = $service->crearOActualizarVersion($plano, $geometria ?? self::geometria());

        return compact('evaluacion', 'plano', 'version');
    }
}
