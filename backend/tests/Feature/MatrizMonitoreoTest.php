<?php

use App\Services\Monitoreo\MatrizMonitoreoService;
use Illuminate\Support\Facades\Http;

use function Pest\Laravel\artisan;

/**
 * Matriz de doble entrada (procesos × indicadores) para el control y monitoreo.
 * Se prueba con reportes pequeños de ejemplo: JUnit (pruebas) y Clover (cobertura).
 */
const ARCHIVO_JUNIT = '/junit.xml';

const ARCHIVO_CLOVER = '/coverage.xml';

const JUNIT_EJEMPLO = <<<'XML'
    <?xml version="1.0" encoding="UTF-8"?>
    <testsuites><testsuite name="raiz" tests="9">
      <testsuite name="Tests\Feature\RegistroTest" file="/proyecto/tests/Feature/RegistroTest.php" tests="4" failures="0" errors="0" skipped="0" time="1.5"/>
      <testsuite name="Tests\Feature\ChecklistTest" file="tests\Feature\ChecklistTest.php" tests="3" failures="1" errors="0" skipped="0" time="0.5">
        <testsuite name="dataset" file="tests\Feature\ChecklistTest.php" tests="2" failures="1" errors="0" skipped="0" time="0.2"/>
      </testsuite>
      <testsuite name="Tests\Feature\CuentasTest" file="Cuentas (Tests\Feature\Cuentas)" tests="2" failures="0" errors="0" skipped="0" time="0.3"/>
      <testsuite name="Tests\Unit\GeometriaTest" file="tests/Unit/GeometriaTest.php" tests="5" failures="0" errors="0" skipped="0" time="0.1"/>
    </testsuite></testsuites>
    XML;

const CLOVER_EJEMPLO = <<<'XML'
    <?xml version="1.0" encoding="UTF-8"?>
    <coverage><project>
      <file name="/usr/src/app/Registro.php"><metrics statements="100" coveredstatements="95"/></file>
      <file name="C:\proyecto\backend\app\Checklist\Motor.php"><metrics statements="50" coveredstatements="45"/></file>
      <file name="/usr/src/app/Cuentas.php"><metrics statements="100" coveredstatements="60"/></file>
    </project></coverage>
    XML;

/** Crea una carpeta temporal con los reportes de ejemplo y devuelve su ruta. */
function carpetaConReportes(): string
{
    $carpeta = sys_get_temp_dir().DIRECTORY_SEPARATOR.'matriz-'.uniqid();
    mkdir($carpeta);
    file_put_contents($carpeta.ARCHIVO_JUNIT, JUNIT_EJEMPLO);
    file_put_contents($carpeta.ARCHIVO_CLOVER, CLOVER_EJEMPLO);

    return $carpeta;
}

function borrarCarpeta(string $carpeta): void
{
    array_map('unlink', glob($carpeta.'/*') ?: []);
    rmdir($carpeta);
}

beforeEach(function () {
    config()->set('monitoreo.umbrales.cobertura_minima', 80);
    config()->set('monitoreo.sonar', ['url' => null, 'token' => null, 'proyecto' => 'ITSE']);
    config()->set('monitoreo.procesos', [
        ['codigo' => 'M1', 'nombre' => 'Registro', 'responsable' => 'Emprendedor', 'pruebas' => ['RegistroTest'], 'codigo_fuente' => ['app/Registro.php']],
        ['codigo' => 'M2', 'nombre' => 'Autoevaluación', 'responsable' => 'Emprendedor', 'pruebas' => ['ChecklistTest'], 'codigo_fuente' => ['app/Checklist/']],
        ['codigo' => 'S1', 'nombre' => 'Cuentas', 'responsable' => 'Sistema', 'pruebas' => ['CuentasTest', 'NoExisteTest'], 'codigo_fuente' => ['app/Cuentas.php']],
        ['codigo' => 'S2', 'nombre' => 'Proveedores', 'responsable' => 'Proveedor', 'pruebas' => [], 'codigo_fuente' => []],
    ]);
});

test('cruza cada proceso con sus pruebas y su cobertura y calcula el semáforo', function () {
    $carpeta = carpetaConReportes();
    $servicio = app(MatrizMonitoreoService::class);
    $pruebas = $servicio->leerPruebas($carpeta.ARCHIVO_JUNIT);
    $matriz = $servicio->construir($pruebas, $servicio->leerCobertura($carpeta.ARCHIVO_CLOVER), null);
    borrarCarpeta($carpeta);
    $fila = fn (string $codigo): array => collect($matriz['filas'])->firstWhere('codigo', $codigo);

    // Los sub-suites de datasets no se cuentan dos veces, y el nombre sale de la clase aunque "file" sea una descripción.
    expect($pruebas['ChecklistTest'])->toMatchArray(['total' => 3, 'fallidas' => 1])
        ->and($pruebas)->toHaveKey('CuentasTest');

    expect($fila('M1'))->toMatchArray(['pruebas' => 4, 'fallidas' => 0, 'cobertura' => 95.0, 'estado' => 'verde'])
        ->and($fila('M2'))->toMatchArray(['fallidas' => 1, 'cobertura' => 90.0, 'estado' => 'rojo'])
        ->and($fila('M2')['observacion'])->toContain('1 prueba(s) fallan')
        ->and($fila('S1'))->toMatchArray(['pruebas' => 2, 'cobertura' => 60.0, 'estado' => 'amarillo'])
        ->and($fila('S1')['observacion'])->toContain('Cobertura 60')->toContain('NoExisteTest')
        ->and($fila('S2'))->toMatchArray(['pruebas' => 0, 'estado' => 'rojo', 'observacion' => 'Sin pruebas ejecutadas'])
        ->and($matriz['sin_proceso'])->toBe(['GeometriaTest'])
        ->and($matriz['global'])->toMatchArray(['pruebas' => 14, 'fallidas' => 1, 'procesos_verde' => 1, 'procesos_amarillo' => 1, 'procesos_rojo' => 2, 'cumplimiento' => 25.0])
        ->and(collect($matriz['niveles'])->firstWhere('nivel', 'Misional'))->toMatchArray(['procesos' => 2, 'verde' => 1, 'rojo' => 1]);
});

test('suma por proceso los bugs y code smells de SonarQube', function () {
    Http::fake([
        '*/api/qualitygates/*' => Http::response(['projectStatus' => ['status' => 'OK']]),
        '*/api/issues/search*' => Http::response([
            'paging' => ['total' => 3],
            'issues' => [
                ['component' => 'ITSE:app/Registro.php', 'type' => 'BUG'],
                ['component' => 'ITSE:app/Checklist/Motor.php', 'type' => 'CODE_SMELL'],
                ['component' => 'ITSE:app/Checklist/Motor.php', 'type' => 'CODE_SMELL'],
            ],
        ]),
    ]);

    $carpeta = carpetaConReportes();
    $servicio = app(MatrizMonitoreoService::class);
    $sonar = $servicio->leerSonar('http://sonar.test', 'token', 'ITSE');
    $matriz = $servicio->construir($servicio->leerPruebas($carpeta.ARCHIVO_JUNIT), null, $sonar);
    borrarCarpeta($carpeta);

    expect($sonar['quality_gate'])->toBe('Aprobado')
        ->and(collect($matriz['filas'])->firstWhere('codigo', 'M1'))->toMatchArray(['bugs' => 1, 'estado' => 'rojo'])
        ->and(collect($matriz['filas'])->firstWhere('codigo', 'M2')['code_smells'])->toBe(2);
});

test('si SonarQube no responde, la matriz se genera sin esas columnas', function () {
    Http::fake(['*' => Http::response('caído', 500)]);

    expect(app(MatrizMonitoreoService::class)->leerSonar('http://sonar.test', 'token', 'ITSE'))->toBeNull();
});

test('el comando genera el Excel, la tabla en Markdown y acumula el historial', function () {
    $carpeta = carpetaConReportes();
    $argumentos = ['--junit' => $carpeta.ARCHIVO_JUNIT, '--cobertura' => $carpeta.ARCHIVO_CLOVER, '--salida' => $carpeta];

    artisan('checkitse:matriz-monitoreo', $argumentos)->expectsOutputToContain('Cumplimiento: 25')->assertSuccessful();
    artisan('checkitse:matriz-monitoreo', $argumentos)->assertSuccessful();

    $zip = new ZipArchive;
    $zip->open($carpeta.'/matriz-monitoreo.xlsx');
    $libro = $zip->getFromName('xl/workbook.xml');
    $hoja = $zip->getFromName('xl/worksheets/sheet1.xml');
    $zip->close();
    $markdown = file_get_contents($carpeta.'/matriz-monitoreo.md');
    $lineasHistorial = count(file($carpeta.'/historial.csv'));
    borrarCarpeta($carpeta);

    expect($libro)->toContain('name="Matriz"')->toContain('name="Resumen"')->toContain('name="Historial"')
        ->and($hoja)->toContain('Matriz de control y monitoreo')->toContain('Autoevaluación')->toContain('Amarillo')
        ->and($markdown)->toContain('| M1 | Registro |')->toContain('🔴 Rojo')
        // Encabezado + 4 procesos × 2 ejecuciones.
        ->and($lineasHistorial)->toBe(9);
});

test('en modo estricto falla si algún proceso queda en rojo', function () {
    $carpeta = carpetaConReportes();

    artisan('checkitse:matriz-monitoreo', ['--junit' => $carpeta.ARCHIVO_JUNIT, '--salida' => $carpeta, '--estricto' => true])->assertFailed();

    borrarCarpeta($carpeta);
});

test('sin reporte de pruebas explica cómo generarlo', function () {
    artisan('checkitse:matriz-monitoreo', ['--junit' => sys_get_temp_dir().'/no-existe-'.uniqid().'.xml', '--salida' => sys_get_temp_dir()])
        ->expectsOutputToContain('--log-junit')
        ->assertFailed();
});
