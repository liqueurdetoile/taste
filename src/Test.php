<?php
namespace Taste;

use Taste\Result;

class Test {
  public $name = null;
  private $_run;
  private $_instances = [];
  private $_results = [];
  public $result;
  public $total = 0;
  public $passed = 0;
  public $samples = 0;
  public $samplespassed = 0;

  function __construct($name, Run &$run) {
    $this->_run = $run;
    $this->name = $name;
    $this->_instances = $run->instances;
  }

  function addInstance(string $name, callable $instance) {
    $this->_instances[$name] = $instance;
    return $this;
  }
  
  function removeInstance(string $name) {
    unset($this->_instances[$name]);
    return $this;
  }

  function name(string $name) {
    $this->name = $name;
    return $this;
  }

  function sample($input, $output, $strict = true, $name = null) {
    $sampleIndex = count($this->_results);

    foreach($this->_instances as $instanceName => $instance) {
      // BeforeEach hook
      if(method_exists($instance, 'beforeEach')) {
        $instance->beforeEach($instance);
      }
      
      // Dealing with input
      if(is_a($input, '\Closure')) $args = (array) call_user_func($input, $instance);
      else $args = (array) $input;

      // Test runtime
      if(function_exists('xdebug_start_trace')) $trace = true;
      $start = microtime(true) * 1000;
      $tracefilename = $this->_run->name . '.' . uniqid();
      $tracefile = $this->_run->tracefolder . DS . $tracefilename;
      try {
        if($trace) xdebug_start_trace($tracefile, 2);
        $returned = call_user_func_array($instance, $args);
      }
      catch(Exception $e) {        
        $returned = $e;
      }
      finally {
        if($trace) xdebug_stop_trace();
      }
      $end = microtime(true) * 1000;
      
      // afterEach hook
      if(method_exists($instance, 'afterEach')) {
        $instance->afterEach($instance);
      }
      
      // Building result
      if(empty($name)) $name = 'Sample #' . (count($this->_results) + 1);
      $result = new Result($name);

      if(is_a($output, '\Closure')) {
        $output($returned, $instance, $result);
      }
      else {
        $result->expected($name, $output, $returned, $strict);
        $result->evaluate('$1');
      }
      $this->_results[$name][$instanceName]['args'] = $args;
      $this->_results[$name][$instanceName]['result'] = $result;
      $this->_results[$name][$instanceName]['trace'] = $trace ? $this->_run->relativetracefolder . $tracefilename . '.xt' : false;
      $this->_results[$name][$instanceName]['duration'] = $end - $start;
    }
    return $this;
  }

  function evaluate($rule = null) {
    $this->result = new Result($this->name);
    foreach($this->_results as $samples) {
      foreach($samples as $sample) $this->result->expected('', true, $sample['result']->passed);
    }
    $this->result->evaluate($rule);
    $this->report($this->result);
    return $this;
  }

  function report($result) {
    $this->total++; // Counter
    // Global result
    $instances = [];
    $name = empty($this->name) ? 'Unknown' : $this->name;
    $res = $result->passed ? 'passed' : 'failed';
    $this->_run->report .= '<h1 class="test-title ' . $res . '"><span class="result ' . $res . '">' . $res . '</span>Test : ' . htmlentities($name);
    $this->_run->report .= '<button class="toggle-test-details button">' . ($result->passed ? 'Show details' : 'Hide details') . '</button>';
    $this->_run->report .= "</h1>\n";
    $this->_run->report .= '<div class="test-details" style="display:' . ($result->passed ? 'none' : 'block') . '">';
    $this->_run->report .= '<table class="sample-details">';
    foreach($this->_results as $name => $samples) {
      $this->samples++; // Counter
      $passed = true;
      $this->_run->report .= '<tr><th></th><th>Arguments</th><th>Instance(s)</th><th>Result</th><th>Evaluations</th><th>Duration (ms)</th><th></th></tr>';
      $this->_run->report .= '<tr>';
      $this->_run->report .= '<td rowspan="' . count($samples) . '">' . $name . '</td>';
        $first = true;
        foreach($samples as $instanceName => $sample) {          
          if(!$sample['result']->passed) $passed = false;
          if(!$first) $this->_run->report .= '<tr>';
          else {
            $this->_run->report .= '<td style="vertical-align:top" rowspan="' . count($samples) . '">' . $this->parseArgs($sample['args']) . '</td>';
            $first = false;
          }
          $sampleRes = $sample['result']->passed ? 'passed' : 'failed';
          $this->_run->report .= '<td>' . $instanceName . '</td>';
          $this->_run->report .= '<td class="' . $sampleRes . '">' . $sampleRes . '</td>';
          $this->_run->report .= '<td style="text-align:left">' . $this->parseEvaluations($sample['result']) . '</td>';
          $this->_run->report .= '<td>' . round($sample['duration'], 3) . '</td>';          
          if($sample['trace']) $this->_run->report .= '<td><button class="button parse-trace" data-file="'.$sample['trace'].'">Show trace</button></td>';
        }
      $this->_run->report .= '</tr>';
      $this->_run->report .= '<tr class="sep"></tr>';
      if($passed) $this->samplespassed++; // Counter
    }
    $this->_run->report .= '</table>';
    
    $this->_run->report .= '</div>';
    
    $this->_run->results['run']['tests'] += $this->total;
    $this->_run->results['run']['testspassed'] += $this->result->passed ? 1 : 0;
    $this->_run->results['run']['samples'] += $this->samples;
    $this->_run->results['run']['samplespassed'] += $this->samplespassed;
  }

  function parseArgs($args) {
    $ret = '<table class="args-details">';
    $ret .= '<tr><th></th><th>Type</th><th>Value</th></tr>';
    $n = 1;
    foreach($args as $arg) {
      $ret .= '<tr><td>#' . ($n++) . '</td><td>' . gettype($arg) . '</td><td><pre>' . var_export($arg, true) . '</pre></td>';
    }
    $ret .= '</table>';
    return $ret;
  }

  function parseEvaluations($result) {
    $ret = '<table class="evaluations-details">';
    $ret .= '<tr><th></th><th>Description</th><th>Expected</th><th>Returned</th><th>Strict</th><th></th></tr>';
    foreach($result->items as $itemName => $res) {
      $class = $result->evals[$res['index']] ? 'passed' : 'failed';
      $ret .= "<tr class=\"$class\">";
        $ret .= "<td><tt>\${$res['index']}</tt></td>";
        $ret .= "<td><tt>$itemName</td></td>";
        $ret .= "<td><pre>{$res['expected']}</pre></td>";
        $ret .= "<td><pre>{$res['returned']}</pre></td>";
        $ret .= "<td><pre>{$res['strict']}</pre></td>";
        $ret .= "<td class=\"" . ($result->passed ? 'passed' : 'failed') . "\"><pre>{$res['passed']}</pre></td>";
      $ret .= '</tr>';
    }
    $ret .= '</table>';
    $ret .= "<div class=\"evaluations-rule\"><strong>Evaluation rule : </strong><tt>$result->rule</tt></div>";
    return $ret;
  }
}