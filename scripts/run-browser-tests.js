#!/usr/bin/env node
'use strict';

/* Development-only runner. One bounded suite deadline covers Chrome readiness,
 * loopback HTTP, CDP, page evaluation, and summary polling. */
var fs = require('fs');
var http = require('http');
var os = require('os');
var path = require('path');
var childProcess = require('child_process');
var ROOT = path.resolve(__dirname, '..');
var TIMEOUT_MS = Number(process.env.BROWSER_TEST_TIMEOUT_MS || 15000);
var CLEANUP_GRACE_MS = 1500;
var MIME_TYPES = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function findBrowser() {
  var candidates = [process.env.BROWSER, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean);
  for (var i = 0; i < candidates.length; i++) if (candidates[i].indexOf(path.sep) === -1 || fs.existsSync(candidates[i])) return candidates[i];
  throw new Error('Chrome/Chromium was not found. Set BROWSER to its executable path.');
}

function createDeadline(timeoutMs, label) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('BROWSER_TEST_TIMEOUT_MS must be a positive number.');
  return { expiresAt: Date.now() + timeoutMs, label: label || 'operation' };
}
function remainingMs(deadline) { return Math.max(0, deadline.expiresAt - Date.now()); }
function timeoutError(deadline, operation) { return new Error((operation || deadline.label) + ' timed out after its ' + deadline.label + ' deadline.'); }
function withinDeadline(promise, deadline, operation, onTimeout) {
  var remaining = remainingMs(deadline);
  if (!remaining) { if (onTimeout) onTimeout(); return Promise.reject(timeoutError(deadline, operation)); }
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { if (onTimeout) onTimeout(); reject(timeoutError(deadline, operation)); }, remaining);
    promise.then(function (value) { clearTimeout(timer); resolve(value); }, function (error) { clearTimeout(timer); reject(error); });
  });
}
function wait(ms, deadline, operation) { return withinDeadline(new Promise(function (resolve) { setTimeout(resolve, ms); }), deadline, operation || 'wait'); }

function requestJson(port, pathname, method, deadline) {
  var request;
  var promise = new Promise(function (resolve, reject) {
    request = http.request({ host: '127.0.0.1', port: port, path: pathname, method: method || 'GET' }, function (response) {
      var body = '';
      response.setEncoding('utf8');
      response.on('data', function (chunk) { body += chunk; });
      response.on('end', function () {
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(new Error((method || 'GET') + ' ' + pathname + ' returned ' + response.statusCode));
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.end();
  });
  return withinDeadline(promise, deadline, 'HTTP ' + (method || 'GET') + ' ' + pathname, function () { if (request) request.destroy(); });
}

function startServer(deadline) {
  var server;
  var promise = new Promise(function (resolve, reject) {
    server = http.createServer(function (request, response) {
      var pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
      var file = path.resolve(ROOT, '.' + pathname);
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { response.writeHead(403).end('Forbidden'); return; }
      fs.readFile(file, function (error, contents) {
        if (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found'); return; }
        response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        response.end(contents);
      });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', function () { resolve(server); });
  });
  return withinDeadline(promise, deadline, 'loopback test server', function () { if (server) server.close(); });
}

function connectCdp(url, deadline) {
  var socket;
  var promise = new Promise(function (resolve, reject) {
    socket = new WebSocket(url);
    var nextId = 1, pending = new Map(), events = [];
    function rejectPending(error) { pending.forEach(function (command) { clearTimeout(command.timer); command.reject(error); }); pending.clear(); }
    socket.addEventListener('open', function () {
      resolve({
        on: function (listener) { events.push(listener); },
        send: function (method, params) {
          var remaining = remainingMs(deadline);
          if (!remaining) return Promise.reject(timeoutError(deadline, 'CDP ' + method));
          return new Promise(function (resolveCommand, rejectCommand) {
            var id = nextId++;
            var timer = setTimeout(function () { pending.delete(id); rejectCommand(timeoutError(deadline, 'CDP ' + method)); }, remaining);
            pending.set(id, { resolve: resolveCommand, reject: rejectCommand, timer: timer });
            try { socket.send(JSON.stringify({ id: id, method: method, params: params || {} })); }
            catch (error) { clearTimeout(timer); pending.delete(id); rejectCommand(error); }
          });
        },
        close: function () { socket.close(); },
      });
    });
    socket.addEventListener('message', function (message) {
      var payload = JSON.parse(message.data);
      if (payload.id) {
        var command = pending.get(payload.id); if (!command) return;
        pending.delete(payload.id); clearTimeout(command.timer);
        if (payload.error) command.reject(new Error(payload.error.message)); else command.resolve(payload.result || {});
      } else events.forEach(function (listener) { listener(payload); });
    });
    socket.addEventListener('error', function () { reject(new Error('Could not connect to Chrome DevTools Protocol.')); });
    socket.addEventListener('close', function () { rejectPending(new Error('Chrome DevTools Protocol closed unexpectedly.')); });
  });
  return withinDeadline(promise, deadline, 'CDP connection', function () { if (socket) socket.close(); });
}

async function readDevToolsPort(chrome, profile, deadline) {
  var portFile = path.join(profile, 'DevToolsActivePort');
  while (remainingMs(deadline)) {
    if (chrome.spawnError) throw chrome.spawnError;
    if (chrome.exitCode !== null || chrome.signalCode) throw new Error('Chrome exited before exposing a DevTools port.');
    if (fs.existsSync(portFile)) {
      // Chrome creates this file before its contents are necessarily complete.
      // Treat a partial first read as readiness still in progress, not as a
      // malformed browser installation.
      try {
        var port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
        if (Number.isInteger(port) && port > 0) return port;
      } catch (error) { /* the profile is still being initialized */ }
    }
    await wait(50, deadline, 'DevToolsActivePort readiness');
  }
  throw timeoutError(deadline, 'DevToolsActivePort readiness');
}

async function runHarness(chromePort, serverPort, harness, deadline) {
  var target = await requestJson(chromePort, '/json/new?' + encodeURIComponent('about:blank'), 'PUT', deadline);
  var cdp = await connectCdp(target.webSocketDebuggerUrl, deadline);
  var consoleErrors = [];
  cdp.on(function (event) {
    if (event.method === 'Runtime.consoleAPICalled' && event.params.type === 'error') consoleErrors.push(event.params.args.map(function (arg) { return arg.value || arg.description || ''; }).join(' '));
    if (event.method === 'Runtime.exceptionThrown') consoleErrors.push(event.params.exceptionDetails.text || 'Uncaught browser exception');
    if (event.method === 'Log.entryAdded' && event.params.entry.level === 'error') consoleErrors.push(event.params.entry.text);
  });
  try {
    await Promise.all([cdp.send('Runtime.enable'), cdp.send('Log.enable'), cdp.send('Page.enable')]);
    await cdp.send('Storage.clearDataForOrigin', { origin: 'http://127.0.0.1:' + serverPort, storageTypes: 'all' });
    await cdp.send('Page.navigate', { url: 'http://127.0.0.1:' + serverPort + '/tests/' + harness });
    var summary;
    while (remainingMs(deadline)) {
      var evaluation = await cdp.send('Runtime.evaluate', { expression: "Array.from(document.querySelectorAll('.summary, #summary')).map(function (node) { return node.textContent; }).join('\\n')", returnByValue: true });
      summary = evaluation.result && evaluation.result.value;
      if (/\d+\/\d+\s+tests passed/.test(summary || '')) break;
      await wait(100, deadline, 'test summary polling');
    }
    if (!summary || !/\d+\/\d+\s+tests passed/.test(summary)) throw timeoutError(deadline, harness + ' test summary');
    var count = /(\d+)\/(\d+)\s+tests passed/.exec(summary), passed = Number(count[1]), total = Number(count[2]);
    if (passed !== total || /FAILED/i.test(summary)) {
      var failures = await cdp.send('Runtime.evaluate', { expression: "Array.from(document.querySelectorAll('.fail')).map(function (node) { return node.textContent; }).join(' | ')", returnByValue: true });
      throw new Error(summary.replace(/\s+/g, ' ').trim() + ': ' + ((failures.result && failures.result.value) || 'no failure detail'));
    }
    if (consoleErrors.length) throw new Error('browser console errors: ' + Array.from(new Set(consoleErrors)).join(' | '));
    return { harness: harness, passed: passed, total: total };
  } finally {
    cdp.close();
    await requestJson(chromePort, '/json/close/' + encodeURIComponent(target.id), 'GET', createDeadline(CLEANUP_GRACE_MS, 'CDP target cleanup')).catch(function () {});
  }
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode) return Promise.resolve(true);
  return new Promise(function (resolve) { var timer = setTimeout(function () { resolve(false); }, timeoutMs); child.once('exit', function () { clearTimeout(timer); resolve(true); }); });
}
async function terminateChild(child, graceMs) {
  if (!child || !child.pid || child.exitCode !== null || child.signalCode) return true;
  try { child.kill('SIGTERM'); }
  catch (error) { return child.exitCode !== null || child.signalCode !== null; }
  if (await waitForExit(child, graceMs)) return true;
  try { child.kill('SIGKILL'); }
  catch (error) { return child.exitCode !== null || child.signalCode !== null; }
  return waitForExit(child, graceMs);
}

function spawnChrome(executable, profile) {
  var chrome = childProcess.spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--window-size=1280,800', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  var started = new Promise(function (resolve, reject) {
    chrome.once('spawn', resolve);
    chrome.once('error', reject);
  });
  // Keep an error listener for the full child lifetime. An EACCES/ENOENT event
  // can race startup, and without this listener Node treats it as unhandled.
  chrome.on('error', function (error) { chrome.spawnError = error; });
  return { chrome: chrome, started: started };
}
async function closeServer(server) {
  if (!server) return;
  if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  await withinDeadline(new Promise(function (resolve) { server.close(resolve); }), createDeadline(CLEANUP_GRACE_MS, 'loopback server cleanup'), 'loopback server cleanup', function () { if (typeof server.closeAllConnections === 'function') server.closeAllConnections(); }).catch(function () {});
}

async function main() {
  var deadline = createDeadline(TIMEOUT_MS, 'browser suite');
  var harnesses = fs.readdirSync(path.join(ROOT, 'tests')).filter(function (file) { return file.endsWith('.test.html'); }).sort();
  if (!harnesses.length) throw new Error('No standalone tests/*.test.html harnesses found.');
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'volleyball-couple-chrome-'));
  var launched = spawnChrome(findBrowser(), profile);
  var chrome = launched.chrome;
  var server, cleanupError;
  try {
    await withinDeadline(launched.started, deadline, 'Chrome spawn');
    var chromePort = await readDevToolsPort(chrome, profile, deadline);
    server = await startServer(deadline);
    var port = server.address().port, results = [];
    for (var index = 0; index < harnesses.length; index++) {
      var result = await runHarness(chromePort, port, harnesses[index], deadline);
      results.push(result); process.stdout.write('PASS ' + result.harness + ' ' + result.passed + '/' + result.total + '\n');
    }
    var totals = results.reduce(function (summary, result) { summary.passed += result.passed; summary.total += result.total; return summary; }, { passed: 0, total: 0 });
    process.stdout.write('PASS browser harnesses: ' + results.length + '/' + results.length + ', ' + totals.passed + '/' + totals.total + ' assertions\n');
  } finally {
    await closeServer(server);
    if (!await terminateChild(chrome, CLEANUP_GRACE_MS)) cleanupError = new Error('Chrome did not terminate after SIGTERM and SIGKILL.');
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    if (cleanupError) throw cleanupError;
  }
}

if (require.main === module) main().catch(function (error) { process.stderr.write('FAIL browser harnesses: ' + error.message + '\n'); process.exitCode = 1; });
module.exports = { CLEANUP_GRACE_MS: CLEANUP_GRACE_MS, createDeadline: createDeadline, findBrowser: findBrowser, requestJson: requestJson, runHarness: runHarness, startServer: startServer, terminateChild: terminateChild };
