<?php

namespace App\Services;

use App\Models\Autoevaluacion;
use App\Models\CriterioNormativo;
use App\Models\EventoProveedor;
use App\Services\Evaluacion\SubsanacionSyncService;
use Database\Seeders\DemoImpactoSeeder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Reportes de impacto: miden si CheckITSE ayuda a que los locales de Huancayo lleguen
 * preparados a su inspección ITSE. Todo se calcula con los registros de la base de datos.
 *
 * Indicadores principales:
 *  1. Locales evaluados en el periodo.
 *  2. Preparación al evaluar vs. preparación actual (antes / después de usar CheckITSE).
 *  3. Locales listos para la inspección (semáforo verde).
 *  4. Tasa de corrección: condiciones corregidas / condiciones que faltaban al evaluar.
 *  5. Contactos con proveedores por WhatsApp (el canal de la tienda de aliados).
 */
class ReportesImpactoService
{
    public function __construct(private readonly SubsanacionSyncService $correcciones) {}

    public const ORIGENES = ['todos', 'reales', 'demo'];

    public const ESTADOS = ['VERDE', 'AMBAR', 'ROJO'];

    /** Dominio de las cuentas de demostración (admin, proveedores y datos DEMO-). */
    public const DOMINIO_DEMO = '@checkitse.local';

    private const ETIQUETA_ESTADO = ['VERDE' => 'Listo', 'AMBAR' => 'Casi listo', 'ROJO' => 'Necesita atención'];

    /**
     * @param  array{desde?: ?string, hasta?: ?string, distrito?: ?string, giro?: ?string, estado?: ?string, origen?: ?string}  $entrada
     * @return array<string, mixed>
     */
    public function generar(array $entrada): array
    {
        $filtros = $this->normalizarFiltros($entrada);
        $locales = $this->consulta($filtros)->with('subsanaciones')->orderBy('registrada_at')->get();
        $filas = $locales->map(fn (Autoevaluacion $a): array => $this->fila($a));

        $faltabanAlInicio = $filas->sum('faltaban');
        $corregidas = $filas->sum('corregidas');
        $listos = $filas->where('estado', 'VERDE')->count();

        return [
            'filtros' => $filtros,
            'opciones' => $this->opciones(),
            'indicadores' => [
                'locales' => $filas->count(),
                'preparacion_inicial' => $this->promedio($filas->pluck('preparacion_inicial')),
                'preparacion_actual' => $this->promedio($filas->pluck('preparacion_actual')),
                'listos' => $listos,
                'porcentaje_listos' => $filas->isEmpty() ? 0.0 : round($listos * 100 / $filas->count(), 1),
                'faltaban_al_inicio' => $faltabanAlInicio,
                'corregidas' => $corregidas,
                'tasa_correccion' => $faltabanAlInicio === 0 ? 0.0 : round($corregidas * 100 / $faltabanAlInicio, 1),
                'dias_promedio_correccion' => $this->promedio($filas->pluck('dias_correccion')->filter(fn ($d) => $d !== null)),
                'contactos_whatsapp' => $this->contactosWhatsapp($filtros),
            ],
            'por_mes' => $this->porMes($filas, $filtros),
            'por_estado' => collect(self::ESTADOS)->map(fn (string $e): array => [
                'estado' => $e,
                'etiqueta' => self::ETIQUETA_ESTADO[$e],
                'locales' => $filas->where('estado', $e)->count(),
            ])->all(),
            'por_distrito' => $filas->groupBy('distrito')->map(fn (Collection $g, string $distrito): array => [
                'distrito' => $distrito,
                'locales' => $g->count(),
                'preparacion_inicial' => $this->promedio($g->pluck('preparacion_inicial')),
                'preparacion_actual' => $this->promedio($g->pluck('preparacion_actual')),
                'listos' => $g->where('estado', 'VERDE')->count(),
            ])->sortByDesc('locales')->values()->all(),
            'condiciones' => $this->condiciones($locales),
            'registros' => $filas->sortByDesc('fecha')->take(25)->values()->all(),
            'totales_origen' => [
                'reales' => $this->consulta([...$filtros, 'origen' => 'reales'])->count(),
                'demo' => $this->consulta([...$filtros, 'origen' => 'demo'])->count(),
            ],
        ];
    }

    /** Una fila por local, también usada para exportar a CSV. @return Collection<int, array<string, mixed>> */
    public function filasParaExportar(array $entrada): Collection
    {
        return $this->consulta($this->normalizarFiltros($entrada))->with('subsanaciones')->orderBy('registrada_at')->get()
            ->map(fn (Autoevaluacion $a): array => $this->fila($a));
    }

    /**
     * @param  array<string, mixed>  $entrada
     * @return array{desde: string, hasta: string, distrito: string, giro: string, estado: string, origen: string}
     */
    private function normalizarFiltros(array $entrada): array
    {
        $fecha = function (?string $valor, Carbon $porDefecto): Carbon {
            try {
                return $valor ? Carbon::parse($valor) : $porDefecto;
            } catch (\Throwable) {
                return $porDefecto;
            }
        };
        $desde = $fecha($entrada['desde'] ?? null, now()->subMonths(6)->startOfMonth())->startOfDay();
        $hasta = $fecha($entrada['hasta'] ?? null, now())->endOfDay();
        if ($desde->greaterThan($hasta)) {
            [$desde, $hasta] = [$hasta->copy()->startOfDay(), $desde->copy()->endOfDay()];
        }

        return [
            'desde' => $desde->toDateString(),
            'hasta' => $hasta->toDateString(),
            'distrito' => (string) ($entrada['distrito'] ?? ''),
            'giro' => (string) ($entrada['giro'] ?? ''),
            'estado' => in_array($entrada['estado'] ?? '', self::ESTADOS, true) ? (string) $entrada['estado'] : '',
            'origen' => in_array($entrada['origen'] ?? '', self::ORIGENES, true) ? (string) $entrada['origen'] : 'todos',
        ];
    }

    /** @param  array<string, string>  $filtros  @return Builder<Autoevaluacion> */
    private function consulta(array $filtros): Builder
    {
        return Autoevaluacion::query()
            ->where('estado', Autoevaluacion::ESTADO_REGISTRADA)
            ->whereBetween('registrada_at', [Carbon::parse($filtros['desde'])->startOfDay(), Carbon::parse($filtros['hasta'])->endOfDay()])
            ->when($filtros['distrito'] !== '', fn (Builder $q) => $q->where('distrito', $filtros['distrito']))
            ->when($filtros['giro'] !== '', fn (Builder $q) => $q->where('funcion_economica', $filtros['giro']))
            ->when($filtros['estado'] !== '', fn (Builder $q) => $q->where('semaforo', $filtros['estado']))
            ->when($filtros['origen'] === 'demo', fn (Builder $q) => $q->where('codigo_acceso', 'like', DemoImpactoSeeder::PREFIJO.'%'))
            ->when($filtros['origen'] === 'reales', fn (Builder $q) => $q->where(fn (Builder $r) => $r
                ->whereNull('codigo_acceso')
                ->orWhere('codigo_acceso', 'not like', DemoImpactoSeeder::PREFIJO.'%')));
    }

    /** @return array<string, mixed> */
    private function fila(Autoevaluacion $local): array
    {
        $inicial = $this->estadoInicial($local);
        $codigos = $this->correcciones->codigosCorregidos($local);
        $corregidas = $local->subsanaciones->where('estado', SubsanacionSyncService::ESTADO_SUBSANADO)->whereIn('codigo_item', $codigos);
        $ultimaCorreccion = $corregidas->max('fecha_subsanacion');

        return [
            'codigo' => $local->codigo_acceso,
            'nombre' => $local->nombre_comercio,
            'distrito' => $local->distrito ?: 'Sin distrito',
            'giro' => $local->funcion_economica,
            'fecha' => $local->registrada_at?->toDateString(),
            'aplicables' => $inicial['aplicables'],
            'faltaban' => $inicial['faltaban'],
            'corregidas' => $codigos->count(),
            'preparacion_inicial' => $inicial['preparacion'],
            'preparacion_actual' => round((float) $local->porcentaje_cumplimiento, 1),
            'estado' => $local->semaforo,
            'dias_correccion' => $ultimaCorreccion && $local->registrada_at
                ? (int) max(0, $local->registrada_at->startOfDay()->diffInDays(Carbon::parse($ultimaCorreccion)->startOfDay()))
                : null,
        ];
    }

    /**
     * Cómo estaba el local al evaluar, leído de su foto sellada (payload canónico).
     *
     * @return array{aplicables: int, faltaban: int, preparacion: float}
     */
    private function estadoInicial(Autoevaluacion $local): array
    {
        $criterios = collect(($local->payload_canonico ?? [])['criterios'] ?? [])
            ->filter(fn ($c): bool => is_array($c) && ($c['aplicabilidad'] ?? '') === 'APLICA');
        $aplicables = $criterios->count();
        $cumplian = $criterios->where('estado_declarado', 'CUMPLE_DECLARADO')->count();

        return [
            'aplicables' => $aplicables,
            'faltaban' => $aplicables - $cumplian,
            'preparacion' => $aplicables === 0 ? 0.0 : round($cumplian * 100 / $aplicables, 1),
        ];
    }

    /**
     * Las condiciones que más faltan al evaluar y cuántas se corrigieron después.
     *
     * @param  Collection<int, Autoevaluacion>  $locales
     * @return array<int, array<string, mixed>>
     */
    private function condiciones(Collection $locales): array
    {
        $faltaban = [];
        foreach ($locales as $local) {
            foreach (($local->payload_canonico ?? [])['criterios'] ?? [] as $c) {
                if (($c['aplicabilidad'] ?? '') === 'APLICA' && ($c['estado_declarado'] ?? '') !== 'CUMPLE_DECLARADO') {
                    $faltaban[$c['codigo']] = ($faltaban[$c['codigo']] ?? 0) + 1;
                }
            }
        }
        $corregidas = $locales
            ->flatMap(fn (Autoevaluacion $local) => $this->correcciones->codigosCorregidos($local))
            ->countBy()
            ->all();
        $titulos = CriterioNormativo::whereIn('codigo_criterio', array_keys($faltaban))->pluck('titulo', 'codigo_criterio');

        return collect($faltaban)
            ->map(fn (int $total, string $codigo): array => [
                'codigo' => $codigo,
                'titulo' => $titulos[$codigo] ?? $codigo,
                'faltaban' => $total,
                'corregidas' => (int) min($total, $corregidas[$codigo] ?? 0),
                'porcentaje_corregido' => round(min($total, $corregidas[$codigo] ?? 0) * 100 / $total, 1),
            ])
            ->sortByDesc('faltaban')
            ->values()
            ->take(10)
            ->all();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $filas
     * @param  array<string, string>  $filtros
     * @return array<int, array{mes: string, etiqueta: string, evaluados: int, listos: int}>
     */
    private function porMes(Collection $filas, array $filtros): array
    {
        $meses = [];
        $cursor = Carbon::parse($filtros['desde'])->startOfMonth();
        $fin = Carbon::parse($filtros['hasta'])->startOfMonth();
        while ($cursor->lessThanOrEqualTo($fin) && count($meses) < 24) {
            $clave = $cursor->format('Y-m');
            $delMes = $filas->filter(fn (array $f): bool => str_starts_with((string) $f['fecha'], $clave));
            $meses[] = [
                'mes' => $clave,
                'etiqueta' => ucfirst($cursor->locale('es')->isoFormat('MMM YY')),
                'evaluados' => $delMes->count(),
                'listos' => $delMes->where('estado', 'VERDE')->count(),
            ];
            $cursor->addMonth();
        }

        return $meses;
    }

    /**
     * Clics a WhatsApp de proveedores. Respeta el filtro "Origen": los proveedores de las
     * cuentas de demostración (correo @checkitse.local) cuentan como datos de demostración.
     *
     * @param  array<string, string>  $filtros
     */
    private function contactosWhatsapp(array $filtros): int
    {
        $deDemostracion = fn (Builder $proveedor) => $proveedor->whereHas('user', fn (Builder $u) => $u->where('email', 'like', '%'.self::DOMINIO_DEMO));

        return EventoProveedor::query()
            ->where('tipo', EventoProveedor::CLIC_WHATSAPP)
            ->whereBetween('created_at', [Carbon::parse($filtros['desde'])->startOfDay(), Carbon::parse($filtros['hasta'])->endOfDay()])
            ->when($filtros['origen'] === 'demo', fn (Builder $q) => $q->whereHas('proveedor', $deDemostracion))
            ->when($filtros['origen'] === 'reales', fn (Builder $q) => $q->whereDoesntHave('proveedor', $deDemostracion))
            ->count();
    }

    /** @return array{distritos: array<int, string>, giros: array<int, string>} */
    private function opciones(): array
    {
        $base = Autoevaluacion::query()->where('estado', Autoevaluacion::ESTADO_REGISTRADA);

        return [
            'distritos' => (clone $base)->whereNotNull('distrito')->distinct()->orderBy('distrito')->pluck('distrito')->values()->all(),
            'giros' => (clone $base)->whereNotNull('funcion_economica')->distinct()->orderBy('funcion_economica')->pluck('funcion_economica')->values()->all(),
        ];
    }

    /** @param  Collection<int, mixed>  $valores */
    private function promedio(Collection $valores): float
    {
        return $valores->isEmpty() ? 0.0 : round((float) $valores->avg(), 1);
    }
}
