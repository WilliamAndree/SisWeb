<?php

namespace App\Console\Commands;

use App\Services\Monitoreo\ExportadorMatriz;
use App\Services\Monitoreo\MatrizMonitoreoService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;
use Throwable;

/**
 * Genera la matriz de doble entrada para el control y monitoreo
 * (procesos × indicadores) a partir de los reportes de pruebas, cobertura
 * y, si está disponible, SonarQube.
 */
class GenerarMatrizMonitoreo extends Command
{
    protected $signature = 'checkitse:matriz-monitoreo
        {--junit=junit.xml : Reporte JUnit de las pruebas (pest --log-junit)}
        {--cobertura=coverage.xml : Reporte Clover de cobertura (opcional)}
        {--sonar-url= : URL de SonarQube, por ejemplo http://localhost:9000 (o SONAR_HOST_URL)}
        {--sonar-token= : Token de SonarQube (o SONAR_TOKEN)}
        {--proyecto= : Clave del proyecto en SonarQube (por defecto ITSE)}
        {--salida=../docs/monitoreo : Carpeta donde se guardan el Excel, el Markdown y el historial}
        {--estricto : Termina con error si algún proceso queda en rojo (útil en CI)}';

    protected $description = 'Genera la matriz de control y monitoreo (procesos × indicadores)';

    public function handle(MatrizMonitoreoService $servicio, ExportadorMatriz $exportador): int
    {
        try {
            $pruebas = $servicio->leerPruebas($this->ruta((string) $this->option('junit')));
        } catch (Throwable $e) {
            $this->error($e->getMessage());
            $this->line('Primero ejecuta las pruebas con: php vendor/bin/pest --log-junit junit.xml');

            return self::FAILURE;
        }

        $rutaCobertura = $this->ruta((string) $this->option('cobertura'));
        $cobertura = is_file($rutaCobertura) ? $servicio->leerCobertura($rutaCobertura) : null;
        if ($cobertura === null) {
            $this->warn('Sin reporte de cobertura: la columna "Cobertura %" quedará como s/d.');
        }

        $sonar = null;
        $url = (string) ($this->option('sonar-url') ?: config('monitoreo.sonar.url'));
        $token = (string) ($this->option('sonar-token') ?: config('monitoreo.sonar.token'));
        if ($url !== '' && $token !== '') {
            $sonar = $servicio->leerSonar($url, $token, (string) ($this->option('proyecto') ?: config('monitoreo.sonar.proyecto')));
            if ($sonar === null) {
                $this->warn('SonarQube no respondió: las columnas de SonarQube quedarán como s/d.');
            }
        }

        $matriz = $servicio->construir($pruebas, $cobertura, $sonar);
        $meta = ['fecha' => now()->format('Y-m-d H:i'), 'commit' => $this->commitActual()];
        $archivos = $exportador->exportar($matriz, $meta, $this->ruta((string) $this->option('salida')));

        $this->table(
            ['Código', 'Proceso', 'Pruebas', 'Fallidas', 'Cobertura %', 'Estado'],
            array_map(fn (array $f): array => [$f['codigo'], $f['proceso'], $f['pruebas'], $f['fallidas'], $f['cobertura'] ?? 's/d', strtoupper($f['estado'])], $matriz['filas']),
        );

        $g = $matriz['global'];
        $this->info("Cumplimiento: {$g['cumplimiento']} % de procesos en verde · {$g['pruebas']} pruebas · Quality Gate: {$g['quality_gate']}");
        if ($matriz['sin_proceso'] !== []) {
            $this->warn('Pruebas sin proceso asignado: '.implode(', ', $matriz['sin_proceso']));
        }
        $this->line('Excel: '.$archivos['xlsx']);
        $this->line('Markdown: '.$archivos['md']);
        $this->line('Historial: '.$archivos['csv']);

        return $this->option('estricto') && $g['procesos_rojo'] > 0 ? self::FAILURE : self::SUCCESS;
    }

    /** Rutas relativas a backend/; las absolutas se respetan. */
    private function ruta(string $ruta): string
    {
        return preg_match('#^([A-Za-z]:[\\\\/]|/)#', $ruta) ? $ruta : base_path($ruta);
    }

    private function commitActual(): string
    {
        $resultado = Process::path(base_path())->run('git rev-parse --short HEAD');

        return $resultado->successful() ? trim($resultado->output()) : 'sin-git';
    }
}
