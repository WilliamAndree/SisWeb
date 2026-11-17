<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): RedirectResponse|JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required' => 'Escribe tu correo electrónico.',
            'email.email' => 'Ingresa un correo electrónico válido.',
            'password.required' => 'Escribe tu contraseña.',
        ]);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            throw ValidationException::withMessages([
                'email' => 'El correo o la contraseña no son correctos. Revisa e inténtalo nuevamente.',
            ]);
        }

        $request->session()->regenerate();

        return $this->authResponse($request);
    }

    public function register(Request $request): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::defaults()],
            'telefono' => ['nullable', 'string', 'max:20'],
        ], [
            'name.required' => 'Escribe tu nombre y apellido.',
            'email.required' => 'Escribe tu correo electrónico.',
            'email.email' => 'Ingresa un correo electrónico válido.',
            'email.unique' => 'Ya existe una cuenta con este correo. Inicia sesión para continuar.',
            'password.required' => 'Crea una contraseña.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'telefono.max' => 'El teléfono no debe superar los 20 caracteres.',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'telefono' => $validated['telefono'] ?? null,
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return $this->authResponse($request);
    }

    public function logout(Request $request): RedirectResponse|JsonResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->expectsJson()) {
            return response()->json(['user' => null]);
        }

        return redirect()->route('autoevaluacion.index');
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    private function authResponse(Request $request): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson()) {
            return response()->json([
                'user' => $request->user(),
            ]);
        }

        return back();
    }
}
