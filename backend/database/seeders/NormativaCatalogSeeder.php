<?php

namespace Database\Seeders;

use App\Models\ActividadComercial;
use App\Models\CriterioNormativo;
use App\Models\ReglaAplicabilidad;
use Illuminate\Database\Seeder;

class NormativaCatalogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Carga el catálogo normativo oficial congelado para CheckITSE Huancayo (Bloque 3 / Paso 1):
     * - 19 Códigos totales en catálogo
     * - 13 Criterios Activos (activo = true, estado_normativo = 'VIGENTE')
     * - 6 Criterios Suspendidos (activo = false, estado_normativo = 'SUSPENDIDO')
     * - Reglas base de aplicabilidad
     * - Actividades comerciales representativas de Huancayo
     */
    public function run(): void
    {
        $this->seedCriteriosNormativos();
        $this->seedReglasAplicabilidad();
        $this->seedActividadesComerciales();
    }

    private function seedCriteriosNormativos(): void
    {
        $criterios = [
            // --- 13 CRITERIOS ACTIVOS ---
            [
                'codigo_criterio' => 'CRIT-01',
                'categoria' => 'Protección Contra Incendios',
                'titulo' => 'Extintor portátil adecuado y vigente',
                'norma_base' => 'NTP 350.043-1 / RNE A.130 Art. 163',
                'articulo_referencia' => 'NTP 350.043-1 num. 7, 8, 9; RNE A.130 Art. 163',
                'tipo_criterio' => 'TIPO_B',
                'riesgo_asociado' => 'ALTO',
                'orden' => 1,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => '¿Cuenta con al menos un extintor ubicado en un lugar visible y libre de obstáculos, cuya tarjeta indique mantenimiento vigente (no mayor a 1 año) y su manómetro marque en la franja verde?',
                'que_observar' => 'Comprobar aguja del manómetro en franja verde operable, tarjeta con fecha menor a 1 año y altura máxima de 1.50 m.',
                'accion_mejora_orientativa' => 'Llevar a recargar o realizar mantenimiento preventivo con empresa autorizada de extintores.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-02A',
                'categoria' => 'Protección Contra Incendios',
                'titulo' => 'Extintor especializado Clase K',
                'norma_base' => 'RNE Norma A.130 Art. 165',
                'articulo_referencia' => 'RNE A.130 Art. 165 / NTP 350.043-1 num. 8.1.4',
                'tipo_criterio' => 'TIPO_B',
                'riesgo_asociado' => 'ALTO',
                'orden' => 2,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => 'Si en su negocio utiliza freidoras industriales, planchas o cocinas con abundante aceite o grasa: ¿dispone de un extintor rotulado específicamente como "Clase K" a menos de 9 metros de la cocina y con mantenimiento al día?',
                'que_observar' => 'Verificar símbolo "K" en extintor de acetato de potasio o químico húmedo, manómetro presurizado y tarjeta al día.',
                'accion_mejora_orientativa' => 'Adquirir extintor químico húmedo Clase K específico para fuegos de grasas y aceites de cocina.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-02B',
                'categoria' => 'Señalización y Evacuación',
                'titulo' => 'Señalización básica de seguridad y evacuación',
                'norma_base' => 'NTP 399.010-1 / RNE Norma A.130 Arts. 38 y 39',
                'articulo_referencia' => 'NTP 399.010-1 num. 5, 6, 7; RNE A.130 Art. 38',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'MEDIO',
                'orden' => 3,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => '¿Tiene colocadas y visibles las señales de seguridad reglamentarias (flechas de "Salida", cartel de "Extintor" sobre el equipo y advertencia de "Riesgo Eléctrico" en el tablero)?',
                'que_observar' => 'Observar carteles legibles, fotoluminiscentes o iluminados en rutas de evacuación y equipos de auxilio.',
                'accion_mejora_orientativa' => 'Instalar señales normalizadas fotoluminiscentes en las rutas de escape y equipos de protección.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-03',
                'categoria' => 'Medios de Evacuación',
                'titulo' => 'Rutas y pasadizos de evacuación libres de obstáculos',
                'norma_base' => 'RNE Norma A.010 Art. 25 / RNE Norma A.130 Art. 22',
                'articulo_referencia' => 'RNE A.010 Art. 25; RNE A.130 Art. 22',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'ALTO',
                'orden' => 4,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => '¿Los pasadizos de circulación interna y el camino hacia la puerta de salida están despejados, sin mercadería, cajas ni estorbo que reduzca el paso?',
                'que_observar' => 'Constatar visualmente que no existan fardos, cajas o muebles estrechando las vías de evacuación.',
                'accion_mejora_orientativa' => 'Reordenar mercadería y despejar pasadizos para mantener continuo y libre el ancho de paso.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-04',
                'categoria' => 'Medios de Evacuación',
                'titulo' => 'Puertas de evacuación libres de trabas durante atención',
                'norma_base' => 'RNE Norma A.010 Art. 26 / RNE Norma A.130 Arts. 5 al 8',
                'articulo_referencia' => 'RNE A.010 Art. 26; RNE A.130 Art. 5',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'ALTO',
                'orden' => 5,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => 'Durante las horas de atención al público: ¿la puerta de salida principal se puede abrir de inmediato sin uso de llaves ni candados (y hacia afuera si el aforo es de 50 a más personas)?',
                'que_observar' => 'Comprobar que en horario comercial no existan rejas con candado echado, cerrojos trabados o llaves requeridas para salir.',
                'accion_mejora_orientativa' => 'Retirar candados y cerrojos durante atención al público para permitir salida expedita inmediata.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-05',
                'categoria' => 'Instalaciones Eléctricas',
                'titulo' => 'Puesta a tierra con constancia documental ≤25 Ω',
                'norma_base' => 'CNE — Utilización Regla 060.712 / D.S. 002-2018-PCM / R.J. 016-2018 Anexo 4',
                'articulo_referencia' => 'CNE Regla 060.712; D.S. 002-2018-PCM; R.J. 016-2018 Anexo 4',
                'tipo_criterio' => 'TIPO_C',
                'riesgo_asociado' => 'ALTO',
                'orden' => 6,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => '¿Dispone de una constancia o protocolo de medición del pozo o sistema de puesta a tierra con fecha no mayor a 1 año, donde se consigne un valor de resistencia igual o menor a 25 Ohmios emitido por profesional calificado?',
                'que_observar' => 'Declaración documental de posesión del certificado o protocolo de medición técnica vigente.',
                'accion_mejora_orientativa' => 'Contratar a un profesional colegiado habilitado para realizar el mantenimiento del pozo y la medición anual.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-06',
                'categoria' => 'Instalaciones Eléctricas',
                'titulo' => 'Tablero con mandil protector y diferencial en tomacorrientes',
                'norma_base' => 'CNE — Utilización Reglas 080.010, 080.100 y 150.400',
                'articulo_referencia' => 'CNE Reglas 080.010, 080.100, 150.400',
                'tipo_criterio' => 'TIPO_B',
                'riesgo_asociado' => 'ALTO',
                'orden' => 7,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => '¿Su tablero eléctrico cuenta con mandil o contratapa que cubra los cables internos, circuitos con nombres legibles (rotulados) e interruptores diferenciales (con botón de prueba "T") en los circuitos de tomacorrientes?',
                'que_observar' => 'Mandil sin partes vivas expuestas, nombres en cada interruptor y pulsador "T" en diferenciales.',
                'accion_mejora_orientativa' => 'Colocar mandil protector al tablero, rotular circuitos e instalar llaves diferenciales de 30mA.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-07',
                'categoria' => 'Instalaciones Eléctricas',
                'titulo' => 'Cables canalizados, sin cables expuestos o "mellizos"',
                'norma_base' => 'CNE — Utilización Reglas 010.010 y 070.300',
                'articulo_referencia' => 'CNE Regla 070.300',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'ALTO',
                'orden' => 8,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => '¿Todos los cables eléctricos de su local están entubados o dentro de canaletas protectoras, sin cables mellizos sueltos ni empalmes pelados con cinta simple?',
                'que_observar' => 'Inspección visual de ausencia de cables mellizos usados como alambrado fijo o cables sueltos desprotegidos.',
                'accion_mejora_orientativa' => 'Canalizar conductores con electroductos PVC o canaletas y sustituir cables mellizos por cable libre de halógenos.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-08',
                'categoria' => 'Instalaciones Eléctricas y Evacuación',
                'titulo' => 'Luces de emergencia autónomas operativas',
                'norma_base' => 'RNE Norma A.130 Art. 40 / CNE — Utilización Regla 240.202',
                'articulo_referencia' => 'RNE A.130 Art. 40; CNE Regla 240.202',
                'tipo_criterio' => 'TIPO_B',
                'riesgo_asociado' => 'MEDIO',
                'orden' => 9,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => '¿Dispone de equipos de luz de emergencia enchufados hacia las salidas y pasadizos, y al presionar su botón de prueba o desconectarlos encienden de forma inmediata?',
                'que_observar' => 'Pulsar botón de test del equipo autónomo y corroborar encendido automático con batería.',
                'accion_mejora_orientativa' => 'Reemplazar baterías agotadas o adquirir luminarios autónomos de emergencia de al menos 90 min de autonomía.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-10',
                'categoria' => 'Instalaciones de Gas',
                'titulo' => 'Instalación segura de cilindros de GLP',
                'norma_base' => 'D.S. N° 027-94-EM Arts. 45 y 48 / NTP 321.123',
                'articulo_referencia' => 'D.S. 027-94-EM Arts. 45, 48; NTP 321.123',
                'tipo_criterio' => 'TIPO_B',
                'riesgo_asociado' => 'ALTO',
                'orden' => 10,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => 'Si utiliza gas (GLP): ¿sus balones de gas se ubican en un espacio con ventilación natural a nivel de piso, cuentan con regulador adecuado y manguera reforzada para gas asegurada con abrazaderas metálicas?',
                'que_observar' => 'Balón en área ventilada, sin mangueras de agua/jardín, regulador seguro y abrazaderas metálicas ajustadas.',
                'accion_mejora_orientativa' => 'Reemplazar manguera inadecuada por manguera normalizada de alta presión para GLP y ubicar balón en zona ventilada.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-11',
                'categoria' => 'Seguridad Estructural y Accesibilidad',
                'titulo' => 'Escaleras con pasamanos y peldaños antideslizantes',
                'norma_base' => 'RNE Norma A.010 Arts. 26 al 29',
                'articulo_referencia' => 'RNE A.010 Arts. 26 al 29',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'MEDIO',
                'orden' => 11,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => 'Si su local cuenta con escaleras para uso de clientes o trabajadores: ¿disponen de pasamanos firmemente anclados y bordes o pasos con material antideslizante?',
                'que_observar' => 'Pasamanos continuo firme a altura reglamentaria (0.90 m - 1.00 m) y bandas antideslizantes en los peldaños.',
                'accion_mejora_orientativa' => 'Instalar o asegurar pasamanos y colocar cintas antideslizantes de alto tránsito en bordes de pasos.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-13',
                'categoria' => 'Prevención Sísmica y Almacenamiento',
                'titulo' => 'Mobiliario alto y estanterías con arriostramiento antisísmico',
                'norma_base' => 'RNE Norma E.030 Capítulo 9',
                'articulo_referencia' => 'RNE E.030 Cap. 9 (Elementos No Estructurales)',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'MEDIO',
                'orden' => 12,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => 'Si en su negocio utiliza anaqueles, estanterías altas o vitrinas pesadas para mercadería: ¿se encuentran anclados o arriostrados a la pared o entre sí para evitar su caída durante un sismo?',
                'que_observar' => 'Fijación de anaqueles a muros o arriostramiento estructural que prevenga volteo sobre pasadizos.',
                'accion_mejora_orientativa' => 'Anclar estanterías con escuadras metálicas a muros sólidos y no sobrecargar niveles superiores.',
                'activo' => true,
            ],
            [
                'codigo_criterio' => 'CRIT-14A',
                'categoria' => 'Instalaciones Eléctricas',
                'titulo' => 'Espacio libre de 1 metro frente al tablero eléctrico',
                'norma_base' => 'CNE — Utilización Regla 020.024',
                'articulo_referencia' => 'CNE Regla 020.024',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'MEDIO',
                'orden' => 13,
                'estado_normativo' => 'VIGENTE',
                'pregunta_ciudadana' => '¿El espacio ubicado frente a su tablero de electricidad (al menos 1 metro alrededor) se mantiene completamente despejado, sin cajas de cartón, bultos de mercadería ni plásticos acumulados?',
                'que_observar' => 'Espacio de trabajo frontal libre de 1.00 m sin cajas, estantes u obstáculos que bloqueen acceso al tablero.',
                'accion_mejora_orientativa' => 'Retirar materiales combustibles y mercadería del frente del tablero eléctrico.',
                'activo' => true,
            ],

            // --- 6 CRITERIOS SUSPENDIDOS (activo = false) ---
            [
                'codigo_criterio' => 'CRIT-09',
                'categoria' => 'Primeros Auxilios',
                'titulo' => 'Botiquín básico de primeros auxilios',
                'norma_base' => 'Ley 29783 / R.M. 050-2013-TR',
                'articulo_referencia' => 'R.M. 050-2013-TR',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'BAJO',
                'orden' => 14,
                'estado_normativo' => 'SUSPENDIDO',
                'pregunta_ciudadana' => '¿Cuenta con botiquín básico de primeros auxilios abastecido y no vencido?',
                'que_observar' => 'Criterio suspendido por falta de obligatoriedad universal en normativa de edificación para comercio general.',
                'accion_mejora_orientativa' => 'Mantener como buena práctica orientativa sin exigencia sancionable.',
                'activo' => false,
            ],
            [
                'codigo_criterio' => 'CRIT-12',
                'categoria' => 'Señalización y Aforo',
                'titulo' => 'Señalización física exterior del cartel de aforo',
                'norma_base' => 'D.S. 002-2018-PCM',
                'articulo_referencia' => 'Pendiente de validación',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'BAJO',
                'orden' => 15,
                'estado_normativo' => 'SUSPENDIDO',
                'pregunta_ciudadana' => '¿Tiene colocado un cartel visible de aforo máximo en el acceso principal?',
                'que_observar' => 'Criterio suspendido: falta de sustento legal de exigencia universal de cartel exterior para todo comercio.',
                'accion_mejora_orientativa' => 'En reserva.',
                'activo' => false,
            ],
            [
                'codigo_criterio' => 'CRIT-14B',
                'categoria' => 'Protección Contra Incendios',
                'titulo' => 'Distancia de materiales combustibles a fuentes de calor',
                'norma_base' => 'RNE Norma A.130',
                'articulo_referencia' => 'Pendiente de validación',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'MEDIO',
                'orden' => 16,
                'estado_normativo' => 'SUSPENDIDO',
                'pregunta_ciudadana' => '¿Mantiene materiales combustibles a distancia de fuentes de calor abiertas?',
                'que_observar' => 'Criterio suspendido: sin artículo peruano prescriptivo de distancia métrica obligatoria general.',
                'accion_mejora_orientativa' => 'En reserva.',
                'activo' => false,
            ],
            [
                'codigo_criterio' => 'CRIT-15',
                'categoria' => 'Sistemas de Detección de Incendio',
                'titulo' => 'Sistema centralizado de detección y alarma contra incendios',
                'norma_base' => 'RNE Norma A.130 Art. 53',
                'articulo_referencia' => 'RNE A.130 Art. 53',
                'tipo_criterio' => 'TIPO_C',
                'riesgo_asociado' => 'ALTO',
                'orden' => 17,
                'estado_normativo' => 'SUSPENDIDO',
                'pregunta_ciudadana' => '¿Cuenta con sistema centralizado de detección y alarma contra incendios?',
                'que_observar' => 'Criterio suspendido: no exigible a pequeños comercios generales según escala y área del RNE.',
                'accion_mejora_orientativa' => 'En reserva para establecimientos de gran escala.',
                'activo' => false,
            ],
            [
                'codigo_criterio' => 'CRIT-16',
                'categoria' => 'Instalaciones de Ventilación',
                'titulo' => 'Campanas extractoras y ductos de grasa en cocinas',
                'norma_base' => 'RNE Norma EM.030 / R.M. 822-2018-MINSA',
                'articulo_referencia' => 'R.M. 822-2018-MINSA',
                'tipo_criterio' => 'TIPO_A',
                'riesgo_asociado' => 'MEDIO',
                'orden' => 18,
                'estado_normativo' => 'SUSPENDIDO',
                'pregunta_ciudadana' => '¿La campana extractora y ductos de grasa están limpios y con mantenimiento periódico?',
                'que_observar' => 'Criterio suspendido: falta norma peruana prescriptiva de frecuencias de desengrase vinculantes en ITSE.',
                'accion_mejora_orientativa' => 'En reserva.',
                'activo' => false,
            ],
            [
                'codigo_criterio' => 'CRIT-17',
                'categoria' => 'Instalaciones Especiales y Calderas',
                'titulo' => 'Calderas y recipientes sujetos a presión',
                'norma_base' => 'D.S. N° 42-F Arts. 475 al 485',
                'articulo_referencia' => 'D.S. 42-F Art. 475',
                'tipo_criterio' => 'TIPO_C',
                'riesgo_asociado' => 'MUY_ALTO',
                'orden' => 19,
                'estado_normativo' => 'SUSPENDIDO',
                'pregunta_ciudadana' => '¿Dispone de certificado de prueba hidrostática y mantenimiento vigente para calderas de vapor?',
                'que_observar' => 'Criterio suspendido: ámbito industrial pesado sin variable de activación en el Paso 1 de autoevaluación.',
                'accion_mejora_orientativa' => 'En reserva para inspecciones industriales especializadas.',
                'activo' => false,
            ],
        ];

        foreach ($criterios as $data) {
            CriterioNormativo::updateOrCreate(
                ['codigo_criterio' => $data['codigo_criterio']],
                $data
            );
        }
    }

    private function seedReglasAplicabilidad(): void
    {
        $criterios = CriterioNormativo::all()->keyBy('codigo_criterio');

        // 1. Regla para CRIT-10 (GLP) - Condicional estricta
        if (isset($criterios['CRIT-10'])) {
            ReglaAplicabilidad::updateOrCreate(
                ['criterio_id' => $criterios['CRIT-10']->id],
                [
                    'condicion_activacion' => 'USA_GLP',
                    'operador_logico' => 'AND',
                    'condiciones_compuestas' => [
                        'campo' => 'usa_glp',
                        'operador' => '==',
                        'valor' => true,
                    ],
                    'estado_regla' => 'ACTIVA',
                ]
            );
        }

        // 2. Reglas Universales activas
        $universales = [
            'CRIT-01',
            'CRIT-02B',
            'CRIT-03',
            'CRIT-04',
            'CRIT-05',
            'CRIT-06',
            'CRIT-07',
            'CRIT-08',
            'CRIT-14A',
        ];

        foreach ($universales as $codigo) {
            if (isset($criterios[$codigo])) {
                ReglaAplicabilidad::updateOrCreate(
                    ['criterio_id' => $criterios[$codigo]->id],
                    [
                        'condicion_activacion' => 'UNIVERSAL',
                        'operador_logico' => 'AND',
                        'condiciones_compuestas' => [
                            'tipo' => 'UNIVERSAL',
                        ],
                        'estado_regla' => 'ACTIVA',
                    ]
                );
            }
        }

        // 3. Criterios condicionales gobernados por variables de condición física (Paso 2)
        // CRIT-02A (Equipos de fritura), CRIT-11 (Escaleras), CRIT-13 (Estanterías altas)
        if (isset($criterios['CRIT-02A'])) {
            ReglaAplicabilidad::updateOrCreate(
                ['criterio_id' => $criterios['CRIT-02A']->id],
                [
                    'condicion_activacion' => 'TIENE_EQUIPOS_FRITURA',
                    'operador_logico' => 'AND',
                    'condiciones_compuestas' => [
                        'campo' => 'tiene_equipos_fritura',
                        'operador' => '==',
                        'valor' => true,
                    ],
                    'estado_regla' => 'ACTIVA',
                ]
            );
        }

        if (isset($criterios['CRIT-11'])) {
            ReglaAplicabilidad::updateOrCreate(
                ['criterio_id' => $criterios['CRIT-11']->id],
                [
                    'condicion_activacion' => 'TIENE_ESCALERAS',
                    'operador_logico' => 'AND',
                    'condiciones_compuestas' => [
                        'campo' => 'tiene_escaleras',
                        'operador' => '==',
                        'valor' => true,
                    ],
                    'estado_regla' => 'ACTIVA',
                ]
            );
        }

        if (isset($criterios['CRIT-13'])) {
            ReglaAplicabilidad::updateOrCreate(
                ['criterio_id' => $criterios['CRIT-13']->id],
                [
                    'condicion_activacion' => 'TIENE_ESTANTERIAS_ALTAS',
                    'operador_logico' => 'AND',
                    'condiciones_compuestas' => [
                        'campo' => 'tiene_estanterias_altas',
                        'operador' => '==',
                        'valor' => true,
                    ],
                    'estado_regla' => 'ACTIVA',
                ]
            );
        }
    }

    private function seedActividadesComerciales(): void
    {
        $actividades = [
            [
                'nombre_actividad' => 'Bodega y Abarrotes',
                'ciiu_codigo' => '4711',
                'ciiu_descripcion' => 'Venta al por menor en comercios no especializados',
                'funcion_itse' => 'Comercio',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
            [
                'nombre_actividad' => 'Restaurante / Cafetería',
                'ciiu_codigo' => '5610',
                'ciiu_descripcion' => 'Actividades de restaurantes y de servicio móvil de comidas',
                'funcion_itse' => 'Encuentro',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
            [
                'nombre_actividad' => 'Tienda de Ropa / Bazar',
                'ciiu_codigo' => '4771',
                'ciiu_descripcion' => 'Venta al por menor de prendas de vestir y calzado',
                'funcion_itse' => 'Comercio',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
            [
                'nombre_actividad' => 'Ferretería',
                'ciiu_codigo' => '4752',
                'ciiu_descripcion' => 'Venta al por menor de artículos de ferretería y pinturas',
                'funcion_itse' => 'Comercio',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
            [
                'nombre_actividad' => 'Farmacia / Botica',
                'ciiu_codigo' => '4772',
                'ciiu_descripcion' => 'Venta al por menor de productos farmacéuticos y médicos',
                'funcion_itse' => 'Salud / Comercio',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
            [
                'nombre_actividad' => 'Panadería y Pastelería',
                'ciiu_codigo' => '1071',
                'ciiu_descripcion' => 'Elaboración y venta de productos de panadería',
                'funcion_itse' => 'Producción / Comercio',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
            [
                'nombre_actividad' => 'Peluquería / Salón de Belleza',
                'ciiu_codigo' => '9602',
                'ciiu_descripcion' => 'Peluquería y otros tratamientos de belleza',
                'funcion_itse' => 'Servicios',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
            [
                'nombre_actividad' => 'Librería y Papelería',
                'ciiu_codigo' => '4761',
                'ciiu_descripcion' => 'Venta al por menor de libros, periódicos y artículos de papelería',
                'funcion_itse' => 'Comercio',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
            [
                'nombre_actividad' => 'Taller de Reparación y Servicios',
                'ciiu_codigo' => '9529',
                'ciiu_descripcion' => 'Reparación de otros efectos personales y enseres domésticos',
                'funcion_itse' => 'Servicios',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
            [
                'nombre_actividad' => 'Oficinas Administrativas / Consultorios',
                'ciiu_codigo' => '8211',
                'ciiu_descripcion' => 'Servicios administrativos combinados y profesionales',
                'funcion_itse' => 'Administrativo',
                'estado_validacion' => 'VALIDADO',
                'activo' => true,
            ],
        ];

        foreach ($actividades as $actividad) {
            ActividadComercial::updateOrCreate(
                ['nombre_actividad' => $actividad['nombre_actividad']],
                $actividad
            );
        }
    }
}
