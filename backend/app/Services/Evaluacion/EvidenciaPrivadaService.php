<?php

namespace App\Services\Evaluacion;

use Illuminate\Support\Facades\Storage;

class EvidenciaPrivadaService
{
    public function rutaPermitida(string $path): bool
    {
        if (! str_starts_with($path, 'evidencias/') || preg_match('~(?:^|/)\.{1,2}(?:/|$)|[\\\\\x00]~', $path)) {
            return false;
        }

        $disk = Storage::disk('local');
        $root = realpath($disk->path(''));
        $file = realpath($disk->path($path));

        return $root !== false && $file !== false
            && str_starts_with(str_replace('\\', '/', $file), rtrim(str_replace('\\', '/', $root), '/').'/');
    }
}
