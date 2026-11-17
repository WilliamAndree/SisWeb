<?php

/*
|--------------------------------------------------------------------------
| Expediente digital ITSE
|--------------------------------------------------------------------------
|
| Documentos que el emprendedor sube para llegar a su municipalidad con todo
| ordenado. Qué es obligatorio depende de la modalidad de ITSE:
|
|  - EX_POST (riesgo bajo o medio): Declaración Jurada de Cumplimiento,
|    adjunta a la solicitud de licencia (D.S. N° 002-2018-PCM, art. 20.1).
|  - EX_ANTE (riesgo alto o muy alto): documentos técnicos a) a f) del
|    art. 25.1 del mismo decreto.
|
| `obligatorio_en` lista las modalidades donde el documento es requisito; en
| las demás se muestra como opcional solo si aparece en `opcional_en`.
|
*/

$posterior = 'EX_POST';
$previa = 'EX_ANTE';
$imagenesYPdf = ['pdf', 'jpg', 'jpeg', 'png', 'webp'];

return [
    'tamano_maximo_kb' => 10240,

    'documentos' => [
        [
            'tipo' => 'declaracion_jurada',
            'titulo' => 'Declaración Jurada de Cumplimiento (Anexo 4)',
            'descripcion' => 'Formato firmado donde declaras que tu local cumple las condiciones de seguridad.',
            'como_conseguirlo' => 'Descárgalo ya llenado desde tu resumen en CheckITSE, imprímelo, fírmalo y súbelo escaneado o en foto.',
            'base_legal' => 'D.S. N° 002-2018-PCM, art. 20.1',
            'formatos' => $imagenesYPdf,
            'obligatorio_en' => [$posterior],
            'opcional_en' => [$previa],
        ],
        [
            'tipo' => 'croquis_ubicacion',
            'titulo' => 'Croquis de ubicación',
            'descripcion' => 'Dibujo simple que muestra dónde está tu local respecto a calles y referencias.',
            'como_conseguirlo' => 'Puedes hacerlo con el editor de croquis de CheckITSE y exportarlo en PDF.',
            'base_legal' => 'D.S. N° 002-2018-PCM, art. 25.1 a)',
            'formatos' => $imagenesYPdf,
            'obligatorio_en' => [$previa],
            'opcional_en' => [$posterior],
        ],
        [
            'tipo' => 'plano_arquitectura',
            'titulo' => 'Plano de arquitectura y cálculo de aforo',
            'descripcion' => 'Distribución de ambientes del local con el cálculo de cuántas personas caben.',
            'como_conseguirlo' => 'Lo elabora un arquitecto o ingeniero. Pídelo en PDF.',
            'base_legal' => 'D.S. N° 002-2018-PCM, art. 25.1 b)',
            'formatos' => $imagenesYPdf,
            'obligatorio_en' => [$previa],
            'opcional_en' => [],
        ],
        [
            'tipo' => 'plano_electrico',
            'titulo' => 'Plano de tableros eléctricos y cuadro de cargas',
            'descripcion' => 'Ubicación de los tableros, diagrama unifilar y cuadro de cargas.',
            'como_conseguirlo' => 'Lo elabora un ingeniero electricista colegiado.',
            'base_legal' => 'D.S. N° 002-2018-PCM, art. 25.1 c)',
            'formatos' => $imagenesYPdf,
            'obligatorio_en' => [$previa],
            'opcional_en' => [],
        ],
        [
            'tipo' => 'certificado_pozo_tierra',
            'titulo' => 'Certificado de medición del pozo a tierra',
            'descripcion' => 'Constancia vigente de que el pozo a tierra mide 25 ohmios o menos.',
            'como_conseguirlo' => 'Lo emite un electricista o ingeniero al medir tu pozo. Búscalo en Aliados técnicos.',
            'base_legal' => 'D.S. N° 002-2018-PCM, art. 25.1 d)',
            'formatos' => $imagenesYPdf,
            'obligatorio_en' => [$previa],
            'opcional_en' => [$posterior],
        ],
        [
            'tipo' => 'plan_seguridad',
            'titulo' => 'Plan de seguridad del establecimiento',
            'descripcion' => 'Documento con rutas de evacuación, responsables y qué hacer en una emergencia.',
            'como_conseguirlo' => 'Puede prepararlo un especialista en seguridad. Debe incluir el plano de evacuación.',
            'base_legal' => 'D.S. N° 002-2018-PCM, art. 25.1 e)',
            'formatos' => $imagenesYPdf,
            'obligatorio_en' => [$previa],
            'opcional_en' => [],
        ],
        [
            'tipo' => 'protocolos_equipos',
            'titulo' => 'Protocolos de prueba de los equipos de seguridad',
            'descripcion' => 'Constancias de mantenimiento de extintores, luces de emergencia y detectores.',
            'como_conseguirlo' => 'Los entrega la empresa que recarga o mantiene tus equipos.',
            'base_legal' => 'D.S. N° 002-2018-PCM, art. 25.1 f)',
            'formatos' => $imagenesYPdf,
            'obligatorio_en' => [$previa],
            'opcional_en' => [$posterior],
        ],
        [
            'tipo' => 'recibo_pago',
            'titulo' => 'Recibo de pago del trámite',
            'descripcion' => 'Comprobante del derecho de trámite de tu licencia o ITSE.',
            'como_conseguirlo' => 'Lo obtienes al pagar en tu municipalidad. El monto está en su TUPA.',
            'base_legal' => 'D.S. N° 002-2018-PCM, art. 6',
            'formatos' => $imagenesYPdf,
            'obligatorio_en' => [],
            'opcional_en' => [$posterior, $previa],
        ],
    ],
];
