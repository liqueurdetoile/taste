<?php
use Taste\Run;

class foo {
  function bar($text) {
    return strtoupper($text);
  }
  
  static function foobar() {
    return 'static also';
  }
}

class Examples extends Run {
  function before() {
    $this->addInstance('powA', function($number) { return $number * $number; });
    $this->addInstance('powB', function($number) { return pow($number, 2); });
  }
  
  function beforeEach() {}
  
  function testPow() {
    $this->test
      ->name('Power of 2')      
      ->sample(0, 0)
      ->sample(-1, 1, false, 'Negative value')
      ->sample(1, 1)
      ->addInstance('powC', function($number) { return (int) sqrt(pow($number, 4)); })
      ->sample(2, 4)
      ->sample(3, 9, false)
      ->removeInstance('powA')
      ->sample(
        function($instance) { return (5 - 1); },
        function($returned, $instance, &$result) {
          $test = $instance(4);
          $result
            ->expected('Returned value', 16, $returned)
            ->expected('Calculated value', 16, $test)
            ->evaluate('$1 && $2');
        }, true)
      ->evaluate();
  }
  
  function testFoo() {
    $this->test
      ->removeInstance('powA')
      ->removeInstance('powB')
      ->removeInstance('powC')
      ->addInstance('Foo', array(new Foo(), 'bar'))
      ->name('Foo powaa')
      ->sample('Hello', 'HELLO')
      ->removeInstance('Foo')
      ->addInstance('StaticFoo', array('Foo', 'foobar'))
      ->sample(null, 'static also')
      ->evaluate();
  }
  function afterEach() {}
  
  function after() {}
}