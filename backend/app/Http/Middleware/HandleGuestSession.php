<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class HandleGuestSession
{
    /**
     * Asigna un token anónimo persistente (30 días) a visitantes no autenticados.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() || filled($request->cookie('guest_session_token'))) {
            return $next($request);
        }

        $token = Str::random(40);

        $request->cookies->set('guest_session_token', $token);
        Cookie::queue('guest_session_token', $token, 60 * 24 * 30);

        return $next($request);
    }
}
