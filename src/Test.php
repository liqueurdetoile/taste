<?php
namespace TasteLiquor;

abstract class Result {
  public $items = [];
  public $evals = [null];
  public $result = false;
  public $duration;
  private $_n = 1;

  function expected($itemName, $expectedValue, $resultValue, $strict = true) {
    $this->items[$itemName] = [
      'index' => $this->_n++,
      'expected' => var_export($expectedValue, true),
      'returned' => is_a($resultValue, '\Exception') ? $resultValue : var_export($resultValue, true),
      'strict' => var_export($strict, true)
    ];
    $this->evals[] = ($strict ? ($expectedValue === $resultValue) : ($expectedValue == $resultValue));
    return $this;
  }

  function evaluate($rule) {
    $this->rule = $rule;
    $rule = 'return ' . preg_replace('/(\d+)/', 'this->evals[$1]', $rule);
    $this->passed = eval("$rule;");
  }
}

abstract class Test {
  public $tracefolder = __DIR__.'/traces/';

  function __construct($tracefolder = null) {
    if(!is_null($tracefolder)) $this->tracefolder = $tracefolder;
  }

  function startUnitTest($name, $verbose = true) {
    echo '<h1>Unit test : <tt>'.name.'</tt></h1>';
    echo '<div>';
    foreach($this->funcs as $func) {
      echo "<h2>Function : <tt>$func</tt></h2>";
      echo '<div>';
      foreach($this->instances as $name => $instance) {
        echo "<h3>Instance : <tt>$name</tt></h3>";
        $tests = call_user_func(array($this, $func));
        $this->blockTest(array($instance, $func), $tests, $verbose);
      }
      echo '</div>';
    }
    echo '</div>';
  }

  function blockTest($func, $tests, $verbose) {
    echo "<ul>";

    foreach($tests as $test) {
      // Before callback
      if(!empty($test['before'])) {
        $ret = $test['before']($func[0]);
        if(!empty($ret)) $func[0] = $ret;
      }

      // Test runtime
      $start = microtime(true) * 1000;      
      $tracefilename = 'test' . uniqid();
      $tracefile = $this->tracefolder . $tracefilename;
      try {        
        xdebug_start_trace($tracefile, 2);
        $returned = call_user_func_array($func, $test['args']);        
      }
      catch(Exception $e) {
        $returned = $e;
      }
      finally {
        xdebug_stop_trace();
      }
      $end = microtime(true) * 1000;
      $result = $test['test'](new Result(), $func[0], $returned);
      $result->duration = ($end - $start);

      //After callback
      if(!empty($test['after'])) {
        $ret = $test['after']($func[0]);
        if(!empty($ret)) $func[0] = $ret;
      }

      $class = $result->passed ? 'passed' : 'failed';
      if(!$verbose && $result->passed) $class .= ' hidden';
      echo '<li class="test '.$class.'">' . $test['name'] .' : ';
      echo '<span class="'.$class.'">' . ucfirst($class) . ' (' . round($result->duration,3) .'ms) <button class="toggle-details">[+]</button></span>';
      echo '</li>';
      echo '<div class="details" style="display:none">';
        echo '<div class="item">';
          echo '<div class="title">Arguments</div>';
          $n = 1;
          echo '<table class="evaluations">';
          echo '<tr><th></th><th>Value</th></tr>';
          foreach($test['args'] as $arg) {
            echo "<tr>";
            echo "<td><tt>#" . ($n++) ."</tt></td>";
            echo "<td><pre>".var_export($arg, true)."</pre></td>";
            echo "</tr>";
          }
          echo '</table>';
        echo '</div>';
        echo '<div class="item">';
          echo '<div class="title">Evaluations</div>';
          echo '<table class="evaluations">';
            echo '<tr><th></th><th>Description</th><th>Expected</th><th>Returned</th><th>Strict</th></tr>';
            foreach($result->items as $itemName => $res) {
              $class = $result->evals[$res['index']] ? 'passed' : 'failed';
              echo "<tr class=\"$class\">";
                echo "<td><tt>\${$res['index']}</tt></td>";
                echo "<td><tt>$itemName</td></td>";
                echo "<td><pre>{$res['expected']}</pre></td>";
                echo "<td><pre>{$res['returned']}</pre></td>";
                echo "<td><pre>{$res['strict']}</pre></td>";
              echo '</tr>';
            }
          echo '</table>';
          echo "<div><strong>Evaluation rule : </strong><tt>$result->rule</tt></div>";

        echo '</div>';
        echo '<div class="item">';
          echo '<div class="title">Elapsed Time (ms)</div>';
          pr($end - $start);
          echo '<div><button class="parse-trace" data-file="'.$tracefilename.'">Show trace</button></div>';
          echo '<div><button class="parse-timeline" data-file="'.$tracefilename.'">Show timeline</button></div>';
        echo '</div>';        
      echo "</div>";
    }
    echo "</ul>";
    
    return $result->passed;
  }
}