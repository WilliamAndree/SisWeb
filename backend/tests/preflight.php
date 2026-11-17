<?php

/** Read-only verification of Laravel's resolved testing configuration. */
$_ENV['APP_ENV'] = $_SERVER['APP_ENV'] = 'testing';
putenv('APP_ENV=testing');

require __DIR__.'/bootstrap.php';
