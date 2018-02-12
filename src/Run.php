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

  function addInstance(string $name, $instance, $params = null) : self {
    if (is_callable($instance)) {
        $this->_instances[$name] = $instance;
    }
    elseif(is_array($instance) && class_exists($instance[0])) {
        if($instance[1] == '__construct' || is_null($instance[1])) {
            $this->_instances[$name] = new $instance($params);
        }
        else {
            $this->_instances[$name] = [new $instance($params), $instance[1]];
        }
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