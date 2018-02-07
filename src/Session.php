<?php
namespace Taste;

use Taste\Run;
use \Exception;

class Session {
  public $basedir;
  public $tastedir = __DIR__;
  // public $baseurl;
  public $cachefolder = 'cache';
  public $relativecachefolder = 'cache';
  public $autotests = [];
  public $autobenchmarks = [];

  function __construct($cachefolder = null) {
    if(!defined('DS')) define('DS', DIRECTORY_SEPARATOR);

    $this->basedir = getcwd() . DS;
    if(!empty($cachefolder)) {
      $this->cachefolder = $this->basedir . $cachefolder;
      $this->relativecachefolder = $cachefolder;
    }
    else $this->cachefolder = $this->basedir . $this->cachefolder;

    $nativefuncs = get_class_methods('Taste\Run');
    $nativefuncs = array_merge($nativefuncs, ['before', 'beforeEach', 'afterEach', 'after']);

    if(!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
      http_response_code(500);
      require($_GET['script']);
      $classname = $_GET['name'];
      $taste_instance = new $classname($this->cachefolder, $this->relativecachefolder);
      $funcs = $this->extract_tests($nativefuncs, $taste_instance);
      if(method_exists($taste_instance, 'before')) $taste_instance->before();
      foreach($funcs as $func) call_user_func(array($taste_instance, $func));
      if(method_exists($taste_instance, 'after')) $taste_instance->after();
      http_response_code(200);
      header('Content-type:Application/json');
      $response = [
        'report' => $taste_instance->relativereportfile
      ];
      if($_GET['action'] == 'test') {
        $response['results'] = $taste_instance->results;
      }
      echo json_encode($response);
    }
    else {
      // Create folders
      if(!is_dir($this->cachefolder) && !mkdir($this->cachefolder)) throw new Exception('Unable to create cache folder');      
      if(!is_dir($this->basedir . DS . 'assets') && !mkdir($this->basedir . DS . 'assets')) throw new Exception('Unable to create assets folder');
      if(!is_dir($this->cachefolder . DS . 'reports') && !mkdir($this->cachefolder . DS . 'reports')) throw new Exception('Unable to create cache reports folder');
      if(!is_dir($this->cachefolder . DS . 'traces') && !mkdir($this->cachefolder . DS . 'traces')) throw new Exception('Unable to create cache traces folder');
      if(!is_dir($this->cachefolder . DS . 'benchmarks') && !mkdir($this->cachefolder . DS . 'benchmarks')) throw new Exception('Unable to create cache benchmark folder');

      // Empty trace folder
      array_map('unlink', glob($this->cachefolder . DS . 'traces' . DS . "*.xt"));

      //Copy scripts and css assets
      if(!@copy($this->tastedir . DS . 'assets' . DS . 'logo.png', $this->basedir . 'assets' . DS . 'logo.png')) throw new Exception('Unable to copy files to tests folder');
      if(!@copy($this->tastedir . DS . 'js' . DS . 'taste.js', $this->basedir . 'assets' . DS . 'taste.js')) throw new Exception('Unable to copy files to tests folder');
      if(!@copy($this->tastedir . DS . 'styles' . DS . 'taste.css', $this->basedir . 'assets' . DS . 'taste.css')) throw new Exception('Unable to copy files to tests folder');
      if(!@copy($this->tastedir . DS . 'js' . DS . 'jquery-3.3.1.min.js', $this->basedir . 'assets' . DS . 'jquery-3.3.1.min.js')) throw new Exception('Unable to copy files to tests folder');
      if(!@copy($this->tastedir . DS . 'js' . DS . 'plotly-latest.min.js', $this->basedir . 'assets' . DS . 'plotly-latest.min.js')) throw new Exception('Unable to copy files to tests folder');

      // Fetch auto tests
      $this->get_autotests($nativefuncs);
      $this->get_autobenchmarks($nativefuncs);

      // Render layout
      $this->render();
    }
  }

  function extract_tests($nativefuncs, $class) {
    $funcs = get_class_methods($class);
    $funcs = array_diff($funcs, $nativefuncs);
    return $funcs;
  }

  function get_autotests($nativefuncs) {
    if(!is_dir($this->basedir . 'tests')) return;
    $dir = new \RecursiveDirectoryIterator($this->basedir . 'tests');
    $tests = new \RecursiveIteratorIterator($dir);
    $tests->rewind();
    while($tests->valid()) {
      if (!$tests->isDot()) {
        if(preg_match('/\\\\(\w+)\.php$/', $tests->key(), $matches)) {
          require($tests->key());
          $this->autotests[$matches[1]] = [
            'path' => $tests->key(),
            'tests' =>  $this->extract_tests($nativefuncs, $matches[1])
          ];
        }
      }
      $tests->next();
    }
  }
  function get_autobenchmarks($nativefuncs) {
    if(!is_dir($this->basedir . 'benchmarks')) return;
    $dir = new \RecursiveDirectoryIterator($this->basedir . 'benchmarks');
    $benchmarks = new \RecursiveIteratorIterator($dir);
    $benchmarks->rewind();
    while($benchmarks->valid()) {
      if (!$benchmarks->isDot()) {
        if(preg_match('/\\\\(\w+)\.php$/', $benchmarks->key(), $matches)) {
          $this->autobenchmarks[$matches[1]]['path'] = $benchmarks->key();
          require($benchmarks->key());
          $this->autobenchmarks[$matches[1]]['benchmarks'] = $this->extract_tests($nativefuncs, $matches[1]);
        }
      }
      $benchmarks->next();
    }
  }

  function render() {
    echo '<html>';
    echo '<head>';
    echo '<title>PHP Unit Testing and benchmarking</title>';
    foreach($this->autotests as $name => $run) {
      $tests = base64_encode(json_encode(array_values($run['tests'])));
      echo "<meta name=\"run\" content=\"$name\" type=\"test\" path=\"{$run['path']}\" tests=\"$tests\">";
    }
    foreach($this->autobenchmarks as $name => $run) {
      $benchs = base64_encode(json_encode(array_values($run['benchmarks'])));
      echo "<meta name=\"run\" content=\"$name\" type=\"benchmark\" path=\"{$run['path']}\" benchmarks=\"$benchs\">";
    }
    echo '<link rel="stylesheet" type="text/css" href="assets/taste.css">';
    echo '<script type="text/javascript" src="assets/jquery-3.3.1.min.js"></script>';
    echo '<script type="text/javascript" src="assets/taste.js" defer></script>';
    echo '<script type="text/javascript" src="assets/plotly-latest.min.js" defer></script>';
    echo '</head><body></body></html>';
  }
}