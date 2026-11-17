<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Coordenadas Base de Referencia (Huancayo Centro)
    |--------------------------------------------------------------------------
    |
    | Coordenadas geográficas oficiales de referencia para Huancayo Centro,
    | empleadas como centroides de búsqueda en cálculos de geolocalización.
    |
    */
    'coordenadas_base' => [
        'latitud' => (float) env('ITSE_BASE_LAT', -12.0680),
        'longitud' => (float) env('ITSE_BASE_LON', -75.2100),
    ],
];
