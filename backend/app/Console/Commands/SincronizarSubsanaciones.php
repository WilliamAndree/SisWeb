<?php

namespace App\Console\Commands;

use App\Models\Autoevaluacion;
use App\Models\Subsanacion;
use App\Services\Evaluacion\SubsanacionSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Aplica a todas las evaluaciones las correcciones que ya estaban guardadas.
 *
 * Antes, una corrección hecha desde "Corregir lo que falta" quedaba registrada pero el
 * resumen seguía contándola como pendiente. Este comando deja todo coherente y se puede
 * ejecutar las veces que se quiera (no duplica nada).
 */
class SincronizarSubsanaciones extends Command
{
    protected $signature = 'checkitse:sincronizar-subsanaciones';

    protected $description = 'Refleja las correcciones guardadas en el estado de cada local';

    public function handle(SubsanacionSyncService $servicio): int
    {
        $ids = Subsanacion::query()
            ->whereNotNull('autoevaluacion_id')
            ->distinct()
            ->pluck('autoevaluacion_id');

        $actualizadas = 0;
        Autoevaluacion::query()->whereIn('id', $ids)->whereHas('respuestas')->each(function (Autoevaluacion $autoevaluacion) use ($servicio, &$actualizadas): void {
            DB::transaction(fn () => $servicio->sincronizar($autoevaluacion));
            $actualizadas++;
        });

        $this->info("Evaluaciones sincronizadas: {$actualizadas}");

        return self::SUCCESS;
    }
}
