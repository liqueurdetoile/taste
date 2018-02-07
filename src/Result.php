<?php
namespace Taste;

class Result {
  public $name;
  public $items = [];
  public $evals = [null];
  public $passed = false;  
  private $_n = 1;
  
  function __construct($name) {
    $this->name = $name;
  }

  function expected($itemName, $expectedValue, $resultValue, $strict = true) {
    $this->items[$itemName] = [
      'index' => $this->_n++,
      'expected' => var_export($expectedValue, true),
      'returned' => is_a($resultValue, '\Exception') ? $resultValue : var_export($resultValue, true),
      'strict' => var_export($strict, true),
      'passed' => $strict ? ($expectedValue === $resultValue ? 'passed' : 'failed') : ($expectedValue == $resultValue ? 'passed' : 'failed')
    ];
    $this->evals[] = ($strict ? ($expectedValue === $resultValue) : ($expectedValue == $resultValue));
    return $this;
  }

  function evaluate($rule = null) {
    if(is_null($rule)) {
      $rule = [];
      for($i = 1; $i < count($this->evals); $i++) $rule[] = '$'.$i;
      $rule = implode(' && ', $rule);
    }
    $this->rule = $rule;
    $rule = 'return ' . preg_replace('/(\d+)/', 'this->evals[$1]', $rule);
    $this->passed = eval("$rule;");    
    return $this;
  }
}