<?php

namespace App\Http\Controllers;

use App\Models\ProveedorRecurso;
use App\Models\SolicitudPlan;
use App\Services\PlanesProveedorService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Administración: ingresos, comprobantes de pago, aprobación de negocios y
 * seguimiento de vencimientos. Cada decisión queda registrada con quién la
 * tomó y cuándo.
 */
class AdminController extends Controller
{
    public const SECCIONES = ['resumen', 'pagos', 'negocios', 'vencimientos'];

    /** Días antes del vencimiento en que conviene recordar al proveedor. */
    private const DIAS_AVISO = 7;

    private const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

    public function __construct(private readonly PlanesProveedorService $planes) {}

    public function index(Request $request): Response
    {
        $estadoPago = $this->filtro($request->query('pagos'), [SolicitudPlan::ESTADO_PENDIENTE, SolicitudPlan::ESTADO_APROBADA, SolicitudPlan::ESTADO_RECHAZADA, 'todos'], SolicitudPlan::ESTADO_PENDIENTE);
        $estadoNegocio = $this->filtro($request->query('negocios'), [...ProveedorRecurso::ESTADOS, 'todos'], ProveedorRecurso::ESTADO_PENDIENTE);

        $aprobadas = SolicitudPlan::with('proveedor')->where('estado', SolicitudPlan::ESTADO_APROBADA)->latest('revisado_en')->get();
        $vencimientos = $this->vencimientos();

        return Inertia::render('Admin/Panel', [
            'seccion' => $this->filtro($request->query('seccion'), self::SECCIONES, 'resumen'),
            'filtros' => ['pagos' => $estadoPago, 'negocios' => $estadoNegocio],
            'resumen' => [
                'pagos_pendientes' => SolicitudPlan::pendientes()->count(),
                'negocios_pendientes' => ProveedorRecurso::whereNotNull('user_id')->where('estado_revision', ProveedorRecurso::ESTADO_PENDIENTE)->count(),
                'negocios_publicados' => ProveedorRecurso::whereNotNull('user_id')->where('estado_revision', ProveedorRecurso::ESTADO_APROBADO)->count(),
                'planes_pagados_activos' => $vencimientos->where('estado', '!=', 'vencido')->count(),
                'por_vencer' => $vencimientos->where('estado', 'por_vencer')->count(),
                'vencidos' => $vencimientos->where('estado', 'vencido')->count(),
            ],
            'ingresos' => $this->ingresos($aprobadas),
            'solicitudes' => $this->solicitudes($estadoPago),
            'negocios' => $this->negocios($estadoNegocio),
            'vencimientos' => $vencimientos->values(),
        ]);
    }

    /** Muestra el comprobante dentro del navegador (imagen o PDF). */
    public function evidencia(SolicitudPlan $solicitud): StreamedResponse
    {
        /** @var FilesystemAdapter $disco */
        $disco = Storage::disk('local');
        abort_unless($disco->exists($solicitud->evidencia_ruta), 404);

        return $disco->response($solicitud->evidencia_ruta, 'comprobante-'.$solicitud->numero_operacion);
    }

    /**
     * Aprueba el pago: el plan cambia y vence según los meses pagados (si
     * renueva el mismo plan antes de que venza, se suma al final). Como el
     * administrador ya revisó al proveedor, su negocio queda publicado.
     */
    public function aprobarPago(Request $request, SolicitudPlan $solicitud): RedirectResponse
    {
        $this->exigirPendiente($solicitud);
        $publicado = false;

        DB::transaction(function () use ($request, $solicitud, &$publicado) {
            $proveedor = $solicitud->proveedor()->lockForUpdate()->firstOrFail();
            $desde = today();

            if ($proveedor->planVigente() === $solicitud->plan_solicitado && $proveedor->plan_vence_el?->isFuture()) {
                $desde = $proveedor->plan_vence_el->copy();
            }

            $vence = $desde->copy()->addMonthsNoOverflow($solicitud->meses);
            $cambios = ['plan' => $solicitud->plan_solicitado, 'plan_vence_el' => $vence, 'recordatorio_enviado_el' => null];

            if (in_array($proveedor->estado_revision, [ProveedorRecurso::ESTADO_PENDIENTE, ProveedorRecurso::ESTADO_OBSERVADO], true)) {
                $cambios += $this->datosAprobacion($request);
                $publicado = true;
            }

            $proveedor->update($cambios);
            $solicitud->update([
                'estado' => SolicitudPlan::ESTADO_APROBADA,
                'revisado_por' => $request->user()->id,
                'revisado_en' => now(),
                'vigente_hasta' => $vence,
                'observacion_admin' => null,
            ]);
        });

        $mensaje = "Pago aprobado: {$solicitud->proveedor?->nombre_comercial} ya tiene el plan {$this->nombrePlan($solicitud->plan_solicitado)}";

        return back()->with('success', $mensaje.($publicado ? ' y su negocio quedó publicado.' : '.'));
    }

    public function rechazarPago(Request $request, SolicitudPlan $solicitud): RedirectResponse
    {
        $this->exigirPendiente($solicitud);
        $datos = $request->validate(
            ['observacion' => ['required', 'string', 'min:5', 'max:500']],
            ['observacion.required' => 'Escribe el motivo para que el proveedor sepa qué corregir.', 'observacion.min' => 'Explica un poco más el motivo.'],
        );

        $solicitud->update([
            'estado' => SolicitudPlan::ESTADO_RECHAZADA,
            'observacion_admin' => $datos['observacion'],
            'revisado_por' => $request->user()->id,
            'revisado_en' => now(),
        ]);

        return back()->with('success', 'Pago rechazado. El proveedor verá el motivo en su cuenta.');
    }

    /**
     * Aprueba, observa o suspende un negocio. Solo los aprobados se muestran
     * a los clientes.
     */
    public function revisarNegocio(Request $request, ProveedorRecurso $proveedor): RedirectResponse
    {
        abort_if($proveedor->user_id === null, 404);

        $datos = $request->validate([
            'accion' => ['required', Rule::in(['aprobar', 'observar', 'suspender'])],
            'observacion' => ['nullable', 'required_unless:accion,aprobar', 'string', 'min:5', 'max:500'],
        ], [
            'observacion.required_unless' => 'Escribe qué debe corregir el proveedor.',
            'observacion.min' => 'Explica un poco más el motivo.',
        ]);

        if ($datos['accion'] === 'aprobar') {
            $proveedor->update($this->datosAprobacion($request));

            return back()->with('success', 'Negocio aprobado: ya aparece para los clientes.');
        }

        $estado = $datos['accion'] === 'observar' ? ProveedorRecurso::ESTADO_OBSERVADO : ProveedorRecurso::ESTADO_SUSPENDIDO;
        $proveedor->update([
            'estado_revision' => $estado,
            'verificado' => false,
            'observacion_revision' => $datos['observacion'],
            'revisado_por' => $request->user()->id,
            'revisado_en' => now(),
        ]);

        return back()->with('success', $estado === ProveedorRecurso::ESTADO_OBSERVADO
            ? 'Negocio observado: el proveedor verá qué corregir.'
            : 'Negocio suspendido: ya no aparece para los clientes.');
    }

    /**
     * Abre WhatsApp con un recordatorio de vencimiento listo para enviar y
     * registra la fecha del aviso.
     */
    public function recordatorio(ProveedorRecurso $proveedor): RedirectResponse
    {
        $enlace = $this->enlaceRecordatorio($proveedor);
        abort_if($enlace === null, 422, 'El proveedor no tiene un número de WhatsApp válido.');

        $proveedor->update(['recordatorio_enviado_el' => now()]);

        return redirect()->away($enlace);
    }

    /**
     * @return array<string, mixed>
     */
    private function datosAprobacion(Request $request): array
    {
        return [
            'estado_revision' => ProveedorRecurso::ESTADO_APROBADO,
            'verificado' => true,
            'observacion_revision' => null,
            'revisado_por' => $request->user()->id,
            'revisado_en' => now(),
        ];
    }

    /**
     * Ingresos por mes, por plan y por medio de pago, más los últimos cobros.
     *
     * @param  Collection<int, SolicitudPlan>  $aprobadas
     * @return array<string, mixed>
     */
    private function ingresos(Collection $aprobadas): array
    {
        $porMes = $aprobadas->groupBy(fn (SolicitudPlan $s): string => $s->revisado_en?->format('Y-m') ?? '');
        $mes = fn (Carbon $fecha): float => (float) $porMes->get($fecha->format('Y-m'), collect())->sum('monto_soles');
        $anio = $aprobadas->filter(fn (SolicitudPlan $s): bool => $s->revisado_en?->year === now()->year);

        $meses = [];
        for ($i = 5; $i >= 0; $i--) {
            $fecha = now()->startOfMonth()->subMonths($i);
            $meses[] = ['mes' => $fecha->format('Y-m'), 'monto' => $mes($fecha)];
        }

        $agrupar = fn (string $campo, callable $etiqueta): array => $anio->groupBy($campo)
            ->map(fn (Collection $grupo, string $clave): array => [
                'etiqueta' => $etiqueta($clave),
                'monto' => (float) $grupo->sum('monto_soles'),
                'cantidad' => $grupo->count(),
            ])
            ->sortByDesc('monto')
            ->values()
            ->all();

        return [
            'mes' => $mes(now()->startOfMonth()),
            'mes_anterior' => $mes(now()->startOfMonth()->subMonth()),
            'anio' => (float) $anio->sum('monto_soles'),
            'total' => (float) $aprobadas->sum('monto_soles'),
            'esperado_30_dias' => $this->ingresoEsperado(),
            'meses' => $meses,
            'por_plan' => $agrupar('plan_solicitado', fn (string $id): string => $this->nombrePlan($id)),
            'por_metodo' => $agrupar('metodo_pago', fn (string $m): string => SolicitudPlan::METODOS_PAGO[$m] ?? $m),
            'ultimos' => $aprobadas->take(8)->map(fn (SolicitudPlan $s): array => [
                'id' => $s->id,
                'negocio' => $s->proveedor?->nombre_comercial,
                'plan' => $this->nombrePlan($s->plan_solicitado),
                'meses' => $s->meses,
                'monto_soles' => (float) $s->monto_soles,
                'metodo_pago' => SolicitudPlan::METODOS_PAGO[$s->metodo_pago] ?? $s->metodo_pago,
                'fecha' => $s->revisado_en?->toDateString(),
            ])->values()->all(),
        ];
    }

    /** Lo que entraría si renuevan por un mes los planes que vencen en 30 días. */
    private function ingresoEsperado(): float
    {
        return (float) ProveedorRecurso::where('plan', '!=', ProveedorRecurso::PLAN_GRATUITO)
            ->whereBetween('plan_vence_el', [today(), today()->addDays(30)])
            ->get(['plan'])
            ->sum(fn (ProveedorRecurso $p): float => (float) ($this->planes->plan($p->plan)['precio'] ?? 0));
    }

    /**
     * Planes pagados vigentes y vencidos en los últimos 30 días, del más
     * urgente al menos urgente.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function vencimientos(): Collection
    {
        return ProveedorRecurso::with('user')
            ->where('plan', '!=', ProveedorRecurso::PLAN_GRATUITO)
            ->whereNotNull('plan_vence_el')
            ->whereDate('plan_vence_el', '>=', today()->subDays(30))
            ->orderBy('plan_vence_el')
            ->get()
            ->map(function (ProveedorRecurso $p): array {
                $dias = (int) today()->diffInDays($p->plan_vence_el, false);

                return [
                    'id' => $p->id,
                    'negocio' => $p->nombre_comercial,
                    'responsable' => $p->user?->name,
                    'whatsapp' => $p->whatsapp ?: $p->telefono,
                    'plan' => $this->nombrePlan($p->plan),
                    'precio_mes' => (float) ($this->planes->plan($p->plan)['precio'] ?? 0),
                    'vence_el' => $p->plan_vence_el->toDateString(),
                    'dias' => $dias,
                    'estado' => $this->estadoVencimiento($dias),
                    'recordatorio_enviado_el' => $p->recordatorio_enviado_el?->toDateTimeString(),
                    'puede_recordar' => $this->enlaceRecordatorio($p) !== null,
                ];
            });
    }

    private function estadoVencimiento(int $dias): string
    {
        if ($dias < 0) {
            return 'vencido';
        }

        return $dias <= self::DIAS_AVISO ? 'por_vencer' : 'vigente';
    }

    private function enlaceRecordatorio(ProveedorRecurso $proveedor): ?string
    {
        $numero = preg_replace('/\D/', '', (string) ($proveedor->whatsapp ?: $proveedor->telefono));
        if ($numero === null || strlen($numero) < 9) {
            return null;
        }
        $numero = str_starts_with($numero, '51') ? $numero : '51'.$numero;

        $plan = $this->nombrePlan($proveedor->plan);
        $fecha = $proveedor->plan_vence_el
            ? $proveedor->plan_vence_el->day.' de '.self::MESES[$proveedor->plan_vence_el->month - 1]
            : '';
        $dias = $proveedor->plan_vence_el ? (int) today()->diffInDays($proveedor->plan_vence_el, false) : 0;
        $cuando = $dias < 0 ? "venció el {$fecha}" : "vence el {$fecha}".($dias <= 1 ? '' : " (en {$dias} días)");
        $yape = config('aliados.pago.yape_plin');

        $mensaje = "Hola {$proveedor->user?->name}, te saluda CheckITSE Huancayo. "
            ."Tu plan {$plan} de \"{$proveedor->nombre_comercial}\" {$cuando}. "
            .'Renuévalo para seguir apareciendo antes que tu competencia: '.route('proveedor.plan')
            .($yape ? " · Yape/Plin: {$yape}" : '').'. ¡Gracias por confiar en nosotros!';

        return 'https://wa.me/'.$numero.'?text='.rawurlencode($mensaje);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function solicitudes(string $estado): Collection
    {
        return SolicitudPlan::with('proveedor', 'user', 'revisor')
            ->when($estado !== 'todos', fn ($q) => $q->where('estado', $estado))
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn ($s): array => [
                'id' => $s->id,
                'negocio' => $s->proveedor?->nombre_comercial,
                'negocio_estado' => $s->proveedor?->estado_revision,
                'cuenta' => $s->user?->email,
                'plan_actual' => $this->nombrePlan($s->plan_actual),
                'plan_solicitado' => $this->nombrePlan($s->plan_solicitado),
                'meses' => $s->meses,
                'monto_soles' => (float) $s->monto_soles,
                'metodo_pago' => SolicitudPlan::METODOS_PAGO[$s->metodo_pago] ?? $s->metodo_pago,
                'numero_operacion' => $s->numero_operacion,
                'fecha_pago' => $s->fecha_pago->toDateString(),
                'es_imagen' => str_starts_with($s->evidencia_mime, 'image/'),
                'estado' => $s->estado,
                'observacion_admin' => $s->observacion_admin,
                'revisor' => $s->revisor?->name,
                'revisado_en' => $s->revisado_en?->toDateTimeString(),
                'vigente_hasta' => $s->vigente_hasta?->toDateString(),
                'enviado_el' => $s->created_at->toDateTimeString(),
            ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function negocios(string $estado): Collection
    {
        return ProveedorRecurso::with('user', 'categoria')
            ->withCount('ofertas')
            ->whereNotNull('user_id')
            ->when($estado !== 'todos', fn ($q) => $q->where('estado_revision', $estado))
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn ($p): array => [
                'id' => $p->id,
                'nombre_comercial' => $p->nombre_comercial,
                'especialidad' => $p->categoria?->nombre,
                'cuenta' => $p->user?->email,
                'responsable' => $p->user?->name,
                'telefono' => $p->telefono,
                'distrito' => $p->distrito,
                'direccion' => $p->direccion,
                'tiene_ubicacion' => $p->latitud !== null,
                'productos' => $p->ofertas_count,
                'plan' => $this->nombrePlan($p->planVigente()),
                'estado_revision' => $p->estado_revision,
                'observacion_revision' => $p->observacion_revision,
                'registrado_el' => $p->created_at?->toDateString(),
            ]);
    }

    private function exigirPendiente(SolicitudPlan $solicitud): void
    {
        abort_unless($solicitud->estaPendiente(), 409, 'Esta solicitud ya fue revisada.');
    }

    private function nombrePlan(string $id): string
    {
        return $this->planes->plan($id)['nombre'] ?? $id;
    }

    /**
     * @param  list<string>  $permitidos
     */
    private function filtro(mixed $valor, array $permitidos, string $porDefecto): string
    {
        return is_string($valor) && in_array($valor, $permitidos, true) ? $valor : $porDefecto;
    }
}
