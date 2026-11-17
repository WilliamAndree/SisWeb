<?php

namespace App\Services\Traits;

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\RespuestaAutoevaluacion;
use Illuminate\Support\Collection;

trait ApplicabilityEvaluationHelpersTrait
{
    /**
     * Evalúa un criterio condicional gobernado por una declaración booleana nullable.
     *
     * @param  array{campo: string, motivo_false: string, motivo_true: string, motivo_null: string}  $regla
     * @return array<string, mixed>
     */
    private function evaluarCriterioCondicional(CriterioNormativo $criterio, ?bool $valorDeclarado, array $regla): array
    {
        if ($valorDeclarado === false) {
            return $this->construirResultadoEvaluacion($criterio, false, self::ESTADO_NO_APLICA, false, $regla['motivo_false']);
        }

        if ($valorDeclarado === true) {
            return $this->construirResultadoEvaluacion($criterio, true, null, false, $regla['motivo_true']);
        }

        return $this->construirResultadoEvaluacion($criterio, null, null, true, $regla['motivo_null']);
    }

    /**
     * Construye la estructura de resultado de evaluación de aplicabilidad de un criterio.
     *
     * @return array<string, mixed>
     */
    private function construirResultadoEvaluacion(
        CriterioNormativo $criterio,
        ?bool $aplicable,
        ?string $estadoSugerido,
        bool $requiereInformacion,
        string $motivo,
        ?string $tipoCriterioOverride = null
    ): array {
        return [
            'codigo' => $criterio->codigo_criterio,
            'criterio_id' => $criterio->id,
            'titulo' => $criterio->titulo,
            'tipo_criterio' => $tipoCriterioOverride ?? $criterio->tipo_criterio,
            'activo' => true,
            'aplicable' => $aplicable,
            'estado_sugerido' => $estadoSugerido,
            'requiere_informacion' => $requiereInformacion,
            'motivo' => $motivo,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function construirItemCriterioEvaluable(CriterioNormativo $criterio, ?RespuestaAutoevaluacion $respuestaPrevia): array
    {
        return [
            'codigo' => $criterio->codigo_criterio,
            'criterio_id' => $criterio->id,
            'titulo' => $criterio->titulo,
            'descripcion' => $criterio->que_observar ?? $criterio->titulo,
            'categoria' => $criterio->categoria,
            'pregunta_ciudadana' => $criterio->pregunta_ciudadana,
            'que_observar' => $criterio->que_observar,
            'accion_mejora_orientativa' => $criterio->accion_mejora_orientativa,
            'tipo_criterio' => $criterio->tipo_criterio,
            'norma_base' => $criterio->norma_base,
            'articulo_referencia' => $criterio->articulo_referencia,
            'orden' => $criterio->orden,
            'aplicable' => true,
            'requiere_informacion' => false,
            'estado' => $respuestaPrevia?->estado_respuesta,
            'notas' => $respuestaPrevia?->notas_ciudadano,
            'opciones_respuesta' => self::RESPUESTAS_CIUDADANAS_PERMITIDAS,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function construirItemCriterioNoAplica(CriterioNormativo $criterio, string $motivo): array
    {
        return [
            'codigo' => $criterio->codigo_criterio,
            'criterio_id' => $criterio->id,
            'titulo' => $criterio->titulo,
            'categoria' => $criterio->categoria,
            'tipo_criterio' => $criterio->tipo_criterio,
            'norma_base' => $criterio->norma_base,
            'articulo_referencia' => $criterio->articulo_referencia,
            'orden' => $criterio->orden,
            'aplicable' => false,
            'requiere_informacion' => false,
            'estado' => self::ESTADO_NO_APLICA,
            'motivo' => $motivo,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function construirItemInformacionPendiente(CriterioNormativo $criterio, string $motivo, ?string $estadoActual): array
    {
        $variableFaltante = match ($criterio->codigo_criterio) {
            'CRIT-02A' => 'tiene_equipos_fritura',
            'CRIT-03', 'CRIT-10' => 'usa_glp',
            'CRIT-11' => 'tiene_escaleras',
            'CRIT-13' => 'tiene_estanterias_altas',
            default => null,
        };

        return [
            'codigo' => $criterio->codigo_criterio,
            'criterio_id' => $criterio->id,
            'titulo' => $criterio->titulo,
            'categoria' => $criterio->categoria,
            'tipo_criterio' => $criterio->tipo_criterio,
            'norma_base' => $criterio->norma_base,
            'articulo_referencia' => $criterio->articulo_referencia,
            'orden' => $criterio->orden,
            'aplicable' => null,
            'requiere_informacion' => true,
            'variable_faltante' => $variableFaltante,
            'mensaje' => $motivo,
            'estado' => $estadoActual ?? null,
            'motivo' => $motivo,
        ];
    }

    /**
     * Normaliza los parámetros de contexto utilizando los campos canónicos del Paso 1 y Paso 2:
     * - usa_glp (?bool)
     * - tiene_equipos_fritura (?bool)
     * - tiene_escaleras (?bool)
     * - tiene_estanterias_altas (?bool)
     * Respetando rigurosamente que NULL ≠ false ≠ NO_APLICA.
     *
     * @param  Autoevaluacion|array<string, mixed>  $contexto
     * @return array<string, mixed>
     */
    private function normalizarContexto(Autoevaluacion|array $contexto): array
    {
        if ($contexto instanceof Autoevaluacion) {
            return [
                'area_m2' => $contexto->area_m2,
                'pisos' => $contexto->pisos,
                'aforo' => $contexto->aforo,
                'usa_glp' => $contexto->usa_glp,
                'usa_caldero' => $contexto->usa_caldero,
                'usa_liquidos_inflamables' => $contexto->usa_liquidos_inflamables,
                'tiene_equipos_fritura' => $contexto->tiene_equipos_fritura,
                'tiene_escaleras' => $contexto->tiene_escaleras,
                'tiene_estanterias_altas' => $contexto->tiene_estanterias_altas,
            ];
        }

        return [
            'area_m2' => isset($contexto['area_m2']) && $contexto['area_m2'] !== null ? (float) $contexto['area_m2'] : null,
            'pisos' => isset($contexto['pisos']) && $contexto['pisos'] !== null ? (int) $contexto['pisos'] : null,
            'aforo' => isset($contexto['aforo']) && $contexto['aforo'] !== null ? (int) $contexto['aforo'] : null,
            'usa_glp' => $this->extraerBooleanoNullable($contexto, 'usa_glp'),
            'usa_caldero' => $this->extraerBooleanoNullable($contexto, 'usa_caldero'),
            'usa_liquidos_inflamables' => $this->extraerBooleanoNullable($contexto, 'usa_liquidos_inflamables'),
            'tiene_equipos_fritura' => $this->extraerBooleanoNullable($contexto, 'tiene_equipos_fritura'),
            'tiene_escaleras' => $this->extraerBooleanoNullable($contexto, 'tiene_escaleras'),
            'tiene_estanterias_altas' => $this->extraerBooleanoNullable($contexto, 'tiene_estanterias_altas'),
        ];
    }

    /**
     * Extrae de forma segura un valor booleano o null desde un array de contexto,
     * examinando tanto la raíz como la clave interna 'caracteristicas_declaradas'.
     *
     * @param  array<string, mixed>  $contexto
     */
    private function extraerBooleanoNullable(array $contexto, string $clave): ?bool
    {
        if (array_key_exists($clave, $contexto)) {
            $val = $contexto[$clave];

            return $val !== null ? (bool) $val : null;
        }

        if (isset($contexto['caracteristicas_declaradas']) && is_array($contexto['caracteristicas_declaradas']) && array_key_exists($clave, $contexto['caracteristicas_declaradas'])) {
            $val = $contexto['caracteristicas_declaradas'][$clave];

            return $val !== null ? (bool) $val : null;
        }

        return null;
    }

    /**
     * Obtiene las respuestas guardadas indexadas por criterio_id si el contexto es un modelo persistido.
     *
     * @param  Autoevaluacion|array<string, mixed>  $contexto
     * @return Collection<int, RespuestaAutoevaluacion>
     */
    private function obtenerRespuestasIndexadas(Autoevaluacion|array $contexto): Collection
    {
        if (! ($contexto instanceof Autoevaluacion) || ! $contexto->exists) {
            return collect();
        }

        $respuestas = $contexto->relationLoaded('respuestas')
            ? $contexto->respuestas
            : $contexto->respuestas()->get();

        return $respuestas->keyBy('criterio_id');
    }

    /**
     * Recupera el snapshot histórico normalizado si la autoevaluación ya fue registrada.
     *
     * @return array<string, mixed>|null
     */
    private function obtenerSnapshotRegistrado(Autoevaluacion $autoevaluacion): ?array
    {
        if (! $autoevaluacion->estaRegistrada() || empty($autoevaluacion->payload_canonico)) {
            return null;
        }

        $snapshot = is_array($autoevaluacion->payload_canonico)
            ? $autoevaluacion->payload_canonico
            : (array) json_decode((string) $autoevaluacion->payload_canonico, true);

        $this->normalizarArrayDeterminista($snapshot);

        return $snapshot;
    }

    /**
     * Construye y ordena alfabéticamente la lista de criterios evaluados para el payload canónico.
     *
     * @return array<int, array{codigo: string, aplicabilidad: string, estado_declarado: string, notas: string|null}>
     */
    private function construirListaCriteriosCanonicos(Autoevaluacion $autoevaluacion): array
    {
        $evaluaciones = $this->evaluarAplicabilidad($autoevaluacion);
        $criteriosActivos = $this->getCriteriosActivos()->keyBy('codigo_criterio');
        $respuestasGuardadas = $this->obtenerRespuestasIndexadas($autoevaluacion);

        $criteriosList = [];

        foreach ($evaluaciones as $codigo => $eval) {
            $criterio = $criteriosActivos->get($codigo);
            if (! $criterio) {
                continue;
            }

            $respuesta = $respuestasGuardadas->get($criterio->id);
            $criteriosList[] = $this->formatearCriterioCanonico($codigo, $eval, $respuesta);
        }

        // Ordenamiento estricto de criterios por código alfabético
        usort($criteriosList, fn ($a, $b) => strcmp($a['codigo'], $b['codigo']));

        return $criteriosList;
    }

    /**
     * Formatea un criterio individual según su estado de aplicabilidad para el payload canónico.
     *
     * @param  array{aplicable: bool|null, motivo: string, campos_faltantes?: array<int, string>}  $eval
     * @return array{codigo: string, aplicabilidad: string, estado_declarado: string, notas: string|null}
     */
    private function formatearCriterioCanonico(string $codigo, array $eval, ?RespuestaAutoevaluacion $respuesta): array
    {
        if ($eval['aplicable'] === true) {
            return [
                'codigo' => $codigo,
                'aplicabilidad' => 'APLICA',
                'estado_declarado' => $respuesta?->estado_respuesta ?? 'SIN_RESPUESTA',
                'notas' => $this->limpiarTextoOpcional($respuesta?->notas_ciudadano),
            ];
        }

        if ($eval['aplicable'] === false) {
            return [
                'codigo' => $codigo,
                'aplicabilidad' => 'NO_APLICA',
                'estado_declarado' => self::ESTADO_NO_APLICA,
                'notas' => null,
            ];
        }

        return [
            'codigo' => $codigo,
            'aplicabilidad' => 'REQUIERE_INFORMACION',
            'estado_declarado' => 'SIN_INFORMACION',
            'notas' => null,
        ];
    }

    /**
     * Construye el bloque de datos del establecimiento para el payload canónico.
     *
     * @return array<string, string|null>
     */
    private function construirDatosEstablecimientoCanonico(Autoevaluacion $autoevaluacion): array
    {
        return [
            'nombre_comercio' => trim((string) $autoevaluacion->nombre_comercio),
            'ruc' => $this->limpiarTextoOpcional($autoevaluacion->ruc),
            'funcion_economica' => trim((string) $autoevaluacion->funcion_economica),
            'direccion' => $this->limpiarTextoOpcional($autoevaluacion->direccion),
            'referencia' => $this->limpiarTextoOpcional($autoevaluacion->referencia),
        ];
    }

    /**
     * Construye el bloque de características técnicas para el payload canónico.
     *
     * @return array<string, int|float|bool|null>
     */
    private function construirCaracteristicasCanonicas(Autoevaluacion $autoevaluacion): array
    {
        return [
            'aforo' => $this->aEnteroNullable($autoevaluacion->aforo),
            'area_m2' => $this->aDecimalNullable($autoevaluacion->area_m2),
            'galones_glp' => $this->aDecimalNullable($autoevaluacion->galones_glp),
            'pisos' => $this->aEnteroNullable($autoevaluacion->pisos),
            'tiene_equipos_fritura' => $this->aBooleanoNullable($autoevaluacion->tiene_equipos_fritura),
            'tiene_escaleras' => $this->aBooleanoNullable($autoevaluacion->tiene_escaleras),
            'tiene_estanterias_altas' => $this->aBooleanoNullable($autoevaluacion->tiene_estanterias_altas),
            'usa_caldero' => $this->aBooleanoNullable($autoevaluacion->usa_caldero),
            'usa_glp' => $this->aBooleanoNullable($autoevaluacion->usa_glp),
            'usa_liquidos_inflamables' => $this->aBooleanoNullable($autoevaluacion->usa_liquidos_inflamables),
        ];
    }

    /**
     * Limpia un texto opcional o retorna null si está vacío.
     */
    private function limpiarTextoOpcional(mixed $valor): ?string
    {
        return filled($valor) ? trim((string) $valor) : null;
    }

    /**
     * Convierte un valor escalar a entero o retorna null.
     */
    private function aEnteroNullable(mixed $valor): ?int
    {
        return $valor !== null ? (int) $valor : null;
    }

    /**
     * Convierte un valor escalar a decimal redondeado a 2 decimales o retorna null.
     */
    private function aDecimalNullable(mixed $valor): ?float
    {
        return $valor !== null ? round((float) $valor, 2) : null;
    }

    /**
     * Convierte un valor escalar a booleano o retorna null.
     */
    private function aBooleanoNullable(mixed $valor): ?bool
    {
        return $valor !== null ? (bool) $valor : null;
    }
}
