<?php

namespace App\Console\Commands;

use App\Models\ProveedorRecurso;
use Illuminate\Console\Command;

/**
 * Devuelve al plan Básico a los negocios cuyo plan pagado ya venció.
 * Se ejecuta cada día (ver routes/console.php).
 */
class VencerPlanesProveedor extends Command
{
    protected $signature = 'checkitse:vencer-planes';

    protected $description = 'Pasa a plan Básico los planes pagados vencidos';

    public function handle(): int
    {
        $vencidos = ProveedorRecurso::where('plan', '!=', ProveedorRecurso::PLAN_GRATUITO)
            ->whereDate('plan_vence_el', '<', today())
            ->update(['plan' => ProveedorRecurso::PLAN_GRATUITO]);

        $this->info("Planes vencidos actualizados: {$vencidos}");

        return self::SUCCESS;
    }
}
