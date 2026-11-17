<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Tests\Support\TestEnvironment;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        $this->traitsUsedByTest = array_flip(class_uses_recursive(static::class));
        $app = TestEnvironment::createApplication();
        TestEnvironment::verify($app);

        return $app;
    }
}
