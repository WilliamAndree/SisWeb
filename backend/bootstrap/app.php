<?php

use App\Http\Middleware\HandleGuestSession;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            HandleGuestSession::class,
        ]);

        // Visitantes que acceden a una ruta protegida (p. ej. Mis Autoevaluaciones)
        // llegan a la pantalla canónica de acceso, donde pueden crear una cuenta o
        // iniciar sesión. Antes se los devolvía al inicio, lo que solo los obligaba
        // a reabrir el overlay de acceso desde la portada.
        $middleware->redirectGuestsTo(fn () => route('login'));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
