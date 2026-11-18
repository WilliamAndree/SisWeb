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
 * desde el servidor con este comando. La clave nunca se pasa como argumento
 * (quedaría en el historial de la terminal): se escribe oculta o se genera.
 */
class CrearAdministrador extends Command
{
    private const LONGITUD_MINIMA = 10;

    protected $signature = 'checkitse:crear-admin
        {email : Correo con el que entrará el administrador}
        {--nombre=Administrador : Nombre visible}';

    protected $description = 'Crea o promueve una cuenta de administrador de CheckITSE';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Escribe un correo válido.');

            return self::FAILURE;
        }

        $escrita = $this->input->isInteractive()
            ? (string) $this->secret('Escribe la clave (o deja vacío para generar una segura)')
            : '';
        $generada = $escrita === '';
        $clave = $generada ? Str::password(16, symbols: false) : $escrita;

        if (mb_strlen($clave) < self::LONGITUD_MINIMA) {
            $this->error('La clave debe tener al menos '.self::LONGITUD_MINIMA.' caracteres.');

            return self::FAILURE;
        }

        $usuario = User::firstOrNew(['email' => $email]);
        $existia = $usuario->exists;
        $usuario->forceFill([
            'name' => $usuario->name ?: (string) $this->option('nombre'),
            'password' => Hash::make($clave),
            'tipo_cuenta' => User::TIPO_ADMIN,
        ])->save();

        $this->info(($existia ? 'Cuenta convertida' : 'Cuenta creada').' como administrador: '.$email);

        if ($generada) {
            $this->line('Clave generada: '.$clave);
            $this->warn('Guárdala ahora: no se volverá a mostrar.');
        }

        return self::SUCCESS;
    }
}
