<p align="center"><a href="https://liqueurdetoile.com" target=_blank"><img src="https://raw.githubusercontent.com/liqueurdetoile/tasteliquor/master/docs/assets/logo_lqdt.png" alt="Liqueur de Toile"></a></p>

# Taste a.k.a. Taste of Liquor
This PHP library is a complete environment for testing, debugging and benchmarking a PHP app. It provides a GUI and is based on ajax to perform operations and display results.
Unlike many others PHP unit test (like PHP-Unit for instance), Taste of Liquor is not going **from code to test logic, but from test logic applied to callables**. Therefore, you can easily achieve testing end benchmarking many datasets on many callables.

## Disclaimer
You must remember that this kind of tool is for **development only** ! It obviously creates backdoors to access informations about your code. **Never deploy it on your production server if you don't know what you are doing.**

## Bugs and contributions
This tool is still in dev status and will have some bugs that can be reported here. If you want to contribute, just fork the project and submit a pull request. A [todo list](#todo-list) is maintained.

![dashboard](https://raw.githubusercontent.com/liqueurdetoile/tasteliquor/master/docs/assets/liquortaste_screenshot3.png)

# Table of contents
- [Installation](#installation)
- [Usage](#usage)
  * [Mastering concepts](#mastering-concepts)
  * [Runs](#runs)
    + [Basic run class](#basic-run-class)
    + [Callbacks](#callbacks)
  * [Tests](#tests)
    + [Basic test creation](#basic-test-creation)
    + [Naming a test](#naming-a-test)
  * [Testing instances](#testing-instances)
    + [Add instance](#add-instance)
    + [Replace instance](#replace-instance)
    + [Remove instance](#remove-instance)
  * [Samples and test evaluation](#samples-and-test-evaluation)
    + [Creation](#creation)
    + [Basic sample example](#basic-sample-example)
    + [Test evaluation rule](#test-evaluation-rule)
    + [Example of excluding sample from test evaluation](#example-of-excluding-sample-from-test-evaluation)
  * [Result class powers Taste of Liquor](#result-class-powers-taste-of-liquor)
  * [Result object usage example](#result-object-usage-example)
- [GUI](#gui)
  * [Header and tabs](#header-and-tabs)
  * [Dashboard](#dashboard)
  * [Test report](#test-report)
  * [Test report details](#test-report-details)
  * [Test report trace](#test-report-trace)
- [Todo List](#todo-list)
  
## Installation
Install with composer : `composer require liqueurdetoile/tasteliquor`

As this time, there is some little extra setup to make it work :
1. Creates a main folder to home your tests and benchmarks scripts (/tastes for instance). **This folder have to be accessible through your browser for GUI use**
1. In this folder creates an `index.php` file with this code :
```php
<?php
namespace Taste;

// Adapt it given your folder configuration
require '../vendor/autoload.php';

$session = new Session();
```
1. Creates a `tests` folder under the main folder to stores your tests runs and a `benchmarks` folder to stores your benchmarks runs (you can set as many subfolders under these folders. They'll be scanned at runtime to detect scripts)

Taste of Liquor will automatically create `assets` and `cache` folder at first runtime to hold its own ressources and store results.
## Usage
_Hint : You can browse the [`/tastes`](https://github.com/liqueurdetoile/tasteliquor/tree/master/tastes) folder of this repo for examples._
### Mastering concepts
Taste of Liquor is based on **runs**. For automation to work, each run needs to match a file and each file must contain only a single class that extends the core class `Run`. File name must be the same than class name.

Each run can contain several **tests** (i.e. methods of the class) and each tests can contain several **samples**.

A sample is the unitary test, basically a set of data inputs, operations and conditions that returns a boolean value if passed or failed. If all samples are passing, test is passing.

Each sample can be run on multiple **testing instances** (function/class to be tested). Instances can be added or removed at runtime.

### Runs
Okay, let's throw away theory by now. For a complete example, you can refer to [examples.php](https://github.com/liqueurdetoile/tasteliquor/blob/master/tastes/tests/examples.php) demo run file.

#### Basic run class
Create `myfirsttestrun.php` in your tests folder :
```php
<?php
use Taste\Run;

class MyFirstTestRun extends Run {
}
```
Run's name will automatically be set to `MyFirstTestRun`.

#### Callbacks
There is some special method callbacks for a run :
1. `before` method will be called at the beginning of the run.
1. `beforeTest` method will be called before each test logic.
2. `beforeEach` method will be called before each sample/instance logic.
3. `afterEach`method will be called after each sample/instance logic.
1. `afterTest` method will be called after each test logic.
4. `after` method will be called at the end of the run.

Each callback is provided with the current [Testing Instance](#testing-instances) which can be updated by passing it by reference in your callback :
```php
  function before(&$instance) { $instance = function(int $a) { return $a; } }
```

Great, you're done for setting a run with actually no tests :blush:

### Tests
#### Basic test creation
Each test matches a method of your run class, for instance :
```php
<?php
use Taste\Run;

class MyFirstTestRun extends Run {
  function myFirstTest() {
    // Test logic here
    // test name will be "MyFirstTest"
    $this->test
  }
  
  function mySecondTest() {
    // Test logic here
    // test name will be "My wonderful second test"
    $this->test
      ->name('My wonderful second test');
  }
}
```
`$this->test` returns a chainable instance of `Taste\Test`. Though it's possible, you better set up only one main instance of `Taste\Test` per method for the sake of reports clarity. It is possible to nest several `Test` instances into one main instance (see below).
#### Naming a test
Test name will be default to function name unless you set a more human-friendly name with the `name` method wich only accepts a `string`.

Okay, test is set up but, wait, what do we want to test exactly ?
### Testing instances
Testing instances are code logics that can be launched by Taste of Liquor (functions or class) and check if they behave as expected. The can be anything :
* Closures (anonymous functions)
* Named functions
* Static class methods
* Instantiated class methods
Obviously, they must be in the scope of our run instance. You can write them in the same file, require or include them or autoload them.
#### Add instance
Testing instances are added on-the-fly with the `addInstance` method. You can add them at `Run` level by calling it on your run instance (available for all tests when added) or at `Test` level by calling it on your test instance (only available for current test).
```php
Taste\Run::addInstance(string $name, callable $callable) // At run level
Taste\Test::addInstance(string $name, callable $callable) // At test level
```
Taste of Liquor is using an underlying call to [`call_user_func_array`](http://php.net/manual/en/function.call-user-func-array.php) to launch each sample test. Therefore, the `$callable` declaration must follow usual conventions :
* Closure : `addInstance('i', function($a) { return true; })`
* Named function : `addInstance('i', 'myFunction')`
* Static class: `addInstance('i', array('myClass', 'myStaticMethod'))`
* Class instance: `addInstance('i', array(new('myClass'), 'myMethod'))`
* Variable : `addInstance('i', $myFunction)`, given `$myFunction` is pointing to a callable

A sample is ran against each available instances at its runtime.

**Hint** : Taste of Liquor can perform any logic on instance at evaluation time, therefore there's no need to set up unwanted returned values.

**Example**
```php
<?php
use Taste\Run;

class MyFirstTestRun extends Run {
  function before() {
    // This instance will be available from the beginning
    $this->addInstance('allRun', function(Int $a) { return $a; })
  }
  
  function myFirstTest() {
    // Test logic here
    // test name will be "MyFirstTest"
    $this->test
      ->name('First test')
      // This instance will only be available in this test but from the beginning
      ->addInstance('testLevel1', function(Int $a, Int $b) { return $a + $b; })
      /* Sample Logic */
      // This instance will only be available in this test but only for remaining samples
      ->addInstance('testLevel2', function(Int $a) { return $a * 2; })
      /* Sample Logic */
    
    // This instance will only be available for remaining tests (it's better places at the begging of the following test logic though
    $this->addInstance('allRun2', function(Int $a) { return $a * $a; })
  }
}
```
Multiple instances are very useful to tests different logic on the same dataset.

#### Replace instance
Just add your new testing instance with the same name than the one you want to replace.

#### Remove instance
Testing instances can also be removed on-the-fly with the `removeInstance` method :
* A testing instance created at run level can be removed at run level and becomes unavailable for remaining samples and tests
* A testing instance created at run level can be removed at test level and becomes onmy unavailable for remaining samples of this test
* A testing instance created at test level can only be removed at test level and becomes unavailable for remaining samples of this test

A Testing instance is removed given its name :
```php
Taste\Run::removeInstance($name) // At run level
Taste\Test::removeInstance($name) // At test level
```
### Samples and test evaluation
Samples are the heart of the testing and benchmarking logic. They are responsible to answer to a simple question : failed or passed.
#### Creation
You simply need to call the method sample.
```php
Taste\Test::sample(mixed $input, mixed $output, boolean $strict = true, string $name = null)
```
* `$input` : Value provided to the testing instance. It should be an array of values if the tested callable needs more than one argument. Taste of Liquor also accepts callables that returns a value. Callable is provided with the testinfg instance as argument.
* `$output` : Value to be compared to the result of the instance or result of some logic on the instance. Taste of Liquor accepts callables that returns a value. Callable is provided with 3 parameters : returned value of the testing instance, the instance itself, the [Result](### Results) instance of the sample.
* `$strict` : on true, triggers a type comparison with the value comparison
* `$name` : Name the current sample

#### Basic sample example
At the simpliest approach, you can do such things :
```php
<?php
use Taste\Run;

class MyFirstTestRun extends Run {
  function myFirstTest() {
    $this->test
      ->name('First test')
      ->addInstance('testLevel1', function(Int $a, Int $b) { return $a + $b; })
      ->sample([1, 2], 3)
      ->evaluate()
  }
}
```
It simply means to provide 1 as first parameter,  2 as second parameter and to expect that result would be 3 (our testing instance returns $a + $b).

The call to method `evaluate` tells Taste of Liquor that the test is over and the resukt of the test should be computed.

#### Test evaluation rule
We said before that all samples must passed for whole test to pass. It is the default behaviour but you can be a more tricky by providing a rule.
```php
Taste\Test::evaluate(string $rule = null)
```
If `$rule` is null, the rule applied by evaluate is : `'$1 && $2 && [...] $n'` where i is the sample index (**starting from 1**).
You can define any boolean logic to mix the results of your samples. For instance : `'$1 && !$2 && ($3 || $4)'` will be totally valid with 4 or more samples.

The main use of this rule is to set aside some samples that you want to run but not take in account for test result.

#### Example of excluding sample from test evaluation
```php
<?php
use Taste\Run;

class MyFirstTestRun extends Run {
  function myFirstTest() {
    $this->test
      ->name('First test')
      ->addInstance('powA', function(Int $a) { return $a*$a; })
      ->addInstance('powB', function(Int $a) { return pow($a,2); })
      ->addInstance('powC', function(Int $a) { return sqrt(pow($a,2)); })
      ->sample(2, 4)
      ->removeInstance('powA')
      ->removeInstance('powB')
      ->removeInstance('powC')
      ->addInstance('Inverse', function(Int $a) { return 1 / $a; })
      ->sample(1, 2)
      ->evaluate($1);
  }
}
```
This test will pass event if the second sample will obviously fail. The informations about the second sample will be available in [test report](#test-report).

### Result class powers Taste of Liquor
Behind each test and each sample, there is an instance of `Taste\Result` that multiplies testing possibility. You can instantiate as many Result as you want but do not forget to feed back the sample result :wink:

As we said, you can perform any testing logic in your sample with the Result object.
```php
Taste\Result::expected(string $itemName, mixed $expectedValue, mixed $resultValue, boolean $strict = true)
Taste\Tesult::evaluate($rule = null)
```
The evaluate method works exactly the same way than the [`Test` one](#Test-evaluation-rule) excepted that it will consider the result of the expectations.
An expectation is set with the `expected` method :
* `itemName` : Useful string wich will be displayed in the report
* `$expectedValue` : Expected value
* `$resultValue` : Value to compare to expected value
* `$strict` : If enable, also performs a type comparison between expected and result value

### Result object usage example
Let's say that we want to test this class :
```php
<?php
class Foo {
  private $_defined = false;
  private $_name = 'Bar';
  
  __construct($name = null) {
    if(isset($name)) {
      $this->_name = $name;
      $this->_defined = true;
    }
  }
  
  function theStupidThing($a = null) {
    if(is_null $a) return $this->_defined;
    else throw new Exception('Tadaam');
  }
}
```
...with two instances : `new Foo()` and `new Foo('Bar')`. Yiiks, the same name :unamused:

```php
<?php
use Taste\Run;

class testFoo extends Run {
  function before() {
    $this->addInstance('FooNoName', array(new Foo(), 'theStupidThing'));
    $this->addInstance('FooNamed', array(new Foo('Bar'), 'theStupidThing'));
  }
  
  function foo1() {
    $this->test
      ->name('Foo bas ways')
      ->sample(null, true)
      ->evaluate();
      // No way won't work
  }
  
  function foo2() {
    $this->test
      ->name('Foo far better')
      ->sample(null, function($returned, $instance, &$result) {
          $result->expected('Returns defined value', $instance->defined, $returned)
          $result->expected('Foo class name', 'Bar', $instance->_name, true)
          $result->evaluate('$1 && $2');
        }, true, 'Dat null sample')
      ->sample(1, function($returned, $instance, &$result) {
          $result->expected('Exception expected', true, $returned instanceof Exception)
          $result->evaluate();
        }, true, 'Dat Exception sample')
      ->evaluate()
  }
}
```
With the second approach, the result of the evaluations **inside** the sample will be available in your [test report](#Test-report-details and you'll won't be lost in finding what have failed if the sample evaluation requires many expectations.

## GUI
Taste of Liquor is not available on CLI (maybe in the future) but provides and ajax-based GUI.

### Header and tabs
The header of the GUI contains a wonderful log... hum, brumm, global buttons to run tests, benchmarks or all at once.
For each run that is detected, a specific tab is created. The first rounded color dot means its status (surprisingly blue = waiting, orange = pending, green = done, red = error) and the second squared dot means its result (grey = not run, green = passed, red = failed)
Clicking on tab will lead you to its report.

### Dashboard
![dashboard](https://raw.githubusercontent.com/liqueurdetoile/tasteliquor/master/docs/assets/liquortaste_screenshot1.png)
The dashboard presents the status of the tests and benchmarks detected by Taste of Liquor. It will be imporoved in next version.

### Test report
![Test report](https://raw.githubusercontent.com/liqueurdetoile/tasteliquor/master/docs/assets/liquortaste_screenshot2.png)
The report screen displays all run results. Passed results are hidden by default but can be toggled with the `show details` button. You can use the `run test` to start (or start again) only this run.

### Test report details
![Report Details](https://raw.githubusercontent.com/liqueurdetoile/tasteliquor/master/docs/assets/liquortaste_screenshot3.png)
This view give access to each sample details inside a test :
* Arguments type and value
* Testing Instance(s) used by the sample
* Details of the evaluations
* Duration of the sample runtime

You can also access the full trace with _ad hoc_ button

### Test report trace
![Trace](https://raw.githubusercontent.com/liqueurdetoile/tasteliquor/master/docs/assets/liquortaste_screenshot4.png)
This view shows up the full trace of a sample for a given instance. OYou can highlight or filter rows given a string or use the filter buttons. `USER DEFINED` will toggle user-defined functions display and `PHP DEFINED` will toggle built-in functions display.

## Todo List
There is many things to do still but taste of Liquor is already fully functionnal for testing purposes.

- [ ] Add instance display on reports
- [ ] Add benchmarks
- [ ] Add tests and benchmarks overview on dashboard
- [ ] Add view source on reports
- [ ] Add timeline format to test report
- [ ] Add memory deltas to test report
