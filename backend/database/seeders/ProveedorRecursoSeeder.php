<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\CategoriaSubsanacion;
use App\Models\ProveedorRecurso;
use Illuminate\Database\Seeder;

class ProveedorRecursoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Asegurar la existencia de las categorías base de subsanación
        $categorias = [
            [
                'codigo' => 'EXTINTOR',
                'nombre' => 'Extintores y recargas',
                'descripcion' => 'Venta, recarga y mantenimiento de extintores PQS y Tipo K.',
            ],
            [
                'codigo' => 'ELECTRICO',
                'nombre' => 'Materiales e instalaciones eléctricas',
                'descripcion' => 'Tableros, llaves termomagnéticas, diferenciales y sistemas de puesta a tierra.',
            ],
            [
                'codigo' => 'SENALETICA',
                'nombre' => 'Señalética y medios de evacuación',
                'descripcion' => 'Señales de seguridad fotoluminiscentes, rutas de escape y luces de emergencia.',
            ],
            [
                'codigo' => 'ARQUITECTURA',
                'nombre' => 'Arquitectura y remodelaciones',
                'descripcion' => 'Adecuación de ambientes, anclaje sismorresistente y puertas de escape.',
            ],
        ];

        foreach ($categorias as $cat) {
            CategoriaSubsanacion::updateOrCreate(
                ['codigo' => $cat['codigo']],
                $cat
            );
        }

        // 2. Poblar los aliados técnicos homologados de Huancayo, El Tambo y Chilca
        $aliados = [
            [
                'categoria_codigo' => 'EXTINTOR',
                'rubro' => 'incendios',
                'razon_social' => 'Extintores Huancayo S.A.C.',
                'nombre_comercial' => 'Extintores Huancayo',
                'tipo_servicio' => 'Empresa Homologada en Recarga y Mantenimiento de Extintores',
                'telefono' => '+51964752010',
                'whatsapp' => '+51964752010',
                'direccion' => 'Jr. Cajamarca 240, Huancayo Centro',
                'distrito' => 'Huancayo',
                'latitud' => -12.06750000,
                'longitud' => -75.20900000,
                'servicios_ofrecidos' => 'Recarga de extintores PQS de 6kg y 9kg, Venta de extintores tipo K para cocinas, Inspección periódica y tarjetas de mantenimiento',
                'verificado' => true,
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'ELECTRICO',
                'rubro' => 'electricas',
                'razon_social' => 'Pozo a Tierra Mantaro E.I.R.L.',
                'nombre_comercial' => 'Pozo a Tierra Mantaro',
                'tipo_servicio' => 'Especialista en Sistemas de Puesta a Tierra y Protocolos CNE',
                'telefono' => '+51976541230',
                'whatsapp' => '+51976541230',
                'direccion' => 'Av. Ferrocarril 850, El Tambo',
                'distrito' => 'El Tambo',
                'latitud' => -12.05800000,
                'longitud' => -75.21500000,
                'servicios_ofrecidos' => 'Medición de resistencia de pozo a tierra menor a 25 Ohmios, Mantenimiento con sales higroscópicas y gel conductivo, Emisión de certificado y protocolo firmado por ingeniero electricista colegiado',
                'verificado' => true,
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'ELECTRICO',
                'rubro' => 'electricas',
                'razon_social' => 'Ingeniería Eléctrica Centro S.A.C.',
                'nombre_comercial' => 'Ingeniería Eléctrica Centro',
                'tipo_servicio' => 'Instalaciones Eléctricas, Tableros y Mandiles de Protección',
                'telefono' => '+51963488122',
                'whatsapp' => '+51963488122',
                'direccion' => 'Av. Huancavelica 1520, El Tambo',
                'distrito' => 'El Tambo',
                'latitud' => -12.05500000,
                'longitud' => -75.22000000,
                'servicios_ofrecidos' => 'Instalación de interruptores diferenciales 30mA, Termomagnéticos calibrados a la sección del cable, Fabricación y montaje de mandiles protectores en resina y metal',
                'verificado' => true,
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'SENALETICA',
                'rubro' => 'arquitectura_senaletica',
                'razon_social' => 'Señalética y Seguridad Andina E.I.R.L.',
                'nombre_comercial' => 'Señalética Andina',
                'tipo_servicio' => 'Fabricación y Distribución de Señalética Celtex NTP 399.010-1',
                'telefono' => '+51973560944',
                'whatsapp' => '+51973560944',
                'direccion' => 'Jr. Ancash 318, Huancayo Centro',
                'distrito' => 'Huancayo',
                'latitud' => -12.06600000,
                'longitud' => -75.20750000,
                'servicios_ofrecidos' => 'Señales fotoluminiscentes de salida y rutas de escape, Señalética de extintores y riesgo eléctrico, Carteles de aforo máximo permitido',
                'verificado' => true,
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'ARQUITECTURA',
                'rubro' => 'estructuras',
                'razon_social' => 'Remodelaciones y Estructuras Mantaro S.A.C.',
                'nombre_comercial' => 'Estructuras Mantaro',
                'tipo_servicio' => 'Adecuación Arquitectónica y Anclaje Sismorresistente',
                'telefono' => '+51948300117',
                'whatsapp' => '+51948300117',
                'direccion' => 'Av. Huancavelica 1610, El Tambo',
                'distrito' => 'El Tambo',
                'latitud' => -12.05400000,
                'longitud' => -75.22150000,
                'servicios_ofrecidos' => 'Anclaje sismorresistente a muro y piso de estanterías y anaqueles superiores a 1.80m, Instalación de láminas de seguridad de 4 micras en vidrios crudos, Apertura y sentido de giro hacia afuera en puertas de escape',
                'verificado' => true,
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'EXTINTOR',
                'rubro' => 'incendios',
                'razon_social' => 'Protección Contra Incendios Apu E.I.R.L.',
                'nombre_comercial' => 'Apu Seguridad Contra Incendios',
                'tipo_servicio' => 'Sistemas de Detección de Humo y Supresión de Fuego',
                'telefono' => '+51958406233',
                'whatsapp' => '+51958406233',
                'direccion' => 'Av. 9 de Diciembre 412, Chilca',
                'distrito' => 'Chilca',
                'latitud' => -12.08500000,
                'longitud' => -75.20500000,
                'servicios_ofrecidos' => 'Instalación y calibración de detectores de humo fotoeléctricos autónomos, Suministro y colocación de luces de emergencia LED de 90 minutos de autonomía, Extintores rodantes de acetato de potasio y PQS',
                'verificado' => true,
                'activo' => true,
            ],
        ];

        foreach ($aliados as $aliado) {
            $categoria = CategoriaSubsanacion::where('codigo', $aliado['categoria_codigo'])->firstOrFail();
            unset($aliado['categoria_codigo']);

            ProveedorRecurso::updateOrCreate(
                ['razon_social' => $aliado['razon_social']],
                array_merge($aliado, ['categoria_id' => $categoria->id])
            );
        }
    }
}
