<?php

namespace App\Jobs;

use App\Models\AnalisisEvidencia;
use App\Services\AI\AnalisisEvidenciaService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\Jobs\SyncJob;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class AnalisisEvidenciaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [5, 15, 30];

    public function __construct(
        public int $analisisId
    ) {}

    public function handle(AnalisisEvidenciaService $service): void
    {
        $analisis = AnalisisEvidencia::find($this->analisisId);
        if (! $analisis || $analisis->esTerminal()) {
            return;
        }

        try {
            $service->procesarAnalisis($analisis);
        } catch (Throwable $e) {
            $transitorio = $e instanceof \RuntimeException
                && ($e->getCode() === 429 || ($e->getCode() >= 500 && $e->getCode() <= 599)
                    || $e->getPrevious() instanceof ConnectionException);
            if ($transitorio && $this->job !== null && ! $this->job instanceof SyncJob && $this->attempts() < $this->tries) {
                $analisis->update(['estado_analisis' => AnalisisEvidencia::ESTADO_PENDIENTE, 'completado_at' => null]);
            }

            throw $e;
        }
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('AnalisisEvidenciaJob: Fallo definitivo tras reintentos', [
            'analisis_id' => $this->analisisId,
            'error' => $exception?->getMessage(),
        ]);

        $analisis = AnalisisEvidencia::find($this->analisisId);
        if ($analisis && ! $analisis->esTerminal()) {
            $analisis->update([
                'estado_analisis' => AnalisisEvidencia::ESTADO_FALLIDO,
                'mensaje_error' => 'No fue posible completar el análisis de la fotografía tras múltiples intentos. Puede intentar nuevamente.',
                'completado_at' => now(),
            ]);
        }
    }
}
