#!/usr/bin/env node
/**
 * CSS sweep — the same idea as i18n-unused.js, for selectors instead of keys.
 *
 *   node scripts/css-unused.js            # report
 *   node scripts/css-unused.js --strict   # exit 1 if anything is wrong
 *
 * Classes are composed in JS as strings ('c-button c-button--primary') and
 * with classList.add/toggle, never queried, so "used" means "the token
 * appears literally somewhere outside css/". Over-counting a use only leaves
 * a dead class in place; under-counting it deletes a live one — so a class
 * name that appears as a substring of a longer one (the base of a BEM
 * modifier, e.g. `c-button` inside `c-button--primary`) counts as used.
 *
 * BEM modifiers are usually the tail half of a runtime concat
 * (`'c-button--' + options.variant`), so the whole class name never appears
 * as a literal. A string literal ending in `-` immediately followed by `+`
 * is a live prefix, and any class starting with it counts as used — the
 * same trade a dynamic i18n key prefix makes: it can hide a modifier value
 * nothing ever passes, but the alternative is a false orphan on every BEM
 * component with more than one variant.
 *
 * Two things this catches that reading the CSS cannot:
 *
 *   orphan class/id   a selector no JS or HTML mentions, and no live prefix covers.
 *   orphan keyframe   an @keyframes block no `animation`/`animation-name`
 *                     declaration in any stylesheet names.
 */
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var CSS_DIR = 'css';
var SOURCES = ['js', 'index.html'];

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

function cssFiles() {
  return fs.readdirSync(path.join(ROOT, CSS_DIR))
    .filter(function (name) { return /\.css$/.test(name); })
    .map(function (name) { return path.join(CSS_DIR, name); });
}

function walkSources(target, out) {
  var full = path.join(ROOT, target);
  var stat = fs.statSync(full);
  if (stat.isFile()) {
    if (/\.(js|html)$/.test(full) && !/[\\/]scripts[\\/]/.test(full)) out.push(full);
    return out;
  }
  fs.readdirSync(full).forEach(function (entry) {
    if (entry === 'node_modules' || entry[0] === '.') return;
    walkSources(path.join(target, entry), out);
  });
  return out;
}

/** Selectors declared anywhere in css/: every class and id token, wherever it
 * sits in the selector list (`.a, .b.c > #d`), plus each @keyframes name. */
function declarations(files) {
  var classes = {};
  var ids = {};
  var keyframes = {};

  files.forEach(function (relFile) {
    var src = stripComments(fs.readFileSync(path.join(ROOT, relFile), 'utf8'));

    var kf = /@keyframes\s+([a-zA-Z0-9_-]+)/g;
    var match;
    while ((match = kf.exec(src))) {
      (keyframes[match[1]] = keyframes[match[1]] || []).push(relFile);
    }

    // Text right before each '{' is a selector list (or an @-rule prelude,
    // filtered below) — property values never contain '{', so this needs no
    // brace-depth tracking.
    var selectorPattern = /([^{}]+)\{/g;
    while ((match = selectorPattern.exec(src))) {
      var text = match[1];
      // Skip at-rule preludes: @media/@supports conditions, and the
      // @keyframes name itself (already captured above).
      if (/@(media|supports|font-face|page)\b/.test(text)) continue;
      if (/@keyframes\b/.test(text)) continue;

      var classToken = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
      var cm;
      while ((cm = classToken.exec(text))) {
        (classes[cm[1]] = classes[cm[1]] || []).push(relFile);
      }
      var idToken = /#([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
      var im;
      while ((im = idToken.exec(text))) {
        (ids[im[1]] = ids[im[1]] || []).push(relFile);
      }
    }
  });

  return { classes: classes, ids: ids, keyframes: keyframes };
}

function keyframeUsage(cssFileList) {
  var used = {};
  cssFileList.forEach(function (relFile) {
    var src = stripComments(fs.readFileSync(path.join(ROOT, relFile), 'utf8'));
    var pattern = /\banimation(?:-name)?\s*:\s*([^;{}]+);/g;
    var match;
    while ((match = pattern.exec(src))) {
      match[1].split(',').forEach(function (part) {
        var name = part.trim().split(/\s+/)[0];
        if (name) used[name] = true;
      });
    }
  });
  return used;
}

function tokenUsedInSources(token, files) {
  var pattern = new RegExp('\\b' + token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b');
  return files.some(function (file) {
    var src = fs.readFileSync(file, 'utf8');
    return pattern.test(src);
  });
}

/** Every string literal immediately concatenated (`'... prefix-' + expr`),
 * across all source files — the prefix is the last whitespace-separated
 * token, so a two-class literal like `'import__row-icon import__row-icon--'`
 * yields `import__row-icon--`, not the whole string. */
function dynamicPrefixes(files) {
  var prefixes = [];
  files.forEach(function (file) {
    var src = fs.readFileSync(file, 'utf8');
    var pattern = /(['"])((?:(?!\1)[^\\]|\\.)*)\1\s*\+/g;
    var match;
    while ((match = pattern.exec(src))) {
      var parts = match[2].split(/\s+/);
      var tail = parts[parts.length - 1];
      if (/^[a-zA-Z0-9_-]*-$/.test(tail) && tail.length) prefixes.push(tail);
    }
  });
  return prefixes;
}

function main() {
  var strict = process.argv.indexOf('--strict') !== -1;
  var cssFileList = cssFiles();
  var decl = declarations(cssFileList);
  var sourceFiles = SOURCES.reduce(function (out, target) { return walkSources(target, out); }, []);
  var kfUsed = keyframeUsage(cssFileList);
  var prefixes = dynamicPrefixes(sourceFiles);

  function coveredByPrefix(name) {
    return prefixes.some(function (prefix) { return name.indexOf(prefix) === 0; });
  }

  var orphanClasses = Object.keys(decl.classes).filter(function (name) {
    return !tokenUsedInSources(name, sourceFiles) && !coveredByPrefix(name);
  }).sort();
  var orphanIds = Object.keys(decl.ids).filter(function (name) {
    return !tokenUsedInSources(name, sourceFiles);
  }).sort();
  var orphanKeyframes = Object.keys(decl.keyframes).filter(function (name) {
    return !kfUsed[name];
  }).sort();

  process.stdout.write('classes declared: ' + Object.keys(decl.classes).length +
    '  ids: ' + Object.keys(decl.ids).length +
    '  keyframes: ' + Object.keys(decl.keyframes).length + '\n\n');

  function section(title, rows, render) {
    process.stdout.write(title + ': ' + rows.length + '\n');
    rows.forEach(function (row) { process.stdout.write('  ' + render(row) + '\n'); });
    if (rows.length) process.stdout.write('\n');
  }

  section('orphan classes (declared in css/, referenced by nobody)', orphanClasses, function (name) {
    return '.' + name + '  ' + decl.classes[name].filter(function (f, i, all) {
      return all.indexOf(f) === i;
    }).join(', ');
  });
  section('orphan ids', orphanIds, function (name) {
    return '#' + name + '  ' + decl.ids[name].filter(function (f, i, all) {
      return all.indexOf(f) === i;
    }).join(', ');
  });
  section('orphan keyframes (no animation/animation-name declaration names them)', orphanKeyframes, function (name) {
    return name + '  ' + decl.keyframes[name].filter(function (f, i, all) {
      return all.indexOf(f) === i;
    }).join(', ');
  });

  var failures = orphanClasses.length + orphanIds.length + orphanKeyframes.length;
  if (!failures) process.stdout.write('clean\n');
  if (strict && failures) process.exit(1);
}

main();
