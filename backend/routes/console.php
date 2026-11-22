<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cada madrugada, los planes pagados vencidos vuelven a Básico.
Schedule::command('checkitse:vencer-planes')->dailyAt('00:10');

// Servidor XAMPP (Windows, sin servicios de fondo): el Programador de tareas ejecuta
// "schedule:run" cada minuto (scripts/tareas-xampp.ps1) y aquí se vacía la cola de trabajos
// (análisis de evidencias con IA). El proceso termina solo cuando la cola queda vacía.
Schedule::command('queue:work --stop-when-empty --max-time=55')->everyMinute()->withoutOverlapping();
