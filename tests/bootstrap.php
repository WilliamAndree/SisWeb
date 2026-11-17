<?php

use Illuminate\Support\Facades\Facade;
use Tests\Support\TestEnvironment;

require_once dirname(__DIR__).'/vendor/autoload.php';

try {
    $application = TestEnvironment::createApplication(preflight: true);
    $report = TestEnvironment::verify($application);
    fwrite(STDOUT, '[SisWeb preflight] '.json_encode($report, JSON_UNESCAPED_SLASHES).PHP_EOL);
    $application->make('db')->disconnect();
    $application->flush();
} catch (Throwable $exception) {
    fwrite(STDERR, '[SisWeb preflight BLOQUEADO] '.$exception->getMessage().PHP_EOL);
    exit(1);
}

Facade::clearResolvedInstances();
unset($application, $report);
