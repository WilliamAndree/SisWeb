<?php

use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;

/**
 * El servidor XAMPP no tiene servicios de fondo: el Programador de tareas de Windows llama
 * a schedule:run cada minuto. Estas tareas deben estar registradas.
 */
function tareaProgramada(string $comando): ?Event
{
    return collect(app(Schedule::class)->events())
        ->first(fn ($evento) => str_contains((string) $evento->command, $comando));
}

test('los planes vencidos se revisan cada madrugada', function () {
    expect(tareaProgramada('checkitse:vencer-planes')?->expression)->toBe('10 0 * * *');
});

test('la cola de trabajos se vacía cada minuto sin procesos duplicados', function () {
    $cola = tareaProgramada('queue:work');

    expect($cola)->not->toBeNull()
        ->and($cola->expression)->toBe('* * * * *')
        ->and($cola->withoutOverlapping)->toBeTrue()
        ->and((string) $cola->command)->toContain('--stop-when-empty');
});
