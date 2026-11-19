<?php

namespace App\Services\Monitoreo;

use Illuminate\Support\Facades\Http;
use SimpleXMLElement;
use Throwable;

/**
 * Construye la matriz de doble entrada para el control y monitoreo:
 * filas = procesos del mapa (config/monitoreo.php), columnas = indicadores
 * calculados de forma automática desde las pruebas, la cobertura y SonarQube.
 */
class MatrizMonitoreoService
{
    public const VERDE = 'verde';

    public const AMARILLO = 'amarillo';

    public const ROJO = 'rojo';

    /**
     * Resultados por archivo de prueba a partir de un reporte JUnit.
     *
     * @return array<string, array{total: int, fallidas: int, omitidas: int, segundos: float}>
     */
    public function leerPruebas(string $rutaJunit): array
    {
        $xml = $this->cargarXml($rutaJunit);
        $resultado = [];

        // Solo el nivel "archivo": se ignoran los sub-suites de datasets para no contar doble.
        foreach ($xml->xpath('//testsuite[@file][not(parent::testsuite[@file])]') ?: [] as $suite) {
            $nombre = $this->nombrePrueba($suite);
            $previo = $resultado[$nombre] ?? ['total' => 0, 'fallidas' => 0, 'omitidas' => 0, 'segundos' => 0.0];
            $resultado[$nombre] = [
                'total' => $previo['total'] + (int) $suite['tests'],
                'fallidas' => $previo['fallidas'] + (int) $suite['failures'] + (int) $suite['errors'],
                'omitidas' => $previo['omitidas'] + (int) $suite['skipped'],
                'segundos' => $previo['segundos'] + (float) $suite['time'],
            ];
        }

        return $resultado;
    }

    /**
     * Sentencias totales y cubiertas por archivo a partir de un reporte Clover.
     *
     * @return array<string, array{sentencias: int, cubiertas: int}>
     */
    public function leerCobertura(string $rutaClover): array
    {
        $xml = $this->cargarXml($rutaClover);
        $resultado = [];

        foreach ($xml->xpath('//file') ?: [] as $archivo) {
            $ruta = $this->rutaRelativa((string) $archivo['name']);
            if ($ruta === null || ! isset($archivo->metrics)) {
                continue;
            }
            $resultado[$ruta] = [
                'sentencias' => (int) $archivo->metrics['statements'],
                'cubiertas' => (int) $archivo->metrics['coveredstatements'],
            ];
        }

        return $resultado;
    }

    /**
     * Observaciones abiertas por archivo y estado del Quality Gate en SonarQube.
     * Devuelve null si SonarQube no responde: la matriz se genera igual, sin esas columnas.
     *
     * @return array{quality_gate: string, archivos: array<string, array{bugs: int, vulnerabilidades: int, code_smells: int}>}|null
     */
    public function leerSonar(string $url, string $token, string $proyecto): ?array
    {
        try {
            $cliente = fn () => Http::withBasicAuth($token, '')->timeout(20)->acceptJson();
            $gate = $cliente()->get(rtrim($url, '/').'/api/qualitygates/project_status', ['projectKey' => $proyecto])->throw()->json('projectStatus.status');

            $archivos = [];
            $pagina = 1;
            do {
                $respuesta = $cliente()->get(rtrim($url, '/').'/api/issues/search', [
                    'componentKeys' => $proyecto,
                    'resolved' => 'false',
                    'types' => 'BUG,VULNERABILITY,CODE_SMELL',
                    'ps' => 500,
                    'p' => $pagina,
                ])->throw()->json();

                foreach ($respuesta['issues'] ?? [] as $issue) {
                    $ruta = str_replace($proyecto.':', '', (string) ($issue['component'] ?? ''));
                    $clave = ['BUG' => 'bugs', 'VULNERABILITY' => 'vulnerabilidades'][$issue['type']] ?? 'code_smells';
                    $archivos[$ruta] ??= ['bugs' => 0, 'vulnerabilidades' => 0, 'code_smells' => 0];
                    $archivos[$ruta][$clave]++;
                }
                $pagina++;
            } while (($pagina - 1) * 500 < (int) ($respuesta['paging']['total'] ?? 0) && $pagina <= 20);

            return ['quality_gate' => $gate === 'OK' ? 'Aprobado' : 'No aprobado', 'archivos' => $archivos];
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Cruza procesos (filas) con indicadores (columnas) y calcula el semáforo.
     *
     * @param  array<string, array{total: int, fallidas: int, omitidas: int, segundos: float}>  $pruebas
     * @param  array<string, array{sentencias: int, cubiertas: int}>|null  $cobertura
     * @param  array{quality_gate: string, archivos: array<string, array{bugs: int, vulnerabilidades: int, code_smells: int}>}|null  $sonar
     * @return array{filas: list<array<string, mixed>>, niveles: list<array<string, mixed>>, global: array<string, mixed>, sin_proceso: list<string>}
     */
    public function construir(array $pruebas, ?array $cobertura, ?array $sonar): array
    {
        $config = config('monitoreo');
        $minima = (float) $config['umbrales']['cobertura_minima'];
        $asignadas = [];
        $filas = [];

        foreach ($config['procesos'] as $proceso) {
            $asignadas = array_merge($asignadas, $proceso['pruebas']);
            $filas[] = $this->fila($proceso, $config['niveles'], $pruebas, $cobertura, $sonar, $minima);
        }

        $sinProceso = array_values(array_diff(array_keys($pruebas), $asignadas));
        sort($sinProceso);

        return [
            'filas' => $filas,
            'niveles' => $this->resumenPorNivel($filas, $config['niveles']),
            'global' => $this->resumenGlobal($pruebas, $cobertura, $sonar, $filas),
            'sin_proceso' => $sinProceso,
        ];
    }

    /**
     * @param  array<string, mixed>  $proceso
     * @param  array<string, string>  $niveles
     * @param  array<string, array{total: int, fallidas: int, omitidas: int, segundos: float}>  $pruebas
     * @param  array<string, array{sentencias: int, cubiertas: int}>|null  $cobertura
     * @param  array{quality_gate: string, archivos: array<string, array{bugs: int, vulnerabilidades: int, code_smells: int}>}|null  $sonar
     * @return array<string, mixed>
     */
    private function fila(array $proceso, array $niveles, array $pruebas, ?array $cobertura, ?array $sonar, float $minima): array
    {
        $total = 0;
        $fallidas = 0;
        $faltantes = [];
        foreach ($proceso['pruebas'] as $archivo) {
            if (! isset($pruebas[$archivo])) {
                $faltantes[] = $archivo;

                continue;
            }
            $total += $pruebas[$archivo]['total'] - $pruebas[$archivo]['omitidas'];
            $fallidas += $pruebas[$archivo]['fallidas'];
        }

        $pctCobertura = $cobertura === null ? null : $this->porcentajeCobertura($cobertura, $proceso['codigo_fuente']);
        $observaciones = $sonar === null ? null : $this->sumarSonar($sonar['archivos'], $proceso['codigo_fuente']);

        [$estado, $motivo] = $this->semaforo($total, $fallidas, $pctCobertura, $observaciones, $minima, $faltantes);

        return [
            'nivel' => $niveles[substr($proceso['codigo'], 0, 1)] ?? '',
            'codigo' => $proceso['codigo'],
            'proceso' => $proceso['nombre'],
            'responsable' => $proceso['responsable'],
            'pruebas' => $total,
            'aprobadas' => $total - $fallidas,
            'fallidas' => $fallidas,
            'exito' => $total > 0 ? round(($total - $fallidas) / $total * 100, 1) : 0.0,
            'cobertura' => $pctCobertura,
            'bugs' => $observaciones['bugs'] ?? null,
            'vulnerabilidades' => $observaciones['vulnerabilidades'] ?? null,
            'code_smells' => $observaciones['code_smells'] ?? null,
            'estado' => $estado,
            'observacion' => $motivo,
        ];
    }

    /**
     * Regla del semáforo:
     *  - Rojo: sin pruebas, alguna prueba falla, o hay bugs/vulnerabilidades abiertos.
     *  - Amarillo: todo pasa, pero la cobertura está bajo el mínimo o falta un archivo de prueba declarado.
     *  - Verde: todo lo demás.
     *
     * @param  array{bugs: int, vulnerabilidades: int, code_smells: int}|null  $observaciones
     * @param  list<string>  $faltantes
     * @return array{0: string, 1: string}
     */
    private function semaforo(int $total, int $fallidas, ?float $cobertura, ?array $observaciones, float $minima, array $faltantes): array
    {
        $riesgos = ($observaciones['bugs'] ?? 0) + ($observaciones['vulnerabilidades'] ?? 0);

        $rojos = array_filter([
            $total === 0 ? 'Sin pruebas ejecutadas' : null,
            $fallidas > 0 ? "{$fallidas} prueba(s) fallan" : null,
            $riesgos > 0 ? "{$riesgos} bug(s) o vulnerabilidad(es) abiertos" : null,
        ]);
        if ($rojos !== []) {
            return [self::ROJO, implode('; ', $rojos)];
        }

        $amarillos = array_filter([
            $cobertura !== null && $cobertura < $minima ? "Cobertura {$cobertura} % bajo el mínimo de {$minima} %" : null,
            $faltantes !== [] ? 'No se ejecutó: '.implode(', ', $faltantes) : null,
        ]);
        if ($amarillos !== []) {
            return [self::AMARILLO, implode('; ', $amarillos)];
        }

        return [self::VERDE, 'Sin observaciones'];
    }

    /**
     * @param  array<string, array{sentencias: int, cubiertas: int}>  $cobertura
     * @param  list<string>  $prefijos
     */
    private function porcentajeCobertura(array $cobertura, array $prefijos): ?float
    {
        $sentencias = 0;
        $cubiertas = 0;
        foreach ($cobertura as $ruta => $datos) {
            if ($this->perteneceA($ruta, $prefijos)) {
                $sentencias += $datos['sentencias'];
                $cubiertas += $datos['cubiertas'];
            }
        }

        return $sentencias > 0 ? round($cubiertas / $sentencias * 100, 1) : null;
    }

    /**
     * @param  array<string, array{bugs: int, vulnerabilidades: int, code_smells: int}>  $archivos
     * @param  list<string>  $prefijos
     * @return array{bugs: int, vulnerabilidades: int, code_smells: int}
     */
    private function sumarSonar(array $archivos, array $prefijos): array
    {
        $suma = ['bugs' => 0, 'vulnerabilidades' => 0, 'code_smells' => 0];
        foreach ($archivos as $ruta => $datos) {
            if ($this->perteneceA($ruta, $prefijos)) {
                foreach ($suma as $clave => $valor) {
                    $suma[$clave] = $valor + $datos[$clave];
                }
            }
        }

        return $suma;
    }

    /**
     * @param  list<array<string, mixed>>  $filas
     * @param  array<string, string>  $niveles
     * @return list<array<string, mixed>>
     */
    private function resumenPorNivel(array $filas, array $niveles): array
    {
        $resumen = [];
        foreach ($niveles as $nombre) {
            $grupo = array_values(array_filter($filas, fn (array $f): bool => $f['nivel'] === $nombre));
            $estados = array_count_values(array_column($grupo, 'estado'));
            $resumen[] = [
                'nivel' => $nombre,
                'procesos' => count($grupo),
                'verde' => $estados[self::VERDE] ?? 0,
                'amarillo' => $estados[self::AMARILLO] ?? 0,
                'rojo' => $estados[self::ROJO] ?? 0,
                'cumplimiento' => count($grupo) > 0 ? round(($estados[self::VERDE] ?? 0) / count($grupo) * 100, 1) : 0.0,
            ];
        }

        return $resumen;
    }

    /**
     * @param  array<string, array{total: int, fallidas: int, omitidas: int, segundos: float}>  $pruebas
     * @param  array<string, array{sentencias: int, cubiertas: int}>|null  $cobertura
     * @param  array{quality_gate: string, archivos: array<string, array{bugs: int, vulnerabilidades: int, code_smells: int}>}|null  $sonar
     * @param  list<array<string, mixed>>  $filas
     * @return array<string, mixed>
     */
    private function resumenGlobal(array $pruebas, ?array $cobertura, ?array $sonar, array $filas): array
    {
        $total = array_sum(array_column($pruebas, 'total')) - array_sum(array_column($pruebas, 'omitidas'));
        $fallidas = array_sum(array_column($pruebas, 'fallidas'));
        $sentencias = $cobertura === null ? 0 : array_sum(array_column($cobertura, 'sentencias'));
        $estados = array_count_values(array_column($filas, 'estado'));

        return [
            'pruebas' => $total,
            'fallidas' => $fallidas,
            'exito' => $total > 0 ? round(($total - $fallidas) / $total * 100, 1) : 0.0,
            'cobertura' => $sentencias > 0 ? round(array_sum(array_column($cobertura, 'cubiertas')) / $sentencias * 100, 1) : null,
            'quality_gate' => $sonar['quality_gate'] ?? 'Sin datos de SonarQube',
            'procesos_verde' => $estados[self::VERDE] ?? 0,
            'procesos_amarillo' => $estados[self::AMARILLO] ?? 0,
            'procesos_rojo' => $estados[self::ROJO] ?? 0,
            'cumplimiento' => count($filas) > 0 ? round(($estados[self::VERDE] ?? 0) / count($filas) * 100, 1) : 0.0,
        ];
    }

    /**
     * @param  list<string>  $prefijos
     */
    private function perteneceA(string $ruta, array $prefijos): bool
    {
        foreach ($prefijos as $prefijo) {
            if ($ruta === $prefijo || (str_ends_with($prefijo, '/') && str_starts_with($ruta, $prefijo))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Nombre del archivo de prueba. El atributo "name" trae la clase
     * (Tests\Feature\XTest) en todos los casos; "file" a veces trae una
     * descripción en lugar de la ruta (clases PHPUnit con nombre legible).
     */
    private function nombrePrueba(SimpleXMLElement $suite): string
    {
        $clase = (string) $suite['name'];
        $segmento = substr($clase, (int) strrpos('\\'.$clase, '\\'));
        if (str_ends_with($segmento, 'Test')) {
            return $segmento;
        }

        return pathinfo(str_replace('\\', '/', (string) $suite['file']), PATHINFO_FILENAME);
    }

    /** Convierte cualquier ruta absoluta del reporte a "app/...". */
    private function rutaRelativa(string $ruta): ?string
    {
        return preg_match('#(?:^|/)(app/.+)$#', str_replace('\\', '/', $ruta), $m) ? $m[1] : null;
    }

    private function cargarXml(string $ruta): SimpleXMLElement
    {
        $xml = is_file($ruta) ? simplexml_load_file($ruta) : false;
        if ($xml === false) {
            throw new \RuntimeException("No se pudo leer el reporte: {$ruta}");
        }

        return $xml;
    }
}
