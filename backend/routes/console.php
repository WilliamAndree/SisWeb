<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cada madrugada, los planes pagados vencidos vuelven a Básico.
Schedule::command('checkitse:vencer-planes')->dailyAt('00:10');
