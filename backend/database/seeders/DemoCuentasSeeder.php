<?php

namespace Database\Seeders;

use App\Models\CategoriaSubsanacion;
use App\Models\OfertaProveedor;
use App\Models\ProveedorRecurso;
use App\Models\SolicitudPlan;
use App\Models\User;
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
        if (app()->environment('production')) {
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
                'plan' => ProveedorRecurso::PLAN_GRATUITO,
                'plan_vence_el' => null,
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

        $this->command?->info('Cuentas demo listas (contraseña: '.self::CLAVE_DEMO.'): admin@checkitse.local y proveedor@checkitse.local');
    }
}
