#!/usr/bin/env node
/**
 * Release version bump.
 *
 *   node scripts/bump-version.js 2.0.1
 *   node scripts/bump-version.js            # reports the current version
 *
 * The static host gives no reliable cache invalidation, so the version lives in
 * four places at once and they must agree:
 *
 *   index.html           every local asset's `?v=`, and the footer text
 *   service-worker.js    ASSET_VERSION — the cache name and the precached URLs
 *   js/i18n.js           footer.copyright, in both languages
 *
 * Doing it by hand is how they drift: a `?v=` that moves without the cache name
 * leaves returning visitors on a half-old build, and a cache name that moves
 * without the `?v=` throws away a cache that was still good. One command, so
 * step 2 and step 3 of the release checklist cannot be half-done.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var SEMVER = /^\d+\.\d+\.\d+$/;

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function write(file, contents) {
  fs.writeFileSync(path.join(ROOT, file), contents);
}

/** The service worker is the authority: it is the one file where the version is
 * a value rather than a repeated literal. */
function currentVersion() {
  var match = /var ASSET_VERSION = '([^']+)';/.exec(read('service-worker.js'));
  if (!match) throw new Error('service-worker.js has no ASSET_VERSION');
  return match[1];
}

function bump(version) {
  var changes = [];

  // Only inside src/href attributes. A bare /\?v=[^"']+/ also matches the `?v=`
  // written in the comment above the script list, and swallows everything up to
  // the next quote — which silently ate a <script> tag and left the app blank.
  var html = read('index.html');
  var attribute = /((?:src|href)="[^"]*?)\?v=[^"]*"/g;
  var stampCount = (html.match(attribute) || []).length;
  var stamped = html.replace(attribute, '$1?v=' + version + '"');
  var footerPattern = /(id="app-footer-text"[^>]*>.*?v)\d+\.\d+\.\d+/;
  if (footerPattern.test(stamped)) {
    stamped = stamped.replace(footerPattern, '$1' + version);
  }
  if (stamped !== html) write('index.html', stamped);
  changes.push('index.html — ' + stampCount + ' asset stamps and footer version');

  var sw = read('service-worker.js');
  var bumped = sw.replace(/var ASSET_VERSION = '[^']+';/, "var ASSET_VERSION = '" + version + "';");
  if (bumped === sw && currentVersion() !== version) throw new Error('could not rewrite ASSET_VERSION');
  write('service-worker.js', bumped);
  changes.push('service-worker.js — ASSET_VERSION and the cache name');

  // Written with a \u escape in the dictionaries, so the em dash is matched as
  // either form rather than assumed.
  var i18n = read('js/i18n.js');
  var footer = /('footer\.copyright': '[^']*?)v\d+\.\d+\.\d+/g;
  var footerCount = (i18n.match(footer) || []).length;
  if (footerCount !== 2) {
    throw new Error('expected 2 footer.copyright entries, found ' + footerCount);
  }
  write('js/i18n.js', i18n.replace(footer, '$1v' + version));
  changes.push('js/i18n.js — footer.copyright in both languages');

  return changes;
}

function main() {
  var target = process.argv[2];
  if (!target) {
    process.stdout.write('current version: ' + currentVersion() + '\n');
    process.stdout.write('usage: node scripts/bump-version.js <x.y.z>\n');
    return;
  }
  if (!SEMVER.test(target)) {
    process.stderr.write('not a version: ' + target + '\n');
    process.exit(1);
  }
  var from = currentVersion();
  bump(target).forEach(function (line) { process.stdout.write('  ' + line + '\n'); });
  process.stdout.write(from + ' -> ' + target + '\n');
}

main();
