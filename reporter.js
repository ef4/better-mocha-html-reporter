import Ember from 'ember';
var $ = Ember.$;

// Grab our own Date reference in case Sinon alters it later.
var _Date = Date;

export default class Reporter {

  constructor(runner) {
    this.passes = 0;
    this.failures = 0;
    this.setupDOM();
    this.setupEvents(runner);
  }

  setupDOM() {
    var root = $('#mocha');
    if (!root) {
      alert("#mocha div missing, add it to your document");
      return;
    }
    root.append(template);
    this.stats = $('#mocha-stats');
    this.stack = [$('#mocha-report')];

    this.stats.find('input')
      .attr('checked', /hide_passed/.test(window.location.hash))
      .on('change', () => this.updateHidePassed());

    this.updateHidePassed();
  }

  setupEvents(runner) {
    function handlerForEvent(event) {
      return ('on ' + event).replace(/ [\w]/g, function(m){
        return m[1].toUpperCase();
      });
    }
    Ember.A([
      'start',
      'suite',
      'suite end',
      'test end',
      'pass',
      'fail',
      'end'
    ]).forEach((event) => {
      var args; // this is here to humor jshint
      runner.on(event, (...args) => this[handlerForEvent(event)](...args));
    });
  }

  onStart() {
    this.startedAt = new _Date();
  }

  onSuite(suite) {
    if (suite.root) { return; }
    var fragment = $('<li class="suite"><h1><a></a></h1><ul></ul></li>');
    fragment.find('a').text(suite.title).attr('href', grepURL(suite.fullTitle()));
    this.stack[0].append(fragment);
    this.stack.unshift(fragment.find('ul'));
  }

  onSuiteEnd(suite) {
    if (!suite.root) {
      var ul = this.stack.shift();
      if (ul.find('.fail').length > 0) {
        ul.parent().addClass('fail');
      } else {
        ul.parent().addClass('pass');
      }
    }
  }

  onPass() {
    this.passes++;
    this.stats.find('.passes em').text(this.passes);
  }

  onFail(test, err) {
    this.failures++;
    this.stats.addClass('sad')
      .find('.failures em').text(this.failures);
    test.err = err;
    if (test.type === 'hook') {
      this.onTestEnd(test);
    }
  }

  onTestEnd(test) {
    this.updateDuration();

    var frag = $('<li class="test"><h2></h2></li>');
    frag.find('h2').text(test.title);

    frag.addClass(speedOf(test));
    if (test.state === 'passed') {
      frag.addClass('pass');
      frag.find('h2').append('<span class="duration"></span>');
      frag.find('.duration').text(test.duration + 'ms');
    } else if (test.pending) {
      frag.addClass('pass');
      frag.addClass('pending');
    } else {
      frag.addClass('fail');
      frag.append('<pre class="error"></pre>');
      frag.find('.error').text(errorSummary(test))
        .append('<div class="dump">Dump stack to console</div>');
      frag.find('.dump').on('click', function() {
          console.log(test.err.stack);
      });

    }

    if (!test.pending) {
      var h2 = frag.find('h2');
      h2.append('<a class="replay">‣</a>');
      h2.find('.replay').attr('href', grepURL(test.fullTitle()));
      var code = $('<pre style="display:none"><code></code></pre>');
      code.find('code').text(clean(test.fn.toString()));
      frag.append(code);
      h2.on('click', function() {
        code.toggle();
      });
    }

    if (!this.stack[0]) {
      var rep = $('#mocha-report');
      rep.append('<li class="suite"><h1>ORPHAN TESTS</h1><ul></ul></li>');
      this.stack.unshift(rep.find('ul'));
    }
    this.stack[0].append(frag);
  }

  onEnd() {
    if (!this.stats.is('.sad')) {
      this.stats.addClass('happy');
    }
  }

  updateDuration() {
    var seconds = (new _Date() - this.startedAt) / 1000;
    this.stats.find('.duration em').text(seconds.toFixed(2));
  }

  updateHidePassed() {
    if (this.stats.find('input').is(':checked')) {
      $('#mocha-report').addClass('fail');
      window.location.hash='#hide_passed';
    } else {
      $('#mocha-report').removeClass('fail');
      window.location.hash='#';
    }
  }
}

function errorSummary(test) {
  var str = test.err.stack || test.err.toString();
  if (str.indexOf(test.err.message) === -1) {
    str = test.err.message + '\n' + str;
  }

  if ('[object Error]' === str) {
    str = test.err.message;
  }

  if (!test.err.stack && test.err.sourceURL && test.err.line !== undefined) {
    str += "\n(" + test.err.sourceURL + ":" + test.err.line + ")";
  }
  return str;
}

function speedOf(test) {
  var medium = test.slow() / 2;
  return test.duration > test.slow() ? 'slow'
    : test.duration > medium ? 'medium'
    : 'fast';
}

function grepURL(pattern) {
  var search = window.location.search;
  if (search) {
    search = search.replace(/[?&]grep=[^&\s]*/g, '').replace(/^&/, '?');
  }

  return window.location.pathname + (search ? search + '&' : '?' ) + 'grep=' + encodeURIComponent(pattern);
}

function clean(str) {
  str = str
    .replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/^\uFEFF/, '')
    .replace(/^function *\(.*\) *{|\(.*\) *=> *{?/, '')
    .replace(/\s+\}$/, '');

  var spaces = str.match(/^\n?( *)/)[1].length;
  var tabs = str.match(/^\n?(\t*)/)[1].length;
  var re = new RegExp('^\n?' + (tabs ? '\t' : ' ') + '{' + (tabs ? tabs : spaces) + '}', 'gm');

  str = str.replace(re, '');

  return str.trim();
}

var template = `<ul id="mocha-stats">
    <li class="progress"><canvas width="40" height="40"></canvas></li>
    <li class="passes">passes: <em>0</em></li>
    <li class="failures">failures: <em>0</em></li>
    <li class="duration">duration: <em>0</em>s</li>
    <li><label>Hide passed <input type="checkbox"></input></label></li>
    </ul>
  <ul id="mocha-report"></ul>`;
