function toggle(ev) {
  var details;

  ev.preventDefault();
  details = ev.target.parentNode.parentNode.nextSibling;
  ev.target.innerHTML = (details.style.display === 'none' ? '[-]' : '[+]')
  details.style.display = (details.style.display === 'none' ? 'flex' : 'none');
  if(details.style.display === 'none' && details.nextSibling.classList.contains('trace-container')) details.parentNode.removeChild(details.nextSibling);
}

function hideTrace(ev) {
  ev.preventDefault;
  ev.target.innerHTML = 'Show trace';
  if(this) this.parentNode.removeChild(this);
  ev.target.removeEventListener('click', hideTrace);
  ev.target.addEventListener('click', showTrace);
}

function getTraceData(filename) {
  return new Promise(function(resolve, request) {
    var xhr = new XMLHttpRequest();

    xhr.open('GET', 'tests/traces/' + filename + '.xt');
    xhr.onload = function() {
      var start = false;
      var end = false;
      var data = {};
      var lines = xhr.responseText.match(/[^\r\n]+/g);

      lines.forEach( function(line) {
        var item, trace;
        trace = line.split("\t");line.match(/[^\t]+/g);
        if(trace[2] && trace[2] === '0') start = true;
        if(trace[5] && trace[5] === 'xdebug_stop_trace') end = true;
        if(start && !end) {
          item = data[trace[1]] || {};
          if(trace[2] === '0') {
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
          }
          if(trace[2] === '1') {
            item.end = {
              time: parseFloat(trace[3], 10),
              memory: parseInt(trace[4], 10)
            }
          }
          if(trace[2] === 'R') {
            item.returned = trace[5];
          }
          data[trace[1]] = item
        }
      });
      resolve(data);
    };
    xhr.send();
  });
}

function showTraceBlock(trace) {
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
  placeholder.className = 'trace-container';
  parent = ev.target.parentNode;
  while(!parent.classList.contains('details')) parent = parent.parentNode;
  parent.parentNode.insertBefore(placeholder, parent.nextSibling);

  ev.target.innerHTML = 'Hide trace';
  ev.target.removeEventListener('click', showTrace);
  ev.target.addEventListener('click', hideTrace.bind(placeholder));

  // Get Data
  getTraceData(ev.target.dataset.file).then( function(data) {
    var base = parseInt(data[Object.keys(data)[0]].level, 10);
    var trace;

    placeholder.innerHTML = '<div class="title">Trace</div>';
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
    placeholder.appendChild(commands);
    
    for(var key in data) {
      data[key].level = parseInt(data[key].level, 10) - base;
      placeholder.appendChild(showTraceBlock(data[key]));
    }
  });
}

function start() {
  var h1, h2, h3;
  var buttons = document.getElementsByClassName('toggle-details');

  //Activate toggler
  document.getElementById('toggle-all').addEventListener('click', function() {
    var conts = document.getElementsByClassName('ok');
    for(var i = 0; i < conts.length; i++) conts[i].classList.toggle('toggled');
  })
  for(var i = 0; i < buttons.length; i++) buttons[i].onclick = toggle;

  //Count results
  h3 = document.getElementsByTagName('h3');
  for(var i = 0; i < h3.length; i++) {
    var ul = h3[i].nextSibling;
    var total = ul.getElementsByClassName('test').length;
    var passed = ul.querySelectorAll('.test.passed').length;
    h3[i].innerHTML += ' (' + passed + '/' + total + ')';
    h3[i].dataset.total = total;
    h3[i].dataset.passed = passed;
    if(passed === total) h3[i].classList.add('ok');
    else h3[i].classList.add('ko');
  }

  h2 = document.getElementsByTagName('h2');
  for(var i = 0; i < h2.length; i++) {
    var h3 = h2[i].nextSibling.getElementsByTagName('h3');
    var total = 0;
    var passed = 0;
    for(var j = 0; j < h3.length; j++) {
      total += parseInt(h3[j].dataset.total, 10);
      passed += parseInt(h3[j].dataset.passed, 10);
    }
    h2[i].innerHTML += ' (' + passed + '/' + total + ')';
    h2[i].dataset.total = total;
    h2[i].dataset.passed = passed;
    if(passed === total) h2[i].classList.add('ok');
    else h2[i].classList.add('ko');
  }

  h1 = document.getElementsByTagName('h1');
  for(var i = 0; i < h1.length; i++) {
    var h2 = h1[i].nextSibling.getElementsByTagName('h2');
    var total = 0;
    var passed = 0;
    for(var j = 0; j < h2.length; j++) {
      total += parseInt(h2[j].dataset.total, 10);
      passed += parseInt(h2[j].dataset.passed, 10);
    }
    h1[i].innerHTML += ' (' + passed + '/' + total + ')';
    h1[i].dataset.total = total;
    h1[i].dataset.passed = passed;
    if(passed === total) h1[i].classList.add('ok');
    else h1[i].classList.add('ko');
  }

  var titles = document.querySelectorAll('h1,h2,h3');
  for(i = 0; i < titles.length; i++) {
    titles[i].addEventListener('click', function(ev) {
      var target = ev.target;

      if(target.nodeName === 'TT') target = target.parentNode;
      target.classList.toggle('toggled');
    });
  }

  // Activate trace button
  traces = document.getElementsByClassName('parse-trace');
  for(var i = 0; i < traces.length; i++) {
    traces[i].addEventListener('click', showTrace);
  }
}

if(document.readyState === 'complete') start();
else (document.onreadystatechange = function() {
  if(document.readyState === 'complete') start();
});


