<?php

namespace App\Http\Controllers;

use App\Models\CategoriaSubsanacion;
use App\Models\CriterioNormativo;
use App\Models\OfertaProveedor;
use App\Models\ProveedorRecurso;
use App\Models\SolicitudPlan;
use App\Models\User;
use App\Models\VentaProveedor;
use App\Services\EstadisticasProveedorService;
use App\Services\PlanesProveedorService;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Cuenta del proveedor, separada de la del emprendedor: resumen, catálogo de
 * productos, datos del negocio y plan. Lo que publica aquí es lo que ve el
 * emprendedor en "Lo que te falta", una vez que un administrador aprueba el
 * negocio.
 */
class ProveedorPanelController extends Controller
{
    /** Especialidad del frontend => código de categoría en BD. */
    private const ESPECIALIDADES = [
        'incendios' => 'EXTINTOR',
        'electricas' => 'ELECTRICO',
        'arquitectura_senaletica' => 'SENALETICA',
        'estructuras' => 'ARQUITECTURA',
    ];

    private const DISTRITOS = ['Huancayo', 'El Tambo', 'Chilca'];

    public function __construct(
        private readonly PlanesProveedorService $planes,
        private readonly EstadisticasProveedorService $estadisticas,
    ) {}

    /**
     * Resumen: estado de revisión, plan, productos y los pasos que faltan.
     */
    public function panel(Request $request): Response
    {
        /** @var ProveedorRecurso|null $perfil */
        $perfil = $this->proveedorAutenticado($request)->proveedor()->with('ofertas')->first();
        $pendiente = $perfil?->solicitudesPlan()->pendientes()->latest()->first();

        return Inertia::render('Proveedor/Inicio', [
            'perfil' => $perfil ? $this->resumenPerfil($perfil) : null,
            'conteo' => [
                'productos' => $perfil?->ofertas->count() ?? 0,
                'activos' => $perfil?->ofertas->where('activo', true)->count() ?? 0,
                'limite' => $perfil ? $this->planes->limiteProductos($perfil) : $this->planes->plan('basico')['limite_productos'] ?? 5,
            ],
            'pasos' => [
                ['clave' => 'perfil', 'texto' => 'Completa los datos de tu negocio', 'hecho' => $perfil !== null],
                ['clave' => 'ubicacion', 'texto' => 'Marca tu local en el mapa', 'hecho' => $perfil?->latitud !== null],
                ['clave' => 'producto', 'texto' => 'Publica tu primer producto con precio', 'hecho' => ($perfil?->ofertas->count() ?? 0) > 0],
                ['clave' => 'aprobado', 'texto' => 'Espera la aprobación del administrador', 'hecho' => $perfil?->estado_revision === ProveedorRecurso::ESTADO_APROBADO],
            ],
            'solicitudPendiente' => $pendiente ? $this->datosSolicitud($pendiente) : null,
            'planes' => $this->planes->planes(),
            'estadisticas' => $perfil ? $this->estadisticas->resumen($perfil) : null,
        ]);
    }

    /**
     * Mis ventas: lo que el proveedor vendió, con totales por mes.
     */
    public function ventas(Request $request): Response
    {
        /** @var ProveedorRecurso|null $perfil */
        $perfil = $this->proveedorAutenticado($request)->proveedor()->with('ofertas')->first();
        $ventas = $perfil ? $perfil->ventas()->with('oferta')->orderByDesc('fecha')->orderByDesc('id')->limit(200)->get() : collect();
        $mesActual = now()->format('Y-m');
        $mesAnterior = now()->subMonthNoOverflow()->format('Y-m');
        $porMes = $ventas->groupBy(fn ($v): string => $v->fecha->format('Y-m'));

        return Inertia::render('Proveedor/Ventas', [
            'perfil' => $perfil ? $this->resumenPerfil($perfil) : null,
            'ventas' => $ventas->map(fn (VentaProveedor $v): array => [
                'id' => $v->id,
                'descripcion' => $v->descripcion,
                'producto' => $v->oferta?->nombre,
                'cantidad' => $v->cantidad,
                'monto_soles' => (float) $v->monto_soles,
                'fecha' => $v->fecha->toDateString(),
                'cliente' => $v->cliente,
            ])->values(),
            'totales' => [
                'mes' => (float) $porMes->get($mesActual, collect())->sum('monto_soles'),
                'mes_anterior' => (float) $porMes->get($mesAnterior, collect())->sum('monto_soles'),
                'ventas_mes' => $porMes->get($mesActual, collect())->count(),
                'historico' => (float) $ventas->sum('monto_soles'),
            ],
            'productos' => $perfil ? $perfil->ofertas->sortBy('nombre')->values()->map(fn (OfertaProveedor $o): array => [
                'id' => $o->id,
                'nombre' => $o->nombre,
                'precio_soles' => (float) $o->precio_soles,
                'stock' => $o->stock,
            ]) : [],
        ]);
    }

    /**
     * Registra una venta. Si viene de un producto con unidades disponibles, las descuenta.
     */
    public function guardarVenta(Request $request): RedirectResponse
    {
        $perfil = $this->perfilObligatorio($request);
        $datos = $request->validate([
            'oferta_id' => ['nullable', 'integer', Rule::exists('ofertas_proveedor', 'id')->where('proveedor_recurso_id', $perfil->id)],
            'descripcion' => ['nullable', 'required_without:oferta_id', 'string', 'max:160'],
            'cantidad' => ['required', 'integer', 'min:1', 'max:10000'],
            'monto_soles' => ['required', 'numeric', 'min:0.5', 'max:1000000'],
            'fecha' => ['required', 'date', 'before_or_equal:today'],
            'cliente' => ['nullable', 'string', 'max:120'],
            'descontar_stock' => ['boolean'],
        ], [
            'descripcion.required_without' => 'Elige un producto o escribe qué vendiste.',
            'cantidad.required' => 'Escribe cuántas unidades vendiste.',
            'monto_soles.required' => 'Escribe el monto total de la venta.',
            'fecha.before_or_equal' => 'La fecha no puede ser futura.',
        ]);

        /** @var OfertaProveedor|null $oferta */
        $oferta = isset($datos['oferta_id']) ? $perfil->ofertas()->find($datos['oferta_id']) : null;

        $perfil->ventas()->create([
            'oferta_proveedor_id' => $oferta?->id,
            'descripcion' => ($datos['descripcion'] ?? null) ?: $oferta?->nombre,
            'cantidad' => $datos['cantidad'],
            'monto_soles' => $datos['monto_soles'],
            'fecha' => $datos['fecha'],
            'cliente' => $datos['cliente'] ?? null,
        ]);

        if ($oferta !== null && $oferta->stock !== null && $request->boolean('descontar_stock', true)) {
            $oferta->update(['stock' => max(0, $oferta->stock - (int) $datos['cantidad'])]);
        }

        return back()->with('success', 'Venta registrada.');
    }

    public function eliminarVenta(Request $request, VentaProveedor $venta): RedirectResponse
    {
        abort_if($venta->proveedor_recurso_id !== $this->perfilObligatorio($request)->id, 404);
        $venta->delete();

        return back()->with('success', 'Venta eliminada.');
    }

    /**
     * Catálogo: los productos del proveedor con su uso, zona y unidades.
     */
    public function productos(Request $request): Response
    {
        /** @var ProveedorRecurso|null $perfil */
        $perfil = $this->proveedorAutenticado($request)->proveedor()->with('ofertas')->first();

        return Inertia::render('Proveedor/Productos', [
            'perfil' => $perfil ? $this->resumenPerfil($perfil) : null,
            'ofertas' => $perfil ? $perfil->ofertas->sortByDesc('id')->values()->map(fn (OfertaProveedor $o): array => [
                'id' => $o->id,
                'criterio_codigo' => $o->criterio_codigo,
                'uso' => OfertaProveedor::usoDeCriterio($o->criterio_codigo),
                'nombre' => $o->nombre,
                'marca' => $o->marca,
                'descripcion' => $o->descripcion,
                'precio_soles' => (float) $o->precio_soles,
                'unidad' => $o->unidad,
                'stock' => $o->stock,
                'zona' => $o->zona,
                'activo' => $o->activo,
            ]) : [],
            'criterios' => CriterioNormativo::orderBy('codigo_criterio')->get(['codigo_criterio', 'titulo'])
                ->map(fn ($c): array => [
                    'codigo' => $c->codigo_criterio,
                    'titulo' => $c->titulo,
                    'uso' => OfertaProveedor::usoDeCriterio($c->codigo_criterio),
                ]),
            'usos' => OfertaProveedor::opcionesUso(),
            'zonas' => OfertaProveedor::ZONAS,
            'unidades' => OfertaProveedor::UNIDADES,
            'limite' => $perfil ? $this->planes->limiteProductos($perfil) : null,
        ]);
    }

    public function perfil(Request $request): Response
    {
        /** @var ProveedorRecurso|null $perfil */
        $perfil = $this->proveedorAutenticado($request)->proveedor()->with('categoria')->first();

        return Inertia::render('Proveedor/Perfil', [
            'perfil' => $perfil ? [
                ...$this->resumenPerfil($perfil),
                'especialidad' => array_search($perfil->categoria?->codigo, self::ESPECIALIDADES, true) ?: '',
                'descripcion' => $perfil->descripcion,
                'telefono' => $perfil->telefono,
                'whatsapp' => $perfil->whatsapp,
                'distrito' => $perfil->distrito,
                'direccion' => $perfil->direccion,
                'latitud' => $perfil->latitud !== null ? (float) $perfil->latitud : null,
                'longitud' => $perfil->longitud !== null ? (float) $perfil->longitud : null,
            ] : null,
            'distritos' => self::DISTRITOS,
        ]);
    }

    /**
     * Planes con sus ventajas y precios, el pago y el historial de solicitudes.
     */
    public function plan(Request $request): Response
    {
        $perfil = $this->proveedorAutenticado($request)->proveedor;

        return Inertia::render('Proveedor/Plan', [
            'perfil' => $perfil ? $this->resumenPerfil($perfil) : null,
            'planes' => $this->planes->planes(),
            'precios' => $this->planes->tablaPrecios(),
            'duraciones' => $this->planes->duraciones(),
            'metodos' => collect(SolicitudPlan::METODOS_PAGO)->map(fn (string $etiqueta, string $valor): array => ['valor' => $valor, 'etiqueta' => $etiqueta])->values(),
            'pago' => config('aliados.pago'),
            'solicitudes' => $perfil
                ? $perfil->solicitudesPlan()->latest()->limit(20)->get()->map(fn (SolicitudPlan $s): array => $this->datosSolicitud($s))
                : [],
        ]);
    }

    /**
     * El proveedor envía su comprobante de pago. Un administrador lo revisa y,
     * al aprobarlo, el plan cambia. El monto lo calcula el servidor.
     */
    public function solicitarPlan(Request $request): RedirectResponse
    {
        $perfil = $this->perfilObligatorio($request);

        if ($perfil->solicitudesPlan()->pendientes()->exists()) {
            throw ValidationException::withMessages([
                'plan_solicitado' => 'Ya tienes un pago en revisión. Te avisaremos apenas lo revisemos.',
            ]);
        }

        $datos = $request->validate([
            'plan_solicitado' => ['required', Rule::in($this->planes->planesPagados())],
            'meses' => ['required', 'integer', Rule::in($this->planes->mesesPermitidos())],
            'metodo_pago' => ['required', Rule::in(array_keys(SolicitudPlan::METODOS_PAGO))],
            'numero_operacion' => [
                'required', 'string', 'regex:/^[A-Za-z0-9\-]{4,40}$/',
                Rule::unique('solicitudes_plan', 'numero_operacion')->where('metodo_pago', $request->input('metodo_pago')),
            ],
            'fecha_pago' => ['required', 'date', 'before_or_equal:today', 'after_or_equal:'.now()->subDays(60)->toDateString()],
            'evidencia' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ], [
            'plan_solicitado.required' => 'Elige el plan que quieres.',
            'plan_solicitado.in' => 'Elige un plan pagado.',
            'meses.required' => 'Elige por cuántos meses pagas.',
            'metodo_pago.required' => 'Elige cómo pagaste.',
            'numero_operacion.required' => 'Escribe el número de operación del comprobante.',
            'numero_operacion.regex' => 'El número de operación solo lleva letras, números o guiones (4 a 40).',
            'numero_operacion.unique' => 'Ese número de operación ya fue registrado.',
            'fecha_pago.required' => 'Escribe la fecha en que pagaste.',
            'fecha_pago.before_or_equal' => 'La fecha de pago no puede ser futura.',
            'fecha_pago.after_or_equal' => 'El pago debe ser de los últimos 60 días.',
            'evidencia.required' => 'Sube la foto o captura de tu comprobante.',
            'evidencia.mimes' => 'El comprobante debe ser una imagen (JPG, PNG, WEBP) o un PDF.',
            'evidencia.max' => 'El comprobante no debe pesar más de 5 MB.',
        ]);

        $uuid = (string) Str::uuid();
        $archivo = $request->file('evidencia');
        $ruta = $archivo->storeAs('pagos/'.$perfil->id, $uuid.'.'.$archivo->extension(), 'local');

        $perfil->solicitudesPlan()->create([
            'uuid' => $uuid,
            'user_id' => $request->user()->id,
            'plan_actual' => $perfil->planVigente(),
            'plan_solicitado' => $datos['plan_solicitado'],
            'meses' => (int) $datos['meses'],
            'monto_soles' => $this->planes->monto($datos['plan_solicitado'], (int) $datos['meses']),
            'metodo_pago' => $datos['metodo_pago'],
            'numero_operacion' => mb_strtoupper($datos['numero_operacion']),
            'fecha_pago' => $datos['fecha_pago'],
            'evidencia_ruta' => $ruta,
            'evidencia_mime' => (string) $archivo->getMimeType(),
            'evidencia_hash' => hash_file('sha256', $archivo->getRealPath()),
            'estado' => SolicitudPlan::ESTADO_PENDIENTE,
        ]);

        return redirect()->route('proveedor.plan')->with('success', 'Recibimos tu comprobante. Un administrador lo revisará y activará tu plan.');
    }

    /** El proveedor puede volver a ver su propio comprobante. */
    public function evidencia(Request $request, string $uuid): StreamedResponse
    {
        $perfil = $this->perfilObligatorio($request);
        $solicitud = $perfil->solicitudesPlan()->where('uuid', $uuid)->firstOrFail();

        /** @var FilesystemAdapter $disco */
        $disco = Storage::disk('local');

        return $disco->response($solicitud->evidencia_ruta, 'comprobante-'.$solicitud->numero_operacion);
    }

    public function guardarPerfil(Request $request): RedirectResponse
    {
        $usuario = $this->proveedorAutenticado($request);
        $datos = $request->validate([
            'nombre_comercial' => ['required', 'string', 'min:3', 'max:120'],
            'especialidad' => ['required', Rule::in(array_keys(self::ESPECIALIDADES))],
            'descripcion' => ['nullable', 'string', 'max:600'],
            'telefono' => ['required', 'string', 'regex:/^[0-9+\s\-()]{7,25}$/'],
            'whatsapp' => ['nullable', 'string', 'regex:/^[0-9+\s\-()]{7,25}$/'],
            'distrito' => ['required', Rule::in(self::DISTRITOS)],
            'direccion' => ['nullable', 'string', 'max:255'],
            'latitud' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitud'],
            'longitud' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitud'],
        ], [
            'nombre_comercial.required' => 'Escribe el nombre de tu negocio.',
            'especialidad.required' => 'Elige qué vendes o instalas.',
            'telefono.required' => 'Escribe un teléfono de contacto.',
            'telefono.regex' => 'Escribe un teléfono válido, por ejemplo 964 123 456.',
            'whatsapp.regex' => 'Escribe un número de WhatsApp válido.',
            'distrito.required' => 'Elige tu distrito.',
        ]);

        $categoria = CategoriaSubsanacion::where('codigo', self::ESPECIALIDADES[$datos['especialidad']])->firstOrFail();
        $perfil = $usuario->proveedor()->first();

        // Un negocio nuevo, o uno con observaciones que ya se corrigieron, vuelve a revisión.
        $estado = $perfil === null || $perfil->estado_revision === ProveedorRecurso::ESTADO_OBSERVADO
            ? ProveedorRecurso::ESTADO_PENDIENTE
            : $perfil->estado_revision;

        ProveedorRecurso::updateOrCreate(
            ['user_id' => $usuario->id],
            [
                'categoria_id' => $categoria->id,
                'rubro' => $datos['especialidad'],
                'razon_social' => $datos['nombre_comercial'],
                'nombre_comercial' => $datos['nombre_comercial'],
                'descripcion' => $datos['descripcion'] ?? null,
                'telefono' => $datos['telefono'],
                'whatsapp' => ($datos['whatsapp'] ?? null) ?: $datos['telefono'],
                'distrito' => $datos['distrito'],
                'direccion' => $datos['direccion'] ?? null,
                'latitud' => $datos['latitud'] ?? null,
                'longitud' => $datos['longitud'] ?? null,
                'activo' => true,
                'estado_revision' => $estado,
            ],
        );

        $mensaje = $estado === ProveedorRecurso::ESTADO_PENDIENTE
            ? 'Guardado. Un administrador revisará tu negocio antes de mostrarlo a los clientes.'
            : 'Tus datos se actualizaron.';

        return back()->with('success', $mensaje);
    }

    public function guardarOferta(Request $request): RedirectResponse
    {
        $perfil = $this->perfilObligatorio($request);
        $limite = $this->planes->limiteProductos($perfil);

        if ($limite !== null && $perfil->ofertas()->count() >= $limite) {
            $plan = $this->planes->plan($perfil->planVigente())['nombre'] ?? 'Básico';
            throw ValidationException::withMessages([
                'limite' => "Tu plan {$plan} permite {$limite} productos. Mejora tu plan para publicar más.",
            ]);
        }

        $perfil->ofertas()->create($this->validarOferta($request));

        return back()->with('success', 'Producto publicado.');
    }

    public function actualizarOferta(Request $request, OfertaProveedor $oferta): RedirectResponse
    {
        $this->ofertaPropia($request, $oferta);
        $oferta->update($this->validarOferta($request) + ['activo' => $request->boolean('activo', true)]);

        return back()->with('success', 'Producto actualizado.');
    }

    /** Pausa o reactiva un producto sin borrarlo (por ejemplo, si se agotó). */
    public function alternarOferta(Request $request, OfertaProveedor $oferta): RedirectResponse
    {
        $this->ofertaPropia($request, $oferta);
        $oferta->update(['activo' => ! $oferta->activo]);

        return back()->with('success', $oferta->activo ? 'Producto visible otra vez.' : 'Producto pausado: los clientes no lo verán.');
    }

    public function eliminarOferta(Request $request, OfertaProveedor $oferta): RedirectResponse
    {
        $this->ofertaPropia($request, $oferta);
        $oferta->delete();

        return back()->with('success', 'Producto eliminado.');
    }

    /**
     * @return array<string, mixed>
     */
    private function validarOferta(Request $request): array
    {
        $datos = $request->validate([
            'criterio_codigo' => ['required', 'string', Rule::exists('criterios_normativos', 'codigo_criterio')],
            'nombre' => ['required', 'string', 'min:3', 'max:120'],
            'marca' => ['nullable', 'string', 'max:80'],
            'descripcion' => ['nullable', 'string', 'max:500'],
            'precio_soles' => ['required', 'numeric', 'min:1', 'max:100000'],
            'unidad' => ['required', Rule::in(OfertaProveedor::UNIDADES)],
            'stock' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'zona' => ['nullable', Rule::in(OfertaProveedor::ZONAS)],
        ], [
            'criterio_codigo.required' => 'Elige qué necesidad resuelve tu producto.',
            'nombre.required' => 'Escribe el nombre del producto o servicio.',
            'precio_soles.required' => 'Escribe el precio.',
            'precio_soles.min' => 'El precio debe ser al menos S/ 1.',
            'stock.integer' => 'Escribe cuántas unidades tienes, en números.',
            'zona.in' => 'Elige una zona de la lista.',
        ]);

        $datos['zona'] ??= OfertaProveedor::ZONAS[0];

        return $datos;
    }

    /**
     * @return array<string, mixed>
     */
    private function resumenPerfil(ProveedorRecurso $perfil): array
    {
        $planVigente = $perfil->planVigente();

        return [
            'nombre_comercial' => $perfil->nombre_comercial,
            'plan' => $planVigente,
            'plan_nombre' => $this->planes->plan($planVigente)['nombre'] ?? 'Básico',
            'plan_vence_el' => $planVigente !== ProveedorRecurso::PLAN_GRATUITO ? $perfil->plan_vence_el?->toDateString() : null,
            'estado_revision' => $perfil->estado_revision,
            'observacion_revision' => $perfil->observacion_revision,
            'verificado' => (bool) $perfil->verificado,
            'publicado' => $perfil->estaPublicado(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function datosSolicitud(SolicitudPlan $s): array
    {
        return [
            'uuid' => $s->uuid,
            'plan_solicitado' => $s->plan_solicitado,
            'plan_nombre' => $this->planes->plan($s->plan_solicitado)['nombre'] ?? $s->plan_solicitado,
            'meses' => $s->meses,
            'monto_soles' => (float) $s->monto_soles,
            'metodo_pago' => SolicitudPlan::METODOS_PAGO[$s->metodo_pago] ?? $s->metodo_pago,
            'numero_operacion' => $s->numero_operacion,
            'fecha_pago' => $s->fecha_pago->toDateString(),
            'estado' => $s->estado,
            'observacion_admin' => $s->observacion_admin,
            'vigente_hasta' => $s->vigente_hasta?->toDateString(),
            'enviado_el' => $s->created_at->toDateTimeString(),
        ];
    }

    private function proveedorAutenticado(Request $request): User
    {
        /** @var User $usuario */
        $usuario = $request->user();
        abort_unless($usuario->esProveedor(), 403, 'Esta sección es solo para cuentas de proveedor.');

        return $usuario;
    }

    private function perfilObligatorio(Request $request): ProveedorRecurso
    {
        $perfil = $this->proveedorAutenticado($request)->proveedor;
        abort_if($perfil === null, 422, 'Primero completa el perfil de tu negocio.');

        return $perfil;
    }

    private function ofertaPropia(Request $request, OfertaProveedor $oferta): void
    {
        abort_if($oferta->proveedor_recurso_id !== $this->perfilObligatorio($request)->id, 404);
    }
}
