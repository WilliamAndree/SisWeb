<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CategoriaSubsanacion extends Model
{
    protected $table = 'categorias_subsanacion';

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion',
    ];

    public function proveedoresRecursos(): HasMany
    {
        return $this->hasMany(ProveedorRecurso::class, 'categoria_id');
    }
}
