<?php

namespace Database\Seeders;

use App\Models\CategoriaSubsanacion;
use App\Models\EventoProveedor;
use App\Models\OfertaProveedor;
use App\Models\ProveedorRecurso;
use App\Models\SolicitudPlan;
use App\Models\User;
use App\Models\VentaProveedor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Cuentas de DEMOSTRACIÓN para probar el circuito completo en local:
 * un administrador y un proveedor con su negocio en revisión, productos y un
 * pago pendiente. No se ejecuta en producción.
 *
 * php artisan db:seed --class=DemoCuentasSeeder
 */
class DemoCuentasSeeder extends Seeder
{
    public const CLAVE_DEMO = 'CheckItse2026!';

    public function run(): void
    {
        // En producción solo lo permite checkitse:servidor-preparar, que cambia las claves al terminar.
        if (app()->environment('production') && ! config('checkitse.permitir_cuentas_demo')) {
            $this->command?->warn('DemoCuentasSeeder no se ejecuta en producción.');

            return;
        }

        User::updateOrCreate(
            ['email' => 'admin@checkitse.local'],
            ['name' => 'Administración CheckITSE', 'password' => Hash::make(self::CLAVE_DEMO), 'tipo_cuenta' => User::TIPO_ADMIN],
        );

        $proveedor = User::updateOrCreate(
            ['email' => 'proveedor@checkitse.local'],
            ['name' => 'Rosa Quispe', 'password' => Hash::make(self::CLAVE_DEMO), 'tipo_cuenta' => User::TIPO_PROVEEDOR],
        );

        $negocio = ProveedorRecurso::updateOrCreate(
            ['user_id' => $proveedor->id],
            [
                'categoria_id' => CategoriaSubsanacion::where('codigo', 'EXTINTOR')->value('id'),
                'rubro' => 'incendios',
                'razon_social' => 'Extintores Wanka (demo)',
                'nombre_comercial' => 'Extintores Wanka (demo)',
                'descripcion' => 'Venta y recarga de extintores con certificado. Atendemos a domicilio.',
                'telefono' => '964112233',
                'whatsapp' => '964112233',
                'distrito' => 'El Tambo',
                'direccion' => 'Jr. Puno 450',
                'latitud' => -12.0581,
                'longitud' => -75.2153,
                'activo' => true,
                'estado_revision' => ProveedorRecurso::ESTADO_PENDIENTE,
                'verificado' => false,
                'observacion_revision' => null,
                'revisado_por' => null,
                'revisado_en' => null,
                'plan' => ProveedorRecurso::PLAN_GRATUITO,
                'plan_vence_el' => null,
                'recordatorio_enviado_el' => null,
            ],
        );

        $productos = [
            ['CRIT-01', 'Extintor PQS 6 kg con tarjeta', 'Kidde', 135, 'unidad', 12, 'Todo Huancayo'],
            ['CRIT-01', 'Recarga de extintor PQS 6 kg', null, 40, 'servicio', null, 'El Tambo'],
            ['CRIT-08', 'Luz de emergencia LED de 2 faros', 'Opalux', 80, 'unidad', 0, 'Huancayo'],
        ];
        foreach ($productos as [$criterio, $nombre, $marca, $precio, $unidad, $stock, $zona]) {
            OfertaProveedor::updateOrCreate(
                ['proveedor_recurso_id' => $negocio->id, 'nombre' => $nombre],
                ['criterio_codigo' => $criterio, 'marca' => $marca, 'precio_soles' => $precio, 'unidad' => $unidad, 'stock' => $stock, 'zona' => $zona, 'activo' => true],
            );
        }

        // Cada ejecución deja el escenario listo para revisar de nuevo.
        foreach ($negocio->solicitudesPlan()->get() as $anterior) {
            Storage::disk('local')->delete($anterior->evidencia_ruta);
            $anterior->delete();
        }

        $uuid = (string) Str::uuid();
        $ruta = "pagos/{$negocio->id}/{$uuid}.pdf";
        $pdf = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
            .'3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 160]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj '
            ."4 0 obj<</Length 88>>stream\nBT /F1 14 Tf 20 110 Td (Yape - comprobante DEMO) Tj 0 -30 Td (S/ 132.00  Op. 04512398) Tj ET\nendstream endobj "
            ."5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF";
        Storage::disk('local')->put($ruta, $pdf);

        $negocio->solicitudesPlan()->create([
            'uuid' => $uuid,
            'user_id' => $proveedor->id,
            'plan_actual' => ProveedorRecurso::PLAN_GRATUITO,
            'plan_solicitado' => 'destacado',
            'meses' => 3,
            'monto_soles' => 132,
            'metodo_pago' => 'yape',
            'numero_operacion' => '04512398',
            'fecha_pago' => today(),
            'evidencia_ruta' => $ruta,
            'evidencia_mime' => 'application/pdf',
            'evidencia_hash' => hash('sha256', $pdf),
            'estado' => SolicitudPlan::ESTADO_PENDIENTE,
        ]);

        $this->actividadDemo($negocio);
        $this->negocioPorVencer();

        $this->command?->info('Cuentas demo listas (contraseña: '.self::CLAVE_DEMO.'): admin@checkitse.local, proveedor@checkitse.local y proveedor2@checkitse.local');
    }

    /**
     * Seis meses de apariciones, contactos y ventas, para que el resumen del
     * proveedor muestre cómo le va.
     */
    private function actividadDemo(ProveedorRecurso $negocio): void
    {
        EventoProveedor::where('proveedor_recurso_id', $negocio->id)->delete();
        VentaProveedor::where('proveedor_recurso_id', $negocio->id)->delete();

        $ofertas = $negocio->ofertas()->orderBy('id')->get();
        $filas = [];
        foreach (range(0, 179) as $dia) {
            array_push($filas, ...$this->eventosDelDia($negocio->id, $ofertas->pluck('id')->all(), $dia));
        }
        foreach (array_chunk($filas, 500) as $lote) {
            EventoProveedor::insert($lote);
        }

        $extintor = $ofertas->first();
        $ventas = [
            [2, 2, 270, 'Bodega Doña Mery'],
            [5, 1, 135, 'Pollería El Huanca'],
            [12, 3, 120, null],
            [35, 4, 540, 'Minimarket Real'],
            [60, 2, 270, null],
            [95, 1, 135, 'Farmacia Salud'],
        ];
        foreach ($ventas as [$hace, $cantidad, $monto, $cliente]) {
            $negocio->ventas()->create([
                'oferta_proveedor_id' => $extintor?->id,
                'descripcion' => $extintor?->nombre ?? 'Extintor',
                'cantidad' => $cantidad,
                'monto_soles' => $monto,
                'fecha' => today()->subDays($hace),
                'cliente' => $cliente,
            ]);
        }
    }

    /**
     * Eventos de un día: más apariciones en el último mes, algunos contactos,
     * elecciones y aperturas del mapa.
     *
     * @param  list<int>  $ofertaIds
     * @return list<array<string, mixed>>
     */
    private function eventosDelDia(int $negocioId, array $ofertaIds, int $dia): array
    {
        $fecha = now()->subDays($dia)->setTime(10 + $dia % 8, 15);
        $fila = fn (string $tipo, ?int $ofertaId): array => ['proveedor_recurso_id' => $negocioId, 'oferta_proveedor_id' => $ofertaId, 'tipo' => $tipo, 'created_at' => $fecha];
        $filas = $dia % 4 === 0 ? [$fila(EventoProveedor::CLIC_MAPA, null)] : [];

        foreach ($ofertaIds as $i => $ofertaId) {
            $apariciones = ($dia * 7 + $i * 3) % 5 + ($dia < 30 ? 2 : 0);
            array_push($filas, ...array_fill(0, $apariciones, $fila(EventoProveedor::APARICION, $ofertaId)));
            if (($dia + $i) % 3 === 0) {
                $filas[] = $fila(EventoProveedor::CLIC_WHATSAPP, $ofertaId);
            }
            if (($dia + $i) % 6 === 0) {
                $filas[] = $fila(EventoProveedor::ELECCION, $ofertaId);
            }
        }

        return $filas;
    }

    /**
     * Segundo negocio, ya publicado, con un plan Premium que vence en 4 días:
     * sirve para probar el recordatorio por WhatsApp y el gráfico de ingresos.
     */
    private function negocioPorVencer(): void
    {
        $usuario = User::updateOrCreate(
            ['email' => 'proveedor2@checkitse.local'],
            ['name' => 'Andrés Palomino', 'password' => Hash::make(self::CLAVE_DEMO), 'tipo_cuenta' => User::TIPO_PROVEEDOR],
        );

        $negocio = ProveedorRecurso::updateOrCreate(
            ['user_id' => $usuario->id],
            [
                'categoria_id' => CategoriaSubsanacion::where('codigo', 'SENALETICA')->value('id'),
                'rubro' => 'arquitectura_senaletica',
                'razon_social' => 'Señales Wanka (demo)',
                'nombre_comercial' => 'Señales Wanka (demo)',
                'descripcion' => 'Señalética fotoluminiscente y carteles de aforo.',
                'telefono' => '904249285',
                'whatsapp' => '904249285',
                'distrito' => 'Huancayo',
                'activo' => true,
                'estado_revision' => ProveedorRecurso::ESTADO_APROBADO,
                'verificado' => true,
                'plan' => 'premium',
                'plan_vence_el' => today()->addDays(4),
                'recordatorio_enviado_el' => null,
            ],
        );

        OfertaProveedor::updateOrCreate(
            ['proveedor_recurso_id' => $negocio->id, 'nombre' => 'Kit de 10 señales fotoluminiscentes'],
            ['criterio_codigo' => 'CRIT-02B', 'precio_soles' => 110, 'unidad' => 'juego', 'stock' => 20, 'zona' => 'Todo Huancayo', 'activo' => true],
        );

        foreach ($negocio->solicitudesPlan()->get() as $anterior) {
            Storage::disk('local')->delete($anterior->evidencia_ruta);
            $anterior->delete();
        }

        $admin = User::where('email', 'admin@checkitse.local')->value('id');
        $pagos = [
            ['destacado', 1, 49, 'plin', '77001234', now()->subMonths(5)],
            ['premium', 1, 99, 'yape', '77002345', now()->subMonths(4)],
            ['premium', 3, 267, 'yape', '77003456', now()->subMonthsNoOverflow(3)->addDays(4)],
        ];
        foreach ($pagos as [$plan, $meses, $monto, $metodo, $operacion, $fecha]) {
            $uuid = (string) Str::uuid();
            $ruta = "pagos/{$negocio->id}/{$uuid}.pdf";
            Storage::disk('local')->put($ruta, "%PDF-1.4\n% comprobante demo {$operacion}\n%%EOF");
            $negocio->solicitudesPlan()->create([
                'uuid' => $uuid,
                'user_id' => $usuario->id,
                'plan_actual' => ProveedorRecurso::PLAN_GRATUITO,
                'plan_solicitado' => $plan,
                'meses' => $meses,
                'monto_soles' => $monto,
                'metodo_pago' => $metodo,
                'numero_operacion' => 'DEMO'.$operacion,
                'fecha_pago' => $fecha->toDateString(),
                'evidencia_ruta' => $ruta,
                'evidencia_mime' => 'application/pdf',
                'evidencia_hash' => hash('sha256', $operacion),
                'estado' => SolicitudPlan::ESTADO_APROBADA,
                'revisado_por' => $admin,
                'revisado_en' => $fecha,
                'vigente_hasta' => $fecha->copy()->addMonthsNoOverflow($meses)->toDateString(),
            ]);
        }
    }
}
