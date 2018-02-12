<?php
namespace Taste;

use Taste\Test;

abstract class Run {
  public $instances = [];
  public $report = '';
  public $reportfile = null;
  public $results = [
    'run' => [
      'tests' => 0,
      'testspassed' => 0,
      'samples' => 0,
      'samplespassed' => 0,
    ]
  ];

  function __construct($cachefolder, $relativecachefolder) {
    $this->name = strtolower(get_class($this));
    $this->results['total']['name'] = $this->name;
    $this->cachefolder = $cachefolder;
    $this->reportfile = $this->cachefolder . DS . 'reports' . DS . $this->name . '.html';
    $this->relativereportfile = $relativecachefolder . '/reports/' . $this->name . '.html';
    $this->tracefolder = $this->cachefolder . DS . 'traces';
    // Empty trace folder
    array_map('unlink', glob($this->tracefolder . DS . $this->name . ".*.xt"));
    $this->relativetracefolder = $relativecachefolder . '/traces/';
  }

  function __destruct() {
    file_put_contents($this->reportfile, $this->report);
  }

  function __get($p) {
    switch($p) {
      case 'test':
        $name = debug_backtrace()[1]['function'];
        return new Test($name, $this);
    }
  }

  function addInstance(string $name, $instance) {
    if(!is_array($instance) && is_string($instance) && class_exists($instance)) {
        if(func_num_args() < 3) $this->_instances[$name] = new $instance();
        else {
            $args = func_get_args();
            array_shift($args);            
            array_shift($args);
            $reflection = new \ReflectionClass($instance);
            $this->_instances[$name] = $reflection->newInstanceArgs($args);
        }
    }
    else if(is_array($instance) && class_exists($instance[0])) {
        if(func_num_args() < 3) $this->_instances[$name] = [new $instance[0](), $instance[1]];
        else {
            $args = func_get_args();
            array_shift($args);            
            array_shift($args);
            $reflection = new \ReflectionClass($instance[0]);
            $this->_instances[$name] = [$reflection->newInstanceArgs($args), $instance[1]];
        }
    }
    elseif (is_callable($instance)) {
        $this->_instances[$name] = $instance;
    }
    else {
        throw new \Exception('INSTANCE_NOT_CALLABLE');
    }    
    return $this;
  }
  
  function removeInstance(string $name) {
    unset($this->instances[$name]);
    return $this;
  }
}