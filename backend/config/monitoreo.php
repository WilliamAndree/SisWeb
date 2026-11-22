<?php

/*
|--------------------------------------------------------------------------
| Matriz de doble entrada para el control y monitoreo
|--------------------------------------------------------------------------
|
| Filas: los 13 procesos del mapa de macroprocesos (docs/informe/README.md).
| Columnas: indicadores que se calculan solos a partir de las pruebas
| (JUnit), la cobertura (Clover) y SonarQube.
|
| Cada proceso declara:
|   - pruebas: archivos de prueba (sin ".php") que lo respaldan.
|   - codigo:  prefijos de rutas dentro de backend/ que lo implementan, para
|              sumar su cobertura y sus observaciones de SonarQube.
|
| Si se agrega una prueba nueva, basta con añadirla a su proceso. El comando
| avisa qué pruebas quedaron sin proceso asignado.
|
*/

return [
    'umbrales' => [
        // Cobertura mínima para considerar un proceso "en verde" (misma que el Quality Gate).
        'cobertura_minima' => 80,
    ],

    // Opcional: si se definen (en .env, nunca en el repositorio), la matriz suma bugs y code smells por proceso.
    'sonar' => [
        'url' => env('SONAR_HOST_URL'),
        'token' => env('SONAR_TOKEN'),
        'proyecto' => env('SONAR_PROJECT_KEY', 'ITSE'),
    ],

    'niveles' => [
        'E' => 'Estratégico',
        'M' => 'Misional',
        'S' => 'Soporte',
    ],

    'procesos' => [
        [
            'codigo' => 'E1',
            'nombre' => 'Modelo de negocio y planes',
            'responsable' => 'Dirección del producto',
            'pruebas' => ['DirectorioPlanesTest'],
            'codigo_fuente' => ['app/Services/PlanesProveedorService.php', 'app/Http/Controllers/DirectorioController.php'],
        ],
        [
            'codigo' => 'E2',
            'nombre' => 'Calidad y mejora continua',
            'responsable' => 'Equipo de desarrollo',
            'pruebas' => [
                'JornadaCompletaComercianteTest', 'CheckItseIntegrationTest', 'CheckItseModulosTest', 'ContratosFrontendUxTest',
                'ContratoYSeguridadFase0Test', 'QARevisionFinalFase18Test', 'DesacoplamientoFlujoLegadoTest', 'TestEnvironmentTest',
                'NormativaArchitectureModelsTest', 'DemoWalkthroughSeederTest', 'RecorridoEmprendedorNuevoTest',
            ],
            'codigo_fuente' => ['app/Services/Monitoreo/'],
        ],
        [
            'codigo' => 'M1',
            'nombre' => 'Registro del local',
            'responsable' => 'Emprendedor / sistema',
            'pruebas' => ['Paso1DatosEstablecimientoTest', 'PortadaYCapturaInicialTest', 'StoreAutoevaluacionRequestTest', 'RegistroInicialChecklistTransitionTest'],
            'codigo_fuente' => ['app/Http/Requests/StoreAutoevaluacionRequest.php', 'app/Http/Controllers/EvaluacionController.php'],
        ],
        [
            'codigo' => 'M2',
            'nombre' => 'Autoevaluación ITSE',
            'responsable' => 'Emprendedor / sistema',
            'pruebas' => [
                'ChecklistDinamicoEndpointTest', 'ChecklistInteractivaViewTest', 'ChecklistUX032Test', 'ChecklistConsistenciaTddTest',
                'AutoevaluacionReglasTddTest', 'ApplicabilityEngineServiceTest', 'ItseRiskServiceTest', 'RecursosEducativosIntegrationTest', 'RecursoEducativoTest',
            ],
            'codigo_fuente' => [
                'app/Services/ApplicabilityEngineService.php', 'app/Services/ItseRiskService.php',
                'app/Services/Evaluacion/EvaluacionSyncService.php', 'app/Http/Requests/StoreChecklistDeclaracionesRequest.php',
            ],
        ],
        [
            'codigo' => 'M3',
            'nombre' => 'Resultado y plan de mejora',
            'responsable' => 'Emprendedor / sistema',
            'pruebas' => ['ResumenDescriptivoTest', 'ClasificacionTramiteResumenTest', 'ResultadoActualizadoTest', 'CierreAutoevaluacionTest', 'FlujosCriticosTddTest'],
            'codigo_fuente' => ['app/Http/Controllers/Traits/EvaluacionHelperTrait.php'],
        ],
        [
            'codigo' => 'M4',
            'nombre' => 'Subsanación con proveedores',
            'responsable' => 'Emprendedor y proveedor',
            'pruebas' => [
                'SubsanacionDirectaTest', 'SubsanacionSincronizadaTest', 'SubsanacionEvidenciasTest', 'TrazabilidadForenseSubsanacionTest', 'AnalisisMultimodalGeminiTest',
                'GeminiResilienciaTddTest', 'ValidacionResultadoIAServiceTest', 'ValidacionResultadoIATddTest', 'RecursosCercanosTest',
                'GeoLocationServiceTest', 'AfiliacionAliadosTest', 'DirectorioAfiliacionPaginaTest',
            ],
            'codigo_fuente' => [
                'app/Services/DirectorioAliadosService.php', 'app/Services/AI/', 'app/Services/GeoLocationService.php',
                'app/Http/Controllers/EventosProveedorController.php', 'app/Jobs/',
            ],
        ],
        [
            'codigo' => 'M5',
            'nombre' => 'Expediente digital',
            'responsable' => 'Emprendedor',
            'pruebas' => ['ExpedienteDigitalTest', 'InformePreventivoTest', 'InformePreventivoFase16Test'],
            'codigo_fuente' => ['app/Http/Controllers/ExpedienteDigitalController.php', 'app/Models/DocumentoExpediente.php'],
        ],
        [
            'codigo' => 'M6',
            'nombre' => 'Seguimiento del local',
            'responsable' => 'Emprendedor',
            'pruebas' => ['DashboardYPerfilCiudadanoTest', 'ReevaluacionTest', 'HistorialAutoevaluacionesTest', 'EliminarRegistroTest', 'Paso9HistorialVinculacionAccesoTest'],
            'codigo_fuente' => ['app/Http/Controllers/MisRegistrosController.php'],
        ],
        [
            'codigo' => 'S1',
            'nombre' => 'Cuentas y accesos',
            'responsable' => 'Sistema',
            'pruebas' => ['HybridIdentityTest', 'ConversionInvitadoTest', 'AutorizacionRutasUuidTest', 'AutorizacionUniformeTddTest'],
            'codigo_fuente' => ['app/Http/Controllers/Auth/', 'app/Http/Middleware/', 'app/Models/User.php'],
        ],
        [
            'codigo' => 'S2',
            'nombre' => 'Gestión de proveedores',
            'responsable' => 'Proveedor',
            'pruebas' => ['CuentasProveedorTest', 'EstadisticasYVentasProveedorTest'],
            'codigo_fuente' => [
                'app/Http/Controllers/ProveedorPanelController.php', 'app/Services/EstadisticasProveedorService.php',
                'app/Models/ProveedorRecurso.php', 'app/Models/OfertaProveedor.php', 'app/Models/VentaProveedor.php', 'app/Models/EventoProveedor.php',
            ],
        ],
        [
            'codigo' => 'S3',
            'nombre' => 'Cobros de planes',
            'responsable' => 'Proveedor y administrador',
            'pruebas' => ['PlanesYAdministracionTest'],
            'codigo_fuente' => ['app/Models/SolicitudPlan.php', 'app/Console/Commands/VencerPlanesProveedor.php'],
        ],
        [
            'codigo' => 'S4',
            'nombre' => 'Administración y monitoreo',
            'responsable' => 'Administrador',
            'pruebas' => ['PlanesYAdministracionTest', 'MatrizMonitoreoTest', 'ReportesImpactoTest'],
            'codigo_fuente' => ['app/Http/Controllers/AdminController.php', 'app/Http/Controllers/ReportesController.php', 'app/Services/ReportesImpactoService.php', 'app/Console/Commands/CrearAdministrador.php', 'app/Console/Commands/GenerarMatrizMonitoreo.php'],
        ],
        [
            'codigo' => 'S5',
            'nombre' => 'Plataforma y datos',
            'responsable' => 'Sistema',
            'pruebas' => ['AutoevaluacionIntegridadCicloVidaTest', 'IntegridadEvaluacionServiceTest', 'IntegridadCanonicaTddTest', 'EvidenciasSeguridadTddTest'],
            'codigo_fuente' => [
                'app/Services/Evaluacion/IntegridadEvaluacionService.php', 'app/Services/Evaluacion/EvidenciaPrivadaService.php', 'app/Models/Autoevaluacion.php',
            ],
        ],
    ],
];
