'use strict';

var tests = {};
var benchmarks = {};

function getTraceData(filename) {
  return new Promise(function(resolve, request) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', filename);
    xhr.onload = function() {
      var start = false;
      var end = false;
      var data = {};
      var lines = xhr.responseText.match(/[^\r\n]+/g);

      lines.forEach( function(line) {
        var item, trace;
        trace = line.split("\t");line.match(/[^\t]+/g);
        if(!start && trace[2] && trace[2] === '0' && (trace[5].indexOf('call_user_func_array') < 0)) {
          start = true;
        }
        if(trace[5] && trace[5] === 'xdebug_stop_trace') end = true;
        if(start && !end) {
          if(trace[2] === '0') {
            item = {};
            item.level = trace[0];
            item.name = trace[5];
            item.userdefined = (trace[6] === '1');
            item.include = trace[7];
            item.file = trace[8];
            item.line = trace[9];
            item.params = [];
            for(var i = 0; i < parseInt(trace[10], 10); i++) item.params.push(trace[i +11]);
            item.start = {
              time: parseFloat(trace[3], 10),
              memory: parseInt(trace[4], 10)
            }
            data[trace[1]] = item
          }
          if(trace[2] === '1' && data[trace[1]]) {
            data[trace[1]].end = {
              time: parseFloat(trace[3], 10),
              memory: parseInt(trace[4], 10)
            }
          }
          if(trace[2] === 'R' && data[trace[1]]) {
            data[trace[1]].returned = trace[5];
          }
        }
      });
      resolve(data);
    };
    xhr.send();
  });
}

function showTraceBlock(trace) {
  var params;
  var div = document.createElement('div');
  div.className = 'trace-line';

  if(trace.userdefined) div.classList.add('userdefined');
  else div.classList.add('php');
  params = '';
  trace.params.forEach(function(param, index) { params += '<div>#'+index+' : '+param+'</div>'});

  div.innerHTML = `
    <div class="time">${trace.start.time}</div>
    <div class="item-trace-container">
      <div class="item-trace" style="margin-left:${2 * trace.level}em">
        <div><span class="item-trace-title">Function</span>${trace.name} (${trace.file}:${trace.line})</div>
        <div class="params"><div><span class="item-trace-title">Provided</span></div><div>${params}</div></div>
        <div class="returned"><span class="item-trace-title">Returned</span>${trace.returned}</div>
      </div>
    </div>
  `;
  return div;
}

function toggleTraceItem(ev) {
  ev.preventDefault();
  if(this.classList.contains('active')) {
    this.classList.remove('active');
    var elements = document.getElementsByClassName(this.dataset.classname);
    for(var i in elements) {
      if(elements[i].style) elements[i].style.display = 'none';
    }
  }
  else {
    this.classList.add('active');
    var elements = document.getElementsByClassName(this.dataset.classname);
    for(var i in elements) {
      if(elements[i].style) elements[i].style.display = 'flex';
    }
  }
}

function showTrace(ev) {
  var parent, placeholder;
  var commands, userdefined, php, params, returned, filter, highlight;

  // Container
  placeholder = document.createElement('div');
  placeholder.className = 'modal-container trace-container';
  $('.modal').find('.modal-container').remove();
  $('.modal-commands').remove();
  $('.modal').append(placeholder);
  $('.modal').show();

  // Get Data
  getTraceData(ev.target.dataset.file).then( function(data) {
    var base = parseInt(data[Object.keys(data)[0]].level, 10);
    var trace;

    commands = document.createElement('div');
    commands.className = 'commands';

    filter = document.createElement('input');
    filter.type = 'text';
    filter.placeholder = 'Filter...';
    filter.addEventListener('input', function(ev) {
      elements = placeholder.getElementsByClassName('trace-line');
      for(var i in elements) {
        if(elements[i].style) {
          if(this.value === '') elements[i].style.display = 'flex';
          else if(elements[i].innerHTML.match(this.value)) elements[i].style.display = 'flex';
          else elements[i].style.display = 'none';
        }
      }
    });

    highlight = document.createElement('input');
    highlight.type = 'text';
    highlight.placeholder = 'Highlight...';
    highlight.addEventListener('input', function(ev) {
      elements = placeholder.getElementsByClassName('trace-line');
      for(var i in elements) {
        if(elements[i].classList) {
          if(this.value === '') elements[i].classList.remove('highlight');
          else if(elements[i].innerHTML.match(this.value)) elements[i].classList.add('highlight');
          else elements[i].classList.remove('highlight');
        }
      }
    });

    userdefined = document.createElement('button');
    userdefined.innerHTML = 'USER DEFINED';
    userdefined.className = 'command active';
    userdefined.dataset.classname = 'userdefined';
    userdefined.addEventListener('click', toggleTraceItem.bind(userdefined));

    php = document.createElement('button');
    php.innerHTML = 'PHP DEFINED';
    php.className = 'command active';
    php.dataset.classname = 'php';
    php.addEventListener('click', toggleTraceItem.bind(php));

    params = document.createElement('button');
    params.innerHTML = 'PARAMS';
    params.className = 'command active';
    params.dataset.classname = 'params';
    params.addEventListener('click', toggleTraceItem.bind(params));

    returned = document.createElement('button');
    returned.innerHTML = 'RETURNED';
    returned.className = 'command active';
    returned.dataset.classname = 'returned';
    returned.addEventListener('click', toggleTraceItem.bind(returned));

    commands.appendChild(highlight);
    commands.appendChild(filter);
    commands.appendChild(userdefined);
    commands.appendChild(php);
    commands.appendChild(params);
    commands.appendChild(returned);
    $('.modal-title').prepend('<div class="modal-commands"></div>')
    $('.modal-commands').append('<h1>TRACE</h1>');
    $('.modal-commands').append(commands);

    for(var key in data) {
      data[key].level = parseInt(data[key].level, 10) - base;
      placeholder.appendChild(showTraceBlock(data[key]));
    }
  });
}

function updateDashboardTests() {
  
}

function updateDashboardBenchmarks() {
  
}

function updateDashboard() {
  var data = document.getElementById('pie-runs').data;    
  var labels = ['waiting', 'pending', 'done', 'error'];
  
  // Status
  $.each(tests, function(name, run) {    
    data[0].values = [0,0,0,0,0];
    data[2].values = [0,0,0,0,0];
    data[3].values = [0,0,0,0,0];
    data[5].values = [0,0,0,0,0];
    $.each(labels, function(index, label) {
      if(run[label]) {
        data[0].values[index]++;
        data[2].values[index]++;
        data[3].values[index] += run.count;
        data[5].values[index] += run.count;
      }
    });
  });
  
  $.each(benchmarks, function(name, run) {
    data[2].values = [0,0,0,0,0];
    data[4].values = [0,0,0,0,0];
    $.each(labels, function(index, label) {
      if(run[label]) {
        data[1].values[index]++;
        data[2].values[index]++;
        data[4].values[index] += run.count;
        data[5].values[index] += run.count;
      }
    });
  });
  
  Plotly.restyle('pie-runs', {values: [data[0].values]}, 0);
  Plotly.restyle('pie-runs', {values: [data[1].values]}, 1);
  Plotly.restyle('pie-runs', {values: [data[2].values]}, 2);
  Plotly.restyle('pie-runs', {values: [data[3].values]}, 3);
  Plotly.restyle('pie-runs', {values: [data[4].values]}, 4);
  Plotly.restyle('pie-runs', {values: [data[5].values]}, 5);
  
  // Tests
  if(Object.keys(tests).length) updateDashboardTests();
  
  // Benchmarks
  if(Object.keys(benchmarks).length) updateDashboardBenchmarks();
  
  // Hack to hide 0 values from donuts
  $('g.sliceText').each(function(index, text) {
    if(text.firstChild.innerHTML === '0') {      
      text.style.display = 'none';
      if(text.nextSibling) text.nextSibling.style.display = 'none';
    }
    else {
      text.style.display = '';
      if(text.nextSibling) text.nextSibling.style.display = '';
    }
  });
}

function drawDashboard() {
  var dataset = {
    labels: ['Waiting','Pending','Done','Error','None'],
    values: [0,0,0,0,1],
    type: 'pie',
    hole: '.4',    
    textinfo: 'value',
    textfont: {
      size: '20',
      color: '#fff'
    },
    sort: false
  }
  
  var datatests = {}, databenchmarks = {}, datatotal = {};
  var cdatatests = {}, cdatabenchmarks = {}, cdatatotal = {};
  
  $.extend(true, datatests, dataset, {domain: { x: [0, .32], y : [.51, 1] }, name: '', hoverinfo: 'label+value'});
  $.extend(true, databenchmarks, dataset, {domain: { x: [.33, .65], y : [.51, 1] }, name: '', hoverinfo: 'label+value'});
  $.extend(true, datatotal, dataset, {domain: { x: [.66, 1], y : [.51, 1] }, name: '', hoverinfo: 'label+value'});
  $.extend(true, cdatatests, dataset, {domain: { x: [0, .32], y : [0, .49] }, name: '', hoverinfo: 'label+value'});
  $.extend(true, cdatabenchmarks, dataset, {domain: { x: [.33, .65], y : [0, .49] }, name: '', hoverinfo: 'label+value'});
  $.extend(true, cdatatotal, dataset, {domain: { x: [.66, 1], y : [0, .49] }, name: '', hoverinfo: 'label+value'});
  
  $('.content.dashboard').html('<h2>Runs status</h2>');
  $('.content.dashboard').append('<div id="pie-runs" class="dashboard-pie test runs"></div>');
  Plotly.newPlot('pie-runs', [datatests, databenchmarks, datatotal, cdatatests, cdatabenchmarks, cdatatotal], {
    width: 1200,
    height: 600,    
    showlegend: true,
    annotations: [
      {
        font: { size: 22 },
        showarrow: false,
        text: "<b>Tests series</b>",
        x: 0.1,
        y: 1.15
      },
      {
        font: { size: 22 },
        showarrow: false,
        text: "<b>Benchmarks series</b>",
        x: 0.5,
        y: 1.15
      },
      {
        font: { size: 22 },
        showarrow: false,
        text: "<b>Total</b>",
        x: 0.855,
        y: 1.15
      },
      {
        font: { size: 18 },
        showarrow: false,
        text: (Object.keys(tests).length ? "<b>Runs</b>" : "<b>No Runs</b>"),
        x: 0.138,
        y: 0.795
      },
      {
        font: { size: 18 },
        showarrow: false,
        text: (Object.keys(benchmarks).length ? '<b>Runs</b>' : '<b>No Runs</b>'),
        x: 0.49,
        y: 0.795
      },
      {
        font: { size: 18 },
        showarrow: false,
        text: (Object.keys(tests).length || Object.keys(benchmarks).length ? '<b>Runs</b>' : '<b>No Runs</b>'),
        x: 0.85,
        y: 0.795
      },
      {
        font: { size: 18 },
        showarrow: false,
        text: (Object.keys(tests).length ? '<b>Tests</b>' : "<b>No Tests</b>"),
        x: 0.135,
        y: 0.212
      },
      {
        font: { size: 18 },
        showarrow: false,
        text: (Object.keys(benchmarks).length ? '<b>Bench-<br>marks</b>' : '<b>No<br>Benchs</b>'),
        x: 0.49,
        y: 0.18
      },
      {
        font: { size: 18 },
        showarrow: false,
        text: (Object.keys(tests).length || Object.keys(benchmarks).length ? '<b>Total</b>' : '<b>None</b>'),
        x: 0.852,
        y: 0.212
      }
    ]
  }, {displayModeBar: false})
    .then( function() { updateDashboard(); });
}

function testReport(name, file) {  
  var traces;
  
  var res = document.createElement('div');
  $('.content.test-' + name).find('.result-container').remove();
  $('.content.test-' + name).append(res);  
  $(res).addClass('result-container').load(file, function() {
    // Toggle details button
    $(res).find('button.toggle-test-details').click(function(ev) {
      var details = $(ev.target).parent().next();
      if(details.css('display') === 'none') {
        details.show();
        $(ev.target).html('Hide details');
      }
      else {
        details.hide();
        $(ev.target).html('Show details');
      }
    });
    // Instance source button    
    
    // Trace button
    traces = res.getElementsByClassName('parse-trace');
    for(var i = 0; i < traces.length; i++) {
      traces[i].addEventListener('click', showTrace);
    }    
  });
}

function start(ev) {
  var action = $(ev.target).data('action');
  var name = $(ev.target).data('name');
  var script = $(ev.target).data('path');

  $.ajax({
    url: location.href + `?action=${action}&name=${name}&script=${script}`,
    
    beforeSend : function() {
      $(ev.target).hide();
      tests[name].waiting = false;
      $('.dot.status.' + name).removeClass('waiting').addClass('pending');
      tests[name].pending = true;
      updateDashboard();
    },
    
    success: function(data) {
      if(action === 'test') {
        $.extend(true, tests[name], data);
        if(tests[name].results.run.tests === tests[name].results.run.testspassed) {
          tests[name].passed = true;
          $('.dot.result.' + name).removeClass('pending').addClass('passed');
        }
        else {
          tests[name].passed = false;
          $('.dot.result.' + name).removeClass('pending').addClass('failed');
        }
        testReport(name, data.report);
      }
      else { // Benchmark

      }
      tests[name].pending = false;
      tests[name].done = true;
      updateDashboard();
      $('.dot.status.' + name).removeClass('pending').removeClass('error').addClass('done');
    },
    
    error: function(jqXHR) {
      var res = document.createElement('div');
      
      $('.content.test-' + name).find('.result-container').remove();
      $(res).addClass('result-container').html(jqXHR.responseText);
      $(ev.target).parents('.content').append(res);
      tests[name].pending = false;
      tests[name].error = true;
      $('.dot.status.' + name).removeClass('pending').removeClass('done').addClass('error');
      updateDashboard();
    },
    
    complete: function() {
      $(ev.target).show();      
    }
  });
}

function toggleTab(ev) {
  ev.preventDefault();
  $('.content').hide()
  $('.tab').removeClass('selected');
  $('.' + ev.target.id).show()
  $(ev.target).addClass('selected');
}

function build() {
  var i;
  var header, main, tabs;
  var tmp, list;

  header = document.createElement('header');
  header.className = 'header';
  document.body.appendChild(header);

  tmp = document.querySelectorAll('meta[type="test"]');
  if(tmp.length) {
    for(i = 0; i < tmp.length; i++) {
      list = JSON.parse(atob(tmp[i].getAttribute('tests')));
      tests[tmp[i].content] = {
        name: tmp[i].content,
        path: tmp[i].getAttribute('path'),
        tests: list,
        count: list.length,
        waiting: true,
        pending: false,
        error: false,
        done: false
      };
    }
  }

  tmp = document.querySelectorAll('meta[type="benchmark"]');
  if(tmp.length) {
    for(i = 0; i < tmp.length; i++) {
      list = JSON.parse(atob(tmp[i].getAttribute('benchmarks')));
      benchmarks[tmp[i].content] = {
        name: tmp[i].content,
        path: tmp[i].path,
        benchmarks: list,
        count: list.length,
        waiting: true,
        pending: false,
        error: false,
        done: false
      };
    }
  }

  // Main header
  main = document.createElement('div');
  $(main).addClass('main');
  $(main).append('<div class="logo"><img src="assets/logo.png" alt="Taste of Liquor"></div>');
  if(Object.keys(tests).length) $(main).append('<div><button class="button" id="run-tests">Run all tests</button></div>');
  if(Object.keys(benchmarks).length) $(main).append('<div><button class="button" id="run-benchmarks">Run all benchmarks</button></div>');
  if(Object.keys(tests).length && Object.keys(benchmarks).length) $(main).append('<div><button class="button" id="run-all">Run all tests and benchmarks</button></div>');
  $(header).append(main);
  
  // Modal window for trace and source
  $(document.body).append('<div class="modal" style="display:none"></div>');
  $('.modal').append('<div class="modal-title"><button class="modal-close button">Close</button></div>');
  $('.modal-close').click( function() { $('.modal').hide() });

  // Tabs
  tabs = document.createElement('div');
  $(tabs).addClass('tabs');
  $(document.body).append('<div class="container"></div>');
  $(tabs).append('<div id="dashboard" class="tab dashboard selected">Dashboard</div>');
  $('.container').append('<div class="content dashboard" data-id="dashboard"></div>');
  if(tests) {
    $.each(tests, function(name, run) {
      $(tabs).append(`<div id="test-${name}" class="tab test" data-action="test" data-name="${name}" data-path="${run.path}"><span class="dot status ${name} waiting"></span><span class="dot result ${name} pending"></span>${name}</div>`);
      $('.container').append(`<div class="content test-${name}" style="display:none">
        <div class="start"><button class="start button" data-action="test" data-name="${name}" data-path="${run.path}">New Run</button></div>
      </div>`);
    });
  }
  if(benchmarks) {
    $.each(benchmarks, function(name, run) {
      $(tabs).append(`<div id="bench-${name}" class="tab benchmark" data-action="benchmark" data-name="${name}" data-path="${run.path}">${name}</div>`);
      $('.container').append(`<div class="content bench-${name}" style="display:none">
        <div class="start"><button class="start button" data-action="benchmark" data-name="${name}" data-path="${run.path}">New Run</button></div>
      </div>`);
    });
  }
  $(header).append(tabs);

  $('.tab').click(toggleTab);
  $('button.start').click(start);
  drawDashboard();

  // Main command buttons
  if($('#run-tests').length) {
    $('#run-tests').click(function(ev) {
      $('.tab.test').each(function(index, tab) {
        var ev = { target : tab };
        start(ev);
      });
    });
  }
}

$(document).ready(build);