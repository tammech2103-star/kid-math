/**
 * Khung test tối giản chạy trong trình duyệt (không cần Node/Jest).
 * @namespace KMTest
 */
window.KMTest = (function () {
  'use strict';

  var suites = [];
  var current = null;

  function suite(name, body) {
    current = { name: name, tests: [] };
    suites.push(current);
    body();
    current = null;
  }

  function test(name, body) {
    if (!current) {
      throw new Error('test() phải nằm trong suite()');
    }
    current.tests.push({ name: name, body: body });
  }

  function eq(actual, expected, message) {
    if (actual !== expected) {
      throw new Error((message || 'Giá trị không khớp') +
        ': mong đợi ' + JSON.stringify(expected) + ', nhận ' + JSON.stringify(actual));
    }
  }

  function ok(value, message) {
    if (!value) {
      throw new Error(message || 'Mong đợi giá trị đúng');
    }
  }

  function deepEq(actual, expected, message) {
    var a = JSON.stringify(actual);
    var b = JSON.stringify(expected);
    if (a !== b) {
      throw new Error((message || 'Giá trị không khớp') + ': mong đợi ' + b + ', nhận ' + a);
    }
  }

  function throws(body, message) {
    var threw = false;
    try {
      body();
    } catch (error) {
      threw = true;
    }
    if (!threw) {
      throw new Error(message || 'Mong đợi có lỗi được ném ra');
    }
  }

  function run() {
    var results = [];
    var passed = 0;
    var failed = 0;
    suites.forEach(function (group) {
      var groupResult = { name: group.name, tests: [] };
      group.tests.forEach(function (item) {
        try {
          item.body();
          groupResult.tests.push({ name: item.name, pass: true });
          passed += 1;
        } catch (error) {
          groupResult.tests.push({ name: item.name, pass: false, error: String(error.message || error) });
          failed += 1;
          if (window.console && console.error) {
            console.error('[FAIL] ' + group.name + ' › ' + item.name, error);
          }
        }
      });
      results.push(groupResult);
    });

    var payload = {
      passed: passed,
      failed: failed,
      total: passed + failed,
      suites: results
    };
    window.__TEST_RESULTS__ = payload;
    render(payload);
    return payload;
  }

  function render(payload) {
    var output = document.getElementById('test-output');
    var summary = document.getElementById('test-summary');
    if (!output) {
      return;
    }
    output.textContent = '';
    if (summary) {
      summary.className = 'summary ' + (payload.failed === 0 ? 'pass' : 'fail');
      summary.textContent = payload.failed === 0
        ? 'PASS — ' + payload.passed + '/' + payload.total + ' test'
        : 'FAIL — ' + payload.failed + ' lỗi / ' + payload.total + ' test';
    }
    payload.suites.forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'suite';
      var heading = document.createElement('h2');
      var groupFailed = group.tests.filter(function (item) { return !item.pass; }).length;
      heading.textContent = group.name + ' (' + (group.tests.length - groupFailed) + '/' + group.tests.length + ')';
      section.appendChild(heading);
      var list = document.createElement('ul');
      group.tests.forEach(function (item) {
        var row = document.createElement('li');
        row.className = item.pass ? 'pass' : 'fail';
        row.textContent = (item.pass ? '✓ ' : '✗ ') + item.name + (item.error ? ' — ' + item.error : '');
        list.appendChild(row);
      });
      section.appendChild(list);
      output.appendChild(section);
    });
  }

  return {
    suite: suite,
    test: test,
    eq: eq,
    ok: ok,
    deepEq: deepEq,
    throws: throws,
    run: run
  };
}());
