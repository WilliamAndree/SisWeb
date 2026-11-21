<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=bricolage-grotesque:500,600,700,800|plus-jakarta-sans:400,500,600,700,800|fraunces:600i,700i&display=swap" rel="stylesheet" />
        {{-- Activa la animación de aparición antes del primer pintado (sin parpadeo). Respeta "reducir movimiento". --}}
        <script>if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('revelar-listo');</script>

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
