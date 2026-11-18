<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'telefono',
        'tipo_cuenta',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function autoevaluaciones(): HasMany
    {
        return $this->hasMany(Autoevaluacion::class);
    }

    public const TIPO_CLIENTE = 'cliente';

    public const TIPO_PROVEEDOR = 'proveedor';

    /** Revisa negocios y comprobantes de pago. Se crea con: php artisan checkitse:crear-admin */
    public const TIPO_ADMIN = 'admin';

    public function esProveedor(): bool
    {
        return $this->tipo_cuenta === self::TIPO_PROVEEDOR;
    }

    public function esAdmin(): bool
    {
        return $this->tipo_cuenta === self::TIPO_ADMIN;
    }

    public function proveedor(): HasOne
    {
        return $this->hasOne(ProveedorRecurso::class);
    }
}
