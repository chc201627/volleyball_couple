#!/usr/bin/env node
'use strict';

/*
 * Development-only runner for the standalone browser harnesses. It starts an
 * isolated loopback server and Chrome DevTools Protocol session, so failures,
 * timeouts, and browser console errors all make the command fail.
 *
 * Set BROWSER to an executable path when Chrome/Chromium is installed outside
 * the usual locations.
 */

var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');

var ROOT = path.resolve(__dirname, '..');
var TIMEOUT_MS = Number(process.env.BROWSER_TEST_TIMEOUT_MS || 15000);
var MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function findBrowser() {
  var candidates = [
    process.env.BROWSER,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  for (var index = 0; index < candidates.length; index++) {
    if (candidates[index].indexOf(path.sep) === -1 || fs.existsSync(candidates[index])) return candidates[index];
  }
  throw new Error('Chrome/Chromium was not found. Set BROWSER to its executable path.');
}

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function requestJson(port, pathname, method) {
  return new Promise(function (resolve, reject) {
    var request = http.request({ host: '127.0.0.1', port: port, path: pathname, method: method || 'GET' }, function (response) {
      var body = '';
      response.setEncoding('utf8');
      response.on('data', function (chunk) { body += chunk; });
      response.on('end', function () {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error(method + ' ' + pathname + ' returned ' + response.statusCode));
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.end();
  });
}

function startServer() {
  return new Promise(function (resolve, reject) {
    var server = http.createServer(function (request, response) {
      var pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
      var file = path.resolve(ROOT, '.' + pathname);
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      fs.readFile(file, function (error, contents) {
        if (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found'); return; }
        response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        response.end(contents);
      });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', function () { resolve(server); });
  });
}

function connectCdp(url) {
  return new Promise(function (resolve, reject) {
    var socket = new WebSocket(url);
    var nextId = 1;
    var pending = new Map();
    var events = [];
    socket.addEventListener('open', function () {
      resolve({
        on: function (listener) { events.push(listener); },
        send: function (method, params) {
          return new Promise(function (resolveCommand, rejectCommand) {
            var id = nextId++;
            pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
            socket.send(JSON.stringify({ id: id, method: method, params: params || {} }));
          });
        },
        close: function () { socket.close(); },
      });
    });
    socket.addEventListener('message', function (message) {
      var payload = JSON.parse(message.data);
      if (payload.id) {
        var command = pending.get(payload.id);
        if (!command) return;
        pending.delete(payload.id);
        if (payload.error) command.reject(new Error(payload.error.message)); else command.resolve(payload.result || {});
      } else events.forEach(function (listener) { listener(payload); });
    });
    socket.addEventListener('error', function () { reject(new Error('Could not connect to Chrome DevTools Protocol.')); });
    socket.addEventListener('close', function () { pending.forEach(function (command) { command.reject(new Error('Chrome DevTools Protocol closed unexpectedly.')); }); });
  });
}

async function runHarness(chromePort, serverPort, harness) {
  var target = await requestJson(chromePort, '/json/new?' + encodeURIComponent('about:blank'), 'PUT');
  var cdp = await connectCdp(target.webSocketDebuggerUrl);
  var consoleErrors = [];
  cdp.on(function (event) {
    if (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') {
      consoleErrors.push(event.params.args.map(function (arg) { return arg.value || arg.description || ''; }).join(' '));
    }
    if (event.method === 'Runtime.exceptionThrown') consoleErrors.push(event.params.exceptionDetails.text || 'Uncaught browser exception');
    if (event.method === 'Log.entryAdded' && event.params.entry.level === 'error') consoleErrors.push(event.params.entry.text);
  });
  try {
    await Promise.all([cdp.send('Runtime.enable'), cdp.send('Log.enable'), cdp.send('Page.enable')]);
    await cdp.send('Storage.clearDataForOrigin', {
      origin: 'http://127.0.0.1:' + serverPort,
      storageTypes: 'all',
    });
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:' + serverPort + '/tests/' + harness });
    var deadline = Date.now() + TIMEOUT_MS;
    var summary;
    while (Date.now() < deadline) {
      var evaluation = await cdp.send('Runtime.evaluate', { expression: "Array.from(document.querySelectorAll('.summary, #summary')).map(function (node) { return node.textContent; }).join('\\n')", returnByValue: true });
      summary = evaluation.result && evaluation.result.value;
      if (/\d+\/\d+\s+tests passed/.test(summary || '')) break;
      await wait(100);
    }
    if (!summary || !/\d+\/\d+\s+tests passed/.test(summary)) throw new Error('timed out after ' + TIMEOUT_MS + 'ms without a test summary');
    var count = /(\d+)\/(\d+)\s+tests passed/.exec(summary);
    var passed = Number(count[1]);
    var total = Number(count[2]);
    if (passed !== total || /FAILED/i.test(summary)) {
      var failures = await cdp.send('Runtime.evaluate', { expression: "Array.from(document.querySelectorAll('.fail')).map(function (node) { return node.textContent; }).join(' | ')", returnByValue: true });
      throw new Error(summary.replace(/\s+/g, ' ').trim() + ': ' + ((failures.result && failures.result.value) || 'no failure detail'));
    }
    if (consoleErrors.length) throw new Error('browser console errors: ' + Array.from(new Set(consoleErrors)).join(' | '));
    return { harness: harness, passed: passed, total: total };
  } finally {
    cdp.close();
    await requestJson(chromePort, '/json/close/' + encodeURIComponent(target.id)).catch(function () {});
  }
}

async function main() {
  var harnesses = fs.readdirSync(path.join(ROOT, 'tests')).filter(function (file) { return file.endsWith('.test.html'); }).sort();
  if (!harnesses.length) throw new Error('No standalone tests/*.test.html harnesses found.');
  var tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'volleyball-couple-chrome-'));
  var chrome = childProcess.spawn(findBrowser(), ['--headless=new', '--no-first-run', '--no-default-browser-check', '--window-size=1280,800', '--remote-debugging-port=0', '--user-data-dir=' + tempProfile, 'about:blank'], { stdio: 'ignore' });
  var server;
  try {
    var portFile = path.join(tempProfile, 'DevToolsActivePort');
    var chromePort;
    for (var attempt = 0; attempt < 100; attempt++) {
      if (fs.existsSync(portFile)) { chromePort = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]); break; }
      await wait(50);
    }
    if (!chromePort) throw new Error('Chrome did not expose a DevTools port.');
    server = await startServer();
    var port = server.address().port;
    var results = [];
    for (var index = 0; index < harnesses.length; index++) {
      var result = await runHarness(chromePort, port, harnesses[index]);
      results.push(result);
      process.stdout.write('PASS ' + result.harness + ' ' + result.passed + '/' + result.total + '\n');
    }
    var totals = results.reduce(function (summary, result) { summary.passed += result.passed; summary.total += result.total; return summary; }, { passed: 0, total: 0 });
    process.stdout.write('PASS browser harnesses: ' + results.length + '/' + results.length + ', ' + totals.passed + '/' + totals.total + ' assertions\n');
  } finally {
    if (server) await new Promise(function (resolve) { server.close(resolve); });
    chrome.kill();
    await Promise.race([
      new Promise(function (resolve) { chrome.once('exit', resolve); }),
      wait(2000),
    ]);
    fs.rmSync(tempProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

main().catch(function (error) { process.stderr.write('FAIL browser harnesses: ' + error.message + '\n'); process.exitCode = 1; });
