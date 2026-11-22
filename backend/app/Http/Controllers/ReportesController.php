<?php

namespace App\Http\Controllers;

use App\Services\ReportesImpactoService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Módulo de reportes de impacto (solo administración). Muestra, con los registros de
 * la base de datos, si los locales que usan CheckITSE llegan más preparados a su ITSE.
 */
class ReportesController extends Controller
{
    private const FILTROS = ['desde', 'hasta', 'distrito', 'giro', 'estado', 'origen'];

    public function __construct(private readonly ReportesImpactoService $reportes) {}

    public function index(Request $request): Response
    {
        return Inertia::render('Admin/Reportes', $this->reportes->generar($request->only(self::FILTROS)));
    }

    /** Descarga en CSV (se abre en Excel) los locales que cumplen los filtros. */
    public function exportar(Request $request): StreamedResponse
    {
        $filas = $this->reportes->filasParaExportar($request->only(self::FILTROS));
        $columnas = [
            'codigo' => 'Código', 'nombre' => 'Local', 'distrito' => 'Distrito', 'giro' => 'Giro', 'fecha' => 'Fecha de evaluación',
            'aplicables' => 'Condiciones aplicables', 'faltaban' => 'Faltaban al evaluar', 'corregidas' => 'Corregidas',
            'preparacion_inicial' => 'Preparación al evaluar (%)', 'preparacion_actual' => 'Preparación actual (%)',
            'estado' => 'Estado', 'dias_correccion' => 'Días hasta la última corrección',
        ];

        return response()->streamDownload(function () use ($filas, $columnas): void {
            $salida = fopen('php://output', 'w');
            fwrite($salida, "\xEF\xBB\xBF"); // BOM: Excel reconoce las tildes.
            fputcsv($salida, array_values($columnas), ';');
            foreach ($filas as $fila) {
                fputcsv($salida, array_map(fn (string $clave) => $fila[$clave] ?? '', array_keys($columnas)), ';');
            }
            fclose($salida);
        }, 'reporte-impacto-checkitse-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
