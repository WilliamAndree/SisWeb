<?php

namespace App\Http\Controllers;

use App\Http\Requests\SolicitudAfiliacionRequest;
use App\Models\SolicitudAfiliacion;
use App\Services\DirectorioAliadosService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DirectorioController extends Controller
{
    protected DirectorioAliadosService $directorioAliados;

    public function __construct(DirectorioAliadosService $directorioAliados)
    {
        $this->directorioAliados = $directorioAliados;
    }

    /**
     * Directorio cívico público de comercios técnicos y especialistas.
     *
     * Reutiliza el catálogo en memoria de `DirectorioAliadosService` (la misma
     * fuente que alimenta el Plan de Acción del resumen) sin duplicar modelos ni
     * migrar registros. Los filtros llegan por query string y se resuelven
     * aquí; el cliente navega con Inertia y `preserveState`, de modo que este
     * es el único punto donde se decide qué se muestra.
     *
     * Es una vista de orientación: no recomienda ni certifica a nadie.
     */
    public function index(Request $request): Response
    {
        $categoria = $this->filtroTexto($request->query('categoria'));
        $distrito = $this->filtroTexto($request->query('distrito'));

        $aliados = $categoria !== null && $categoria !== ''
            ? $this->directorioAliados->obtenerPorCategoria($categoria)
            : $this->directorioAliados->todos();

        if ($distrito !== null && $distrito !== '') {
            $distritoFiltro = mb_strtolower($distrito);
            $aliados = array_values(array_filter($aliados, function (array $aliado) use ($distritoFiltro): bool {
                $sede = mb_strtolower((string) ($aliado['sede'] ?? ''));
                $cobertura = mb_strtolower((string) ($aliado['cobertura'] ?? ''));

                return str_contains($sede, $distritoFiltro) || str_contains($cobertura, $distritoFiltro);
            }));
        }

        return Inertia::render('Directorio/Index', [
            'aliados' => $aliados,
            'filtros' => [
                'categoria' => $categoria,
                'distrito' => $distrito,
            ],
            'categorias' => [
                ['valor' => '', 'etiqueta' => 'Todas las especialidades'],
                ['valor' => 'incendios', 'etiqueta' => 'Extintores y Señalética'],
                ['valor' => 'electricas', 'etiqueta' => 'Electricidad y Puesta a Tierra'],
                ['valor' => 'arquitectura_senaletica', 'etiqueta' => 'Planos y Evacuación'],
                ['valor' => 'estructuras', 'etiqueta' => 'Estructuras y Vidrios'],
            ],
            'distritos' => [
                ['valor' => '', 'etiqueta' => 'Todos los distritos'],
                ['valor' => 'Huancayo', 'etiqueta' => 'Huancayo Centro'],
                ['valor' => 'El Tambo', 'etiqueta' => 'El Tambo'],
                ['valor' => 'Chilca', 'etiqueta' => 'Chilca'],
            ],
        ]);
    }

    /**
     * Procesa y registra la postulación de un nuevo aliado técnico para el directorio cívico.
     */
    public function solicitarAfiliacion(SolicitudAfiliacionRequest $request): RedirectResponse
    {
        SolicitudAfiliacion::create($request->validated());

        return redirect()->back()->with('success', 'Tu solicitud de afiliación ha sido registrada. La Subgerencia o el equipo técnico se comunicará contigo.');
    }

    /**
     * Normaliza un parámetro de filtro de query a `string|null`.
     *
     * Descarta arrays y cualquier valor que no sea texto, para que un query
     * manipulado no termine en un `trim()` sobre un tipo inesperado.
     */
    private function filtroTexto(mixed $valor): ?string
    {
        if (! is_string($valor)) {
            return null;
        }

        $valor = trim($valor);

        return $valor === '' ? null : $valor;
    }
}
