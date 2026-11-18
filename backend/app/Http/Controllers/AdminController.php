<?php

namespace App\Http\Controllers;

use App\Models\ProveedorRecurso;
use App\Models\SolicitudPlan;
use App\Services\PlanesProveedorService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Administración: revisar comprobantes de pago de planes y aprobar negocios
 * de proveedores. Cada decisión queda registrada con quién la tomó y cuándo.
 */
class AdminController extends Controller
{
    public function __construct(private readonly PlanesProveedorService $planes) {}

    public function index(Request $request): Response
    {
        $estadoPago = $this->filtro($request->query('pagos'), [SolicitudPlan::ESTADO_PENDIENTE, SolicitudPlan::ESTADO_APROBADA, SolicitudPlan::ESTADO_RECHAZADA, 'todos'], SolicitudPlan::ESTADO_PENDIENTE);
        $estadoNegocio = $this->filtro($request->query('negocios'), [...ProveedorRecurso::ESTADOS, 'todos'], ProveedorRecurso::ESTADO_PENDIENTE);

        $solicitudes = SolicitudPlan::with('proveedor', 'user', 'revisor')
            ->when($estadoPago !== 'todos', fn ($q) => $q->where('estado', $estadoPago))
            ->latest()
            ->limit(100)
            ->get();

        $negocios = ProveedorRecurso::with('user', 'categoria')
            ->withCount('ofertas')
            ->whereNotNull('user_id')
            ->when($estadoNegocio !== 'todos', fn ($q) => $q->where('estado_revision', $estadoNegocio))
            ->latest()
            ->limit(100)
            ->get();

        $inicioMes = Carbon::now()->startOfMonth();

        return Inertia::render('Admin/Panel', [
            'resumen' => [
                'pagos_pendientes' => SolicitudPlan::pendientes()->count(),
                'negocios_pendientes' => ProveedorRecurso::whereNotNull('user_id')->where('estado_revision', ProveedorRecurso::ESTADO_PENDIENTE)->count(),
                'ingresos_mes' => (float) SolicitudPlan::where('estado', SolicitudPlan::ESTADO_APROBADA)->where('revisado_en', '>=', $inicioMes)->sum('monto_soles'),
                'planes_pagados_activos' => ProveedorRecurso::where('plan', '!=', ProveedorRecurso::PLAN_GRATUITO)->whereDate('plan_vence_el', '>=', today())->count(),
            ],
            'filtros' => ['pagos' => $estadoPago, 'negocios' => $estadoNegocio],
            'solicitudes' => $solicitudes->map(fn (SolicitudPlan $s): array => [
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
            ]),
            'negocios' => $negocios->map(fn (ProveedorRecurso $p): array => [
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
            ]),
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
     * Aprueba el pago: el plan del negocio cambia y vence según los meses
     * pagados. Si renueva el mismo plan antes de que venza, se suma al final.
     */
    public function aprobarPago(Request $request, SolicitudPlan $solicitud): RedirectResponse
    {
        $this->exigirPendiente($solicitud);

        DB::transaction(function () use ($request, $solicitud) {
            $proveedor = $solicitud->proveedor()->lockForUpdate()->firstOrFail();
            $desde = today();

            if ($proveedor->planVigente() === $solicitud->plan_solicitado && $proveedor->plan_vence_el?->isFuture()) {
                $desde = $proveedor->plan_vence_el->copy();
            }

            $vence = $desde->copy()->addMonthsNoOverflow($solicitud->meses);

            $proveedor->update(['plan' => $solicitud->plan_solicitado, 'plan_vence_el' => $vence]);
            $solicitud->update([
                'estado' => SolicitudPlan::ESTADO_APROBADA,
                'revisado_por' => $request->user()->id,
                'revisado_en' => now(),
                'vigente_hasta' => $vence,
                'observacion_admin' => null,
            ]);
        });

        return back()->with('success', "Pago aprobado: {$solicitud->proveedor?->nombre_comercial} ya tiene el plan {$this->nombrePlan($solicitud->plan_solicitado)}.");
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

        $estado = match ($datos['accion']) {
            'aprobar' => ProveedorRecurso::ESTADO_APROBADO,
            'observar' => ProveedorRecurso::ESTADO_OBSERVADO,
            default => ProveedorRecurso::ESTADO_SUSPENDIDO,
        };

        $proveedor->update([
            'estado_revision' => $estado,
            'verificado' => $estado === ProveedorRecurso::ESTADO_APROBADO,
            'observacion_revision' => $estado === ProveedorRecurso::ESTADO_APROBADO ? null : $datos['observacion'],
            'revisado_por' => $request->user()->id,
            'revisado_en' => now(),
        ]);

        $mensajes = [
            ProveedorRecurso::ESTADO_APROBADO => 'Negocio aprobado: ya aparece para los clientes.',
            ProveedorRecurso::ESTADO_OBSERVADO => 'Negocio observado: el proveedor verá qué corregir.',
            ProveedorRecurso::ESTADO_SUSPENDIDO => 'Negocio suspendido: ya no aparece para los clientes.',
        ];

        return back()->with('success', $mensajes[$estado]);
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
