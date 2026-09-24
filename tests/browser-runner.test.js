'use strict';

var assert = require('node:assert/strict');
var childProcess = require('node:child_process');
var fs = require('node:fs');
var http = require('node:http');
var os = require('node:os');
var path = require('node:path');
var test = require('node:test');
var runner = require('../scripts/run-browser-tests.js');

function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

async function chromeSession() {
  var profile = fs.mkdtempSync(path.join(os.tmpdir(), 'volleyball-runner-fixture-'));
  var chrome = childProcess.spawn(runner.findBrowser(), ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  var portFile = path.join(profile, 'DevToolsActivePort');
  var deadline = Date.now() + 5000;
  var port;
  while (!port && Date.now() < deadline) {
    if (fs.existsSync(portFile)) port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
    else await wait(25);
  }
  if (!port) throw new Error('fixture Chrome did not start');
  return { chrome: chrome, port: port, profile: profile };
}

test('requestJson bounds a wedged HTTP response', async function () {
  var server = http.createServer(function () {});
  await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
  try { await assert.rejects(runner.requestJson(server.address().port, '/', 'GET', runner.createDeadline(75, 'wedged HTTP')), /timed out/); }
  finally { await new Promise(function (resolve) { server.close(resolve); }); }
});

test('findBrowser accepts an override path with spaces', function () {
  var directory = fs.mkdtempSync(path.join(os.tmpdir(), 'browser path '));
  var browser = path.join(directory, 'fake chrome');
  var prior = process.env.BROWSER;
  fs.writeFileSync(browser, ''); process.env.BROWSER = browser;
  try { assert.equal(runner.findBrowser(), browser); }
  finally { if (prior === undefined) delete process.env.BROWSER; else process.env.BROWSER = prior; fs.rmSync(directory, { recursive: true, force: true }); }
});

test('runHarness rejects assertion, console-error, and summary-timeout fixtures', async function () {
  var deadline = runner.createDeadline(8000, 'negative fixture suite');
  var session = await chromeSession();
  var server = await runner.startServer(deadline);
  try {
    var serverPort = server.address().port;
    await assert.rejects(runner.runHarness(session.port, serverPort, 'fixtures/browser-runner/assertion.test.html', deadline), /0\/1 tests passed/);
    await assert.rejects(runner.runHarness(session.port, serverPort, 'fixtures/browser-runner/console-error.test.html', deadline), /browser console errors/);
    await assert.rejects(runner.runHarness(session.port, serverPort, 'fixtures/browser-runner/no-summary.test.html', runner.createDeadline(150, 'missing summary fixture')), /timed out/);
  } finally {
    await new Promise(function (resolve) { server.close(resolve); });
    await runner.terminateChild(session.chrome, 250);
    fs.rmSync(session.profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test('terminateChild escalates to SIGKILL for a SIGTERM-resistant child', async function () {
  var child = childProcess.spawn(process.execPath, ['-e', "process.on('SIGTERM', function () {}); setInterval(function () {}, 1000);"]);
  assert.equal(await runner.terminateChild(child, 100), true);
  assert.notEqual(child.signalCode, null);
});
