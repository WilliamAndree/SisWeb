<?php

/*
|--------------------------------------------------------------------------
| Directorio Cívico Referencial de Aliados y Especialistas
|--------------------------------------------------------------------------
|
| Datos comunitarios orientativos de especialistas y comercios técnicos
| del Valle del Mantaro (Huancayo, El Tambo, Chilca).
|
*/

$huancayo = 'Huancayo';
$elTambo = 'El Tambo';
$chilca = 'Chilca';
$huancayoMetropolitano = 'Huancayo Metropolitano';
$huancayoElTambo = 'Huancayo / El Tambo';
$huancayoChilca = 'Huancayo / Chilca';
$categoriaElectricas = 'electricas';
$categoriaIncendios = 'incendios';
$categoriaArquitectura = 'arquitectura_senaletica';
$categoriaEstructuras = 'estructuras';

return [
    'directorio' => [
        [
            'id' => 'ELEC-001',
            'categoria' => $categoriaElectricas,
            'nombre_comercial' => 'Ingeniería Eléctrica Mantaro S.A.C.',
            'contacto_nombre' => 'Ing. Elmer Ccahuana Rojas',
            'especialidad_texto' => 'Especialista Eléctrico Colegiado',
            'telefono' => '51976541230',
            'whatsapp' => '51976541230',
            'sede' => $huancayo,
            'cobertura' => $huancayoMetropolitano,
            'verificado' => true,
            'servicios' => [
                'Medición de protocolo de pozo a tierra con informe de resistividad',
                'Suministro e instalación de tableros de distribución con mandil protector',
                'Diferenciales 30mA y termomagnéticos calibrados a la sección del cable',
                'Pruebas de aislamiento y certificación de instalaciones según CNE-U',
            ],
        ],
        [
            'id' => 'ELEC-002',
            'categoria' => $categoriaElectricas,
            'nombre_comercial' => 'Servicios Técnicos El Tambo E.I.R.L.',
            'contacto_nombre' => 'Sr. Wilder Ñaupa Mamani',
            'especialidad_texto' => 'Electricista Certificado en Instalaciones Eléctricas',
            'telefono' => '51942318745',
            'whatsapp' => '51942318745',
            'sede' => $elTambo,
            'cobertura' => $huancayoElTambo,
            'verificado' => true,
            'servicios' => [
                'Canalización de cables en canaletas y tuberías con prueba de operación',
                'Adecuación de tableros sin conductores expuestos',
                'Mantenimiento preventivo de redes interiores',
                'Suministro de tomacorrientes y luminarias de seguridad',
            ],
        ],
        [
            'id' => 'ELEC-003',
            'categoria' => $categoriaElectricas,
            'nombre_comercial' => 'Ferretería El Tambino E.I.R.L.',
            'contacto_nombre' => 'Sr. Rómulo Berrios Ayala',
            'especialidad_texto' => 'Suministro y Montaje Eléctrico',
            'telefono' => '51934129077',
            'whatsapp' => '51934129077',
            'sede' => $elTambo,
            'cobertura' => 'Huancayo / El Tambo / Chilca',
            'verificado' => true,
            'servicios' => [
                'Venta de diferenciales 30mA y llaves termomagnéticas',
                'Venta de tableros, canaletas y accesorios de instalación',
                'Asesoría en lectura de planos eléctricos',
            ],
        ],
        [
            'id' => 'INC-001',
            'categoria' => $categoriaIncendios,
            'nombre_comercial' => 'Extintores Centro del Mantaro S.A.C.',
            'contacto_nombre' => 'Ing. Percy Chanchamayo Ríos',
            'especialidad_texto' => 'Empresa Certificada en Recarga de Extintores',
            'telefono' => '51947520110',
            'whatsapp' => '51947520110',
            'sede' => $huancayo,
            'cobertura' => $huancayoMetropolitano,
            'verificado' => true,
            'servicios' => [
                'Recarga y certificación anual de extintores PQS con tarjeta de mantenimiento',
                'Venta y distribución de extintores de polvo químico seco',
                'Suministro e instalación de extintores Tipo K para cocinas comerciales',
                'Revisión y reposición de manómetros y sellos de seguridad',
            ],
        ],
        [
            'id' => 'INC-002',
            'categoria' => $categoriaIncendios,
            'nombre_comercial' => 'Protección Contra Incendios Apu E.I.R.L.',
            'contacto_nombre' => 'Ing. Luis Alberto Cervantes Peña',
            'especialidad_texto' => 'Especialista en Detección y Supresión de Incendios',
            'telefono' => '51958406233',
            'whatsapp' => '51958406233',
            'sede' => $chilca,
            'cobertura' => $huancayoChilca,
            'verificado' => true,
            'servicios' => [
                'Instalación de detectores de humo fotoeléctricos autónomos y centralizados',
                'Recarga y mantenimiento de extintores PQS de 6 kg y 9 kg',
                'Dimensionamiento y ubicación de extintores según área de riesgo',
                'Pruebas funcionales periódicas de la red de detección',
            ],
        ],
        [
            'id' => 'INC-003',
            'categoria' => $categoriaIncendios,
            'nombre_comercial' => 'Incendios & Seguridad Valle S.A.C.',
            'contacto_nombre' => 'Sr. Marcial Ttito Condori',
            'especialidad_texto' => 'Técnico Certificado en Recarga y Mantenimiento',
            'telefono' => '51933907456',
            'whatsapp' => '51933907456',
            'sede' => $huancayo,
            'cobertura' => $huancayoMetropolitano,
            'verificado' => true,
            'servicios' => [
                'Recarga de extintores PQS con servicio a domicilio',
                'Suministro de extintores Clase K para freidoras y cocinas',
                'Venta de detectores de humo y luminarias de emergencia',
                'Limpieza y desengrase de campanas extractoras y filtros metálicos',
            ],
        ],
        [
            'id' => 'ARQ-001',
            'categoria' => $categoriaArquitectura,
            'nombre_comercial' => 'Señalética Andina E.I.R.L.',
            'contacto_nombre' => 'Sr. Andrés Palomino Soria',
            'especialidad_texto' => 'Proveedor de Señalética de Seguridad Celtex',
            'telefono' => '51973560944',
            'whatsapp' => '51973560944',
            'sede' => $huancayo,
            'cobertura' => $huancayoMetropolitano,
            'verificado' => true,
            'servicios' => [
                'Señalética Celtex fotoluminiscente según NTP 399.010-1',
                'Kit de señales de Salida, Extintor y Riesgo Eléctrico',
                'Marcación de rutas de evacuación y puntos de reunión',
                'Carteles de aforo máximo permitido y señalización de almacén',
            ],
        ],
        [
            'id' => 'ARQ-002',
            'categoria' => $categoriaArquitectura,
            'nombre_comercial' => 'Iluminación de Emergencia Sacs IHS.A.C.',
            'contacto_nombre' => 'Ing. Joseth Ramos Huamán',
            'especialidad_texto' => 'Especialista en Iluminación de Emergencia',
            'telefono' => '51988745206',
            'whatsapp' => '51988745206',
            'sede' => $elTambo,
            'cobertura' => $huancayoElTambo,
            'verificado' => true,
            'servicios' => [
                'Suministro e instalación de luminarias de emergencia LED autónomas de 90 minutos',
                'Pruebas de autonomía de batería y cambio de baterías',
                'Luces de emergencia sobre puertas de salida y rutas de evacuación',
                'Mantenimiento programado y etiquetado de equipos',
            ],
        ],
        [
            'id' => 'ARQ-003',
            'categoria' => $categoriaArquitectura,
            'nombre_comercial' => 'Pisos Seguros Mantaro E.I.R.L.',
            'contacto_nombre' => 'Sr. Percy Salcedo Quispe',
            'especialidad_texto' => 'Aplicación de Cintas Antideslizantes y Señalización',
            'telefono' => '51902763918',
            'whatsapp' => '51902763918',
            'sede' => $huancayo,
            'cobertura' => $huancayoChilca,
            'verificado' => true,
            'servicios' => [
                'Aplicación de cintas antideslizantes en escaleras, rampas y pasillos',
                'Señalización fotoluminiscente de zócalos y nivelaciones',
                'Señalética de tránsito interno y demarcación de zonas',
                'Asesoría en cumplimiento de rutas de evacuación peatonales',
            ],
        ],
        [
            'id' => 'EST-001',
            'categoria' => $categoriaEstructuras,
            'nombre_comercial' => 'Anclajes y Estructuras Huancayo E.I.R.L.',
            'contacto_nombre' => 'Ing. Víctor Hugo Ticona Mamani',
            'especialidad_texto' => 'Especialista en Anclaje Sismorresistente',
            'telefono' => '51981264530',
            'whatsapp' => '51981264530',
            'sede' => $huancayo,
            'cobertura' => $huancayoMetropolitano,
            'verificado' => true,
            'servicios' => [
                'Anclaje sismorresistente a muro y piso de estanterías mayores a 1.80 m',
                'Refuerzo de anaqueles y racks metálicos',
                'Verificación de anclajes existentes con peritaje básico',
                'Emisión de informe de conformidad estructural referencial',
            ],
        ],
        [
            'id' => 'EST-002',
            'categoria' => $categoriaEstructuras,
            'nombre_comercial' => 'Peritajes Técnicos Valle Verde S.A.C.',
            'contacto_nombre' => 'Ing. Miriam Condori Apaza',
            'especialidad_texto' => 'Perito Registrado en Seguridad de Edificaciones',
            'telefono' => '51950471892',
            'whatsapp' => '51950471892',
            'sede' => $chilca,
            'cobertura' => $huancayoChilca,
            'verificado' => true,
            'servicios' => [
                'Peritaje básico de elementos estructurales y cubiertas',
                'Evaluación de riesgos de colapso en muros de tabiquería',
                'Instalación de lámina de seguridad en vidrios crudos',
                'Informe técnico de peritaje para el expediente ITSE',
            ],
        ],
        [
            'id' => 'EST-003',
            'categoria' => $categoriaEstructuras,
            'nombre_comercial' => 'Constructora y Remodelaciones Valle del Mantaro S.A.C.',
            'contacto_nombre' => 'Sr. Hernán Quispe Atahuanca',
            'especialidad_texto' => 'Adecuación de Ambientes y Estructuras',
            'telefono' => '51948300117',
            'whatsapp' => '51948300117',
            'sede' => $elTambo,
            'cobertura' => $huancayoElTambo,
            'verificado' => true,
            'servicios' => [
                'Anclaje de estanterías y anaqueles a muro o piso',
                'Adecuación de puertas de salida de apertura hacia afuera',
                'Despeje de rutas y salidas de escape con ancho útil mínimo',
                'Remodelaciones menores y resanes en muros',
            ],
        ],
    ],
];
