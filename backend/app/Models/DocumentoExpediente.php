<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Documento del expediente digital ITSE. El archivo vive en el disco privado
 * `local` (storage/app/private/expedientes) y solo se sirve tras autorizar.
 *
 * @property int $id
 * @property int $autoevaluacion_id
 * @property string $tipo
 * @property string $nombre_original
 * @property string $ruta
 * @property string $mime_type
 * @property int $tamano_bytes
 * @property string $hash_sha256
 * @property string $estado_revision
 * @property string|null $observacion_revision
 */
class DocumentoExpediente extends Model
{
    public const ESTADO_PENDIENTE = 'PENDIENTE';

    protected $table = 'documentos_expediente';

    protected $fillable = [
        'autoevaluacion_id',
        'tipo',
        'nombre_original',
        'ruta',
        'mime_type',
        'tamano_bytes',
        'hash_sha256',
        'estado_revision',
        'observacion_revision',
    ];

    protected function casts(): array
    {
        return [
            'tamano_bytes' => 'integer',
        ];
    }

    public function autoevaluacion(): BelongsTo
    {
        return $this->belongsTo(Autoevaluacion::class);
    }
}
