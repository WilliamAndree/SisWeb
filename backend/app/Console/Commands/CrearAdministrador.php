<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Crea una cuenta de administrador o convierte una existente.
 *
 * Por seguridad no existe registro público de administradores: solo se crean
 * desde el servidor con este comando.
 */
class CrearAdministrador extends Command
{
    protected $signature = 'checkitse:crear-admin
        {email : Correo con el que entrará el administrador}
        {--nombre=Administrador : Nombre visible}
        {--password= : Contraseña (si no la das, se genera una segura)}';

    protected $description = 'Crea o promueve una cuenta de administrador de CheckITSE';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Escribe un correo válido.');

            return self::FAILURE;
        }

        $password = (string) ($this->option('password') ?: Str::password(16, symbols: false));

        if (mb_strlen($password) < 10) {
            $this->error('La contraseña debe tener al menos 10 caracteres.');

            return self::FAILURE;
        }

        $usuario = User::firstOrNew(['email' => $email]);
        $existia = $usuario->exists;
        $usuario->forceFill([
            'name' => $usuario->name ?: (string) $this->option('nombre'),
            'password' => Hash::make($password),
            'tipo_cuenta' => User::TIPO_ADMIN,
        ])->save();

        $this->info(($existia ? 'Cuenta convertida' : 'Cuenta creada').' como administrador: '.$email);

        if (! $this->option('password')) {
            $this->line('Contraseña generada: '.$password);
            $this->warn('Guárdala ahora: no se volverá a mostrar.');
        }

        return self::SUCCESS;
    }
}
