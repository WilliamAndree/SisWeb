<?php

namespace Database\Seeders;

use App\Models\CategoriaSubsanacion;
use App\Models\CriterioNormativo;
use App\Models\ProveedorRecurso;
use App\Models\RecursoEducativo;
use App\Models\User;
use Illuminate\Database\Seeder;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::updateOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => Hash::make('password')]
        );

        $this->call(NormativaCatalogSeeder::class);
        $this->call(ProveedorRecursoSeeder::class);
        $this->seedRecursosEducativos();
    }

    /**
     * Catálogo educativo de micro-learning para la autoevaluación ciudadana.
     * Vinculado con el catálogo normativo oficial (CRIT-01 a CRIT-13).
     */
    private function seedRecursosEducativos(): void
    {
        $criterio01 = CriterioNormativo::where('codigo_criterio', 'CRIT-01')->first();
        $criterio06 = CriterioNormativo::where('codigo_criterio', 'CRIT-06')->first();
        $criterio08 = CriterioNormativo::where('codigo_criterio', 'CRIT-08')->first();

        $recursos = [
            [
                'criterio_normativo_id' => $criterio01?->id,
                'titulo' => 'Extintor PQS: cómo verificar el manómetro y la operatividad',
                'descripcion_corta' => 'Video educativo que enseña a revisar la aguja del manómetro en la zona verde, el precinto, la tarjeta de mantenimiento y la vigencia de la carga del extintor PQS antes de una inspección.',
                'tipo' => RecursoEducativo::TIPO_VIDEO,
                'url' => 'https://www.youtube.com/watch?v=HjS1NE54ap0',
                'fuente_autor' => 'CGBVP / Indeci',
                'duracion_estimada' => '3 min',
                'activo' => true,
            ],
            [
                'criterio_normativo_id' => $criterio08?->id,
                'titulo' => 'Luz de emergencia: botón de test y autonomía de batería',
                'descripcion_corta' => 'Video que muestra cómo usar el botón de prueba de los luminarios de emergencia y verificar la autonomía mínima de la batería (90 minutos) para mantener operativa la vía de evacuación.',
                'tipo' => RecursoEducativo::TIPO_VIDEO,
                'url' => 'https://www.youtube.com/watch?v=_frRgvwU8mA',
                'fuente_autor' => null,
                'duracion_estimada' => null,
                'activo' => true,
            ],
            [
                'criterio_normativo_id' => $criterio06?->id,
                'titulo' => 'Diferencia entre llave termomagnética y diferencial de 30mA',
                'descripcion_corta' => 'Video que explica la diferencia entre el interruptor termomagnético (protege la instalación contra sobrecargas) y el interruptor diferencial de 30 mA (protege a las personas contra fugas a tierra).',
                'tipo' => RecursoEducativo::TIPO_VIDEO,
                'url' => 'https://www.youtube.com/watch?v=o4MOsqcJixA',
                'fuente_autor' => null,
                'duracion_estimada' => null,
                'activo' => true,
            ],
            [
                'criterio_normativo_id' => null, // Permanece huérfano/inactivo por ambigüedad normativa entre señalización (CRIT-02B) y pasillos de evacuación (CRIT-03)
                'titulo' => 'Rutas de evacuación: señalización y ancho mínimo de pasillo',
                'descripcion_corta' => 'Video educativo sobre diseño y revisión de medios de evacuación: señalización de salidas, pasillos despejados y ancho útil mínimo de 0.90 m - 1.20 m en vías de escape.',
                'tipo' => RecursoEducativo::TIPO_VIDEO,
                'url' => 'https://www.youtube.com/watch?v=F0CjEP4zy7Q',
                'fuente_autor' => null,
                'duracion_estimada' => null,
                'activo' => true,
            ],
        ];

        foreach ($recursos as $recurso) {
            RecursoEducativo::updateOrCreate(
                ['url' => $recurso['url']],
                $recurso
            );
        }
    }

    /**
     * Directorio referencial de categorías y proveedores de subsanación del
     * Valle del Mantaro. Datos comunitarios orientativos para que el ciudadano
     * encuentre apoyo cercano; no constituyen recomendación ni relación con la
     * inspección oficial.
     */
    private function seedCategoriasYProveedoresRecursos(): void
    {
        $categorias = [
            [
                'codigo' => 'EXTINTOR',
                'nombre' => 'Extintores y recargas',
                'descripcion' => 'Venta, recarga y mantenimiento de extintores PQS.',
            ],
            [
                'codigo' => 'ELECTRICO',
                'nombre' => 'Materiales e instalaciones eléctricas',
                'descripcion' => 'Tableros, llaves termomagnéticas, diferenciales y luminarios de emergencia.',
            ],
            [
                'codigo' => 'SENALETICA',
                'nombre' => 'Señalética y medios de evacuación',
                'descripcion' => 'Señales de seguridad, rutas de evacuación y carteles de salida.',
            ],
            [
                'codigo' => 'ARQUITECTURA',
                'nombre' => 'Arquitectura y remodelaciones',
                'descripcion' => 'Adecuación de ambientes, puertas de emergencia y protección de estructuras.',
            ],
        ];

        foreach ($categorias as $categoria) {
            CategoriaSubsanacion::updateOrCreate(
                ['codigo' => $categoria['codigo']],
                $categoria
            );
        }

        $proveedores = [
            [
                'categoria_codigo' => 'EXTINTOR',
                'razon_social' => 'Extintores Centro del Mantaro S.A.C.',
                'nombre_comercial' => 'Extintores Huancayo',
                'telefono' => '+51964752010',
                'whatsapp' => '+51964752010',
                'direccion' => 'Jr. Cajamarca 240, Huancayo Centro',
                'distrito' => 'Huancayo',
                'latitud' => -12.0675,
                'longitud' => -75.2090,
                'servicios_ofrecidos' => 'Recarga de extintores PQS, mantenimiento y revisión de manómetros.',
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'ELECTRICO',
                'razon_social' => 'Comercial El Tambino E.I.R.L.',
                'nombre_comercial' => 'Ferretería El Tambino',
                'telefono' => '+51963488122',
                'whatsapp' => '+51963488122',
                'direccion' => 'Av. Huancavelica 1520, El Tambo',
                'distrito' => 'El Tambo',
                'latitud' => -12.0550,
                'longitud' => -75.2200,
                'servicios_ofrecidos' => 'Llaves termomagnéticas, diferenciales 30mA y luminarios de emergencia.',
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'ELECTRICO',
                'razon_social' => 'Materiales Eléctricos Próceres E.I.R.L.',
                'nombre_comercial' => 'Electro Materiales Próceres',
                'telefono' => '+51998240018',
                'whatsapp' => '+51998240018',
                'direccion' => 'Av. Próceres 1030, Chilca',
                'distrito' => 'Chilca',
                'latitud' => -12.0850,
                'longitud' => -75.2050,
                'servicios_ofrecidos' => 'Tableros de distribución, interruptores termomagnéticos y luces de emergencia.',
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'SENALETICA',
                'razon_social' => 'Señalética Andina E.I.R.L.',
                'nombre_comercial' => 'Andina Señalética',
                'telefono' => '+51973560944',
                'whatsapp' => '+51973560944',
                'direccion' => 'Jr. Ancash 318, Huancayo Centro',
                'distrito' => 'Huancayo',
                'latitud' => -12.0660,
                'longitud' => -75.2075,
                'servicios_ofrecidos' => 'Señalización de rutas de evacuación, carteles de salida y señalética.',
                'activo' => true,
            ],
            [
                'categoria_codigo' => 'ARQUITECTURA',
                'razon_social' => 'Constructora y Remodelaciones Valle del Mantaro S.A.C.',
                'nombre_comercial' => 'Remodelaciones Huancayo',
                'telefono' => '+51948300117',
                'whatsapp' => '+51948300117',
                'direccion' => 'Av. Huancavelica 1610, El Tambo',
                'distrito' => 'El Tambo',
                'latitud' => -12.0540,
                'longitud' => -75.2215,
                'servicios_ofrecidos' => 'Adecuación de ambientes, puertas de emergencia y protección de estructuras.',
                'activo' => true,
            ],
        ];

        foreach ($proveedores as $proveedor) {
            $categoria = CategoriaSubsanacion::where('codigo', $proveedor['categoria_codigo'])->firstOrFail();
            unset($proveedor['categoria_codigo']);

            ProveedorRecurso::updateOrCreate(
                ['razon_social' => $proveedor['razon_social'], 'distrito' => $proveedor['distrito']],
                array_merge($proveedor, ['categoria_id' => $categoria->id])
            );
        }
    }
}
