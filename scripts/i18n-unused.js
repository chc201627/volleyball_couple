#!/usr/bin/env node
/**
 * Translation sweep.
 *
 *   node scripts/i18n-unused.js            # report
 *   node scripts/i18n-unused.js --strict   # exit 1 if anything is wrong
 *
 * Four things go wrong with a flat dictionary and a `translate(key, fallback)`
 * helper, and none of them are visible by reading the code:
 *
 *   missing      a key the screens ask for that no dictionary has. The fallback
 *                is shown instead — which is written in Spanish, so English
 *                silently serves Spanish.
 *   asymmetric   a key one language has and the other does not. t() falls back
 *                to English, so Spanish quietly turns English.
 *   unsubstituted a value with {placeholders} whose call site passes no params,
 *                so the braces reach the screen.
 *   orphan       a key no screen asks for. Harmless to ship, but with the text
 *                rotation of the redesign, telling live keys from dead ones by
 *                eye is not possible.
 *
 * Dynamic keys (`translate('x.' + id, ...)`) cannot be resolved statically, so
 * a key matching a used prefix is never reported as an orphan.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var SOURCES = ['js', 'index.html'];

/** Kept on purpose although no screen asks for it. The v2 shell has no footer
 * yet, but the release checklist bumps this string and scripts/bump-version.js
 * asserts on it; where the version is shown is a slice L decision. */
var KEEP = { 'footer.copyright': true };

function walk(target, out) {
  var full = path.join(ROOT, target);
  var stat = fs.statSync(full);
  if (stat.isFile()) {
    // The dictionary itself is not a use of anything: scanning it would make
    // every key look alive, which is the one answer this tool must never give.
    var skip = /[\\/]scripts[\\/]/.test(full) || /[\\/]i18n\.js$/.test(full);
    if (/\.(js|html)$/.test(full) && !skip) out.push(full);
    return out;
  }
  fs.readdirSync(full).forEach(function (entry) {
    if (entry === 'node_modules' || entry[0] === '.') return;
    walk(path.join(target, entry), out);
  });
  return out;
}

/** The dictionaries are object literals in one file, so they are read with a
 * brace scan rather than by requiring a DOM-dependent module. */
function dictionaries() {
  var src = fs.readFileSync(path.join(ROOT, 'js/i18n.js'), 'utf8');
  var out = {};
  ['en', 'es'].forEach(function (lang) {
    var start = src.indexOf('    ' + lang + ': {');
    if (start === -1) throw new Error('no ' + lang + ' block in js/i18n.js');
    var depth = 0;
    var i = start;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    var block = src.slice(start, i);
    var entries = {};
    // v1 entries are padded to align their values, so the colon may be followed
    // by any run of spaces. Requiring exactly one silently hid 200 keys and
    // reported them as missing.
    var pattern = /^ {6}'([A-Za-z0-9._]+)': *('(?:\\.|[^'])*'|"(?:\\.|[^"])*")/gm;
    var match;
    while ((match = pattern.exec(block))) {
      entries[match[1]] = match[2].slice(1, -1);
    }
    out[lang] = entries;
  });
  return out;
}

/** Where a key is asked for, in every form the code actually uses.
 *
 * Matching `label('key'` alone was not enough and produced false orphans: keys
 * also travel as `labelKey: 'standings.col.won'` on a column descriptor, and as
 * `'import.issue.' + issue.code` assigned to a variable before the call. So any
 * key-shaped literal anywhere in the sources counts as a use, and any literal
 * ending in a dot that is concatenated counts as a live prefix. Over-counting a
 * use only leaves a dead key in place; under-counting it deletes a live one. */
function usage(files) {
  var keys = {};
  var requested = {};
  var prefixes = [];
  files.forEach(function (file) {
    var src = fs.readFileSync(file, 'utf8');
    var relative = path.relative(ROOT, file);
    // Key-shaped: lowercase first segment, dotted, no leading digits — which
    // also keeps host names and version strings out of the results.
    var literal = /(['"])([a-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)\1/g;
    var match;
    while ((match = literal.exec(src))) {
      (keys[match[2]] = keys[match[2]] || []).push(relative);
    }
    var asked = /\b(?:translate|t)\(\s*(['"])([A-Za-z0-9._]+)\1\s*[,)]/g;
    while ((match = asked.exec(src))) {
      (requested[match[2]] = requested[match[2]] || []).push(relative);
    }
    var dynamic = /(['"])([A-Za-z0-9._]*\.)\1\s*\+/g;
    while ((match = dynamic.exec(src))) prefixes.push(match[2]);
    var attribute = /data-i18n(?:-[a-z-]+)?="([A-Za-z0-9._]+)"/g;
    while ((match = attribute.exec(src))) {
      (keys[match[1]] = keys[match[1]] || []).push(relative);
    }
  });
  return { keys: keys, requested: requested, prefixes: prefixes };
}

/** A call passes params when it has a third argument naming each placeholder. */
function unsubstituted(files, es) {
  var problems = [];
  files.forEach(function (file) {
    var src = fs.readFileSync(file, 'utf8');
    var pattern = /\b(?:translate|t)\(\s*(['"])([A-Za-z0-9._]+)\1/g;
    var match;
    while ((match = pattern.exec(src))) {
      var value = es[match[2]];
      if (!value) continue;
      var placeholders = (value.match(/\{([a-zA-Z0-9_]+)\}/g) || [])
        .map(function (token) { return token.slice(1, -1); });
      if (!placeholders.length) continue;
      var open = src.indexOf('(', match.index);
      var depth = 0;
      var end = open;
      for (; end < src.length; end++) {
        if (src[end] === '(') depth++;
        else if (src[end] === ')') { depth--; if (depth === 0) break; }
      }
      var call = src.slice(open, end + 1);
      var parts = call.split(',');
      var passed = parts.length > 2 ? parts.slice(2).join(',') : '';
      var missing = placeholders.filter(function (name) {
        return !new RegExp('\\b' + name + '\\s*:').test(passed);
      });
      if (missing.length) {
        problems.push({
          file: path.relative(ROOT, file),
          line: src.slice(0, open).split('\n').length,
          key: match[2],
          missing: missing,
        });
      }
    }
  });
  return problems;
}

function main() {
  var strict = process.argv.indexOf('--strict') !== -1;
  var files = SOURCES.reduce(function (out, target) { return walk(target, out); }, []);
  var dict = dictionaries();
  var used = usage(files);
  var usedKeys = Object.keys(used.keys);

  var missing = Object.keys(used.requested).filter(function (key) {
    return !dict.es[key] && !dict.en[key];
  });
  var asymmetric = Object.keys(dict.es).concat(Object.keys(dict.en)).filter(function (key) {
    return !(dict.es[key] && dict.en[key]);
  }).filter(function (key, index, all) { return all.indexOf(key) === index; });
  var orphans = Object.keys(dict.es).filter(function (key) {
    if (used.keys[key] || KEEP[key]) return false;
    return !used.prefixes.some(function (prefix) { return key.indexOf(prefix) === 0; });
  });
  var braces = unsubstituted(files, dict.es);

  process.stdout.write('keys asked for: ' + Object.keys(used.requested).length +
    '  mentioned: ' + usedKeys.length +
    '  |  es: ' + Object.keys(dict.es).length +
    '  en: ' + Object.keys(dict.en).length + '\n\n');

  function section(title, rows, render) {
    process.stdout.write(title + ': ' + rows.length + '\n');
    rows.forEach(function (row) { process.stdout.write('  ' + render(row) + '\n'); });
    if (rows.length) process.stdout.write('\n');
  }

  section('missing (fallback is shown, in Spanish)', missing, function (key) {
    return key + '  ' + used.requested[key].filter(function (file, index, all) {
      return all.indexOf(file) === index;
    }).join(', ');
  });
  section('asymmetric (present in one language only)', asymmetric, function (key) { return key; });
  section('unsubstituted placeholders', braces, function (row) {
    return row.file + ':' + row.line + '  ' + row.key + '  needs ' + row.missing.join(', ');
  });
  section('orphans (in the dictionary, asked for by nobody)', orphans, function (key) { return key; });

  var failures = missing.length + asymmetric.length + braces.length + orphans.length;
  if (!failures) process.stdout.write('clean\n');
  if (strict && failures) process.exit(1);
}

main();
