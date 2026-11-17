<?php

use App\Http\Requests\StoreAutoevaluacionRequest;
use Tests\TestCase;

uses(TestCase::class);

function ejecutarPrepareForValidation(array $datos, ?string $uuidRoute = null): StoreAutoevaluacionRequest
{
    $request = new class extends StoreAutoevaluacionRequest
    {
        public function dispararPrepareForValidation(): void
        {
            $this->prepareForValidation();
        }
    };

    $request->setContainer(app());
    $request->initialize($datos);

    if ($uuidRoute !== null) {
        $rutasParams = ['uuid' => $uuidRoute];
        $request->setRouteResolver(function () use ($rutasParams) {
            return new class($rutasParams)
            {
                public function __construct(private array $params) {}

                public function parameter(string $name, mixed $default = null): mixed
                {
                    return $this->params[$name] ?? $default;
                }
            };
        });
    }

    $request->dispararPrepareForValidation();

    return $request;
}

it('convierte representaciones de true/false/1/0 a booleanos reales', function () {
    $request = ejecutarPrepareForValidation([
        'usa_glp' => 'true',
        'galones_glp' => '10.5',
        'usa_caldero' => 1,
        'usa_liquidos_inflamables' => '1',
        'tiene_equipos_fritura' => 'true',
        'tiene_escaleras' => 0,
        'tiene_estanterias_altas' => 'false',
    ]);

    expect($request->input('usa_glp'))->toBeTrue()
        ->and($request->input('usa_caldero'))->toBeTrue()
        ->and($request->input('usa_liquidos_inflamables'))->toBeTrue()
        ->and($request->input('tiene_equipos_fritura'))->toBeTrue()
        ->and($request->input('tiene_escaleras'))->toBeFalse()
        ->and($request->input('tiene_estanterias_altas'))->toBeFalse();

    $requestFalse = ejecutarPrepareForValidation([
        'usa_glp' => 'false',
        'usa_caldero' => 0,
        'usa_liquidos_inflamables' => '0',
    ]);

    expect($requestFalse->input('usa_glp'))->toBeFalse()
        ->and($requestFalse->input('usa_caldero'))->toBeFalse()
        ->and($requestFalse->input('usa_liquidos_inflamables'))->toBeFalse();
});

it('normaliza campos vacios o ausentes a null', function () {
    $request = ejecutarPrepareForValidation([
        'ruc' => '   ',
        'direccion' => '',
        'referencia' => '',
        'area_m2' => '',
        'pisos' => '',
        'aforo' => '',
        'usa_glp' => '',
        'usa_caldero' => '',
        'usa_liquidos_inflamables' => null,
        'tiene_equipos_fritura' => '',
        'tiene_escaleras' => null,
    ]);

    expect($request->input('ruc'))->toBeNull()
        ->and($request->input('direccion'))->toBeNull()
        ->and($request->input('referencia'))->toBeNull()
        ->and($request->input('area_m2'))->toBeNull()
        ->and($request->input('pisos'))->toBeNull()
        ->and($request->input('aforo'))->toBeNull()
        ->and($request->input('usa_glp'))->toBeNull()
        ->and($request->input('galones_glp'))->toBeNull()
        ->and($request->input('usa_caldero'))->toBeNull()
        ->and($request->input('usa_liquidos_inflamables'))->toBeNull()
        ->and($request->input('tiene_equipos_fritura'))->toBeNull()
        ->and($request->input('tiene_escaleras'))->toBeNull()
        ->and($request->input('tiene_estanterias_altas'))->toBeNull();
});

it('establece galones_glp como float si usa_glp es true y null si usa_glp es false o null', function () {
    $requestConGlp = ejecutarPrepareForValidation([
        'usa_glp' => true,
        'galones_glp' => '45.5',
    ]);

    expect($requestConGlp->input('usa_glp'))->toBeTrue()
        ->and($requestConGlp->input('galones_glp'))->toBe(45.5);

    $requestSinGlp = ejecutarPrepareForValidation([
        'usa_glp' => false,
        'galones_glp' => '45.5',
    ]);

    expect($requestSinGlp->input('usa_glp'))->toBeFalse()
        ->and($requestSinGlp->input('galones_glp'))->toBeNull();

    $requestGlpNull = ejecutarPrepareForValidation([
        'usa_glp' => null,
        'galones_glp' => '45.5',
    ]);

    expect($requestGlpNull->input('usa_glp'))->toBeNull()
        ->and($requestGlpNull->input('galones_glp'))->toBeNull();

    $requestGlpVacio = ejecutarPrepareForValidation([
        'usa_glp' => true,
        'galones_glp' => '',
    ]);

    expect($requestGlpVacio->input('usa_glp'))->toBeTrue()
        ->and($requestGlpVacio->input('galones_glp'))->toBeNull();
});

it('asigna correctamente evaluacion_origen_uuid desde input o parametro de ruta', function () {
    $uuidDirecto = '11111111-1111-1111-1111-111111111111';
    $requestDirecto = ejecutarPrepareForValidation([
        'evaluacion_origen_uuid' => $uuidDirecto,
    ]);

    expect($requestDirecto->input('evaluacion_origen_uuid'))->toBe($uuidDirecto);

    $uuidRuta = '22222222-2222-2222-2222-222222222222';
    $requestRuta = ejecutarPrepareForValidation([], $uuidRuta);

    expect($requestRuta->input('evaluacion_origen_uuid'))->toBe($uuidRuta);
});
