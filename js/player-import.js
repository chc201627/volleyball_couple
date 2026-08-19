/**
 * Bulk Player Import Module
 *
 * Pure, framework-agnostic parsing and validation. It deliberately exposes
 * only parsePlayerImport() and validatePlayerImport(); UI, IDs, and storage
 * remain app.js responsibilities.
 */
/* exported parsePlayerImport, validatePlayerImport */
var parsePlayerImport, validatePlayerImport;
(function () {
  'use strict';

  var DELIMITERS = [
    { name: 'tab', character: '\t' },
    { name: 'semicolon', character: ';' },
    { name: 'comma', character: ',' },
  ];
  var GENDER_TOKENS = {
    h: 'male', hombre: 'male', masculino: 'male', male: 'male', man: 'male',
    f: 'female', female: 'female', woman: 'female', mujer: 'female', femenino: 'female',
    u: 'unspecified', unspecified: 'unspecified', 'sin especificar': 'unspecified', 'no especificado': 'unspecified', '-': 'unspecified',
  };
  function makeIssue(field, code, params) {
    return { field: field, code: code, params: params || {} };
  }

  function fold(value) {
    var result = String(value == null ? '' : value).trim().toLowerCase();
    if (typeof result.normalize === 'function') {
      result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
    return result.replace(/\s+/g, ' ');
  }

  function splitRecords(text) {
    var records = [];
    var buffer = '';
    var inQuotes = false;
    var line = 1;
    var startLine = 1;

    function pushRecord(unclosed) {
      if (buffer.trim()) {
        records.push({ raw: buffer, sourceLine: startLine, unclosedQuote: !!unclosed });
      }
      buffer = '';
    }

    text = String(text == null ? '' : text);
    for (var i = 0; i < text.length; i++) {
      var character = text[i];
      if (character === '"') {
        buffer += character;
        if (inQuotes && text[i + 1] === '"') {
          buffer += text[++i];
        } else {
          inQuotes = !inQuotes;
        }
      } else if (character === '\r' || character === '\n') {
        if (character === '\r' && text[i + 1] === '\n') i++;
        if (inQuotes) {
          buffer += '\n';
        } else {
          pushRecord(false);
          startLine = line + 1;
        }
        line++;
      } else {
        buffer += character;
      }
    }
    pushRecord(inQuotes);
    return records;
  }
  function delimiterCounts(record) {
    var counts = { '\t': 0, ';': 0, ',': 0 };
    var inQuotes = false;
    for (var i = 0; i < record.length; i++) {
      if (record[i] === '"') {
        if (inQuotes && record[i + 1] === '"') i++;
        else inQuotes = !inQuotes;
      } else if (!inQuotes && Object.prototype.hasOwnProperty.call(counts, record[i])) {
        counts[record[i]]++;
      }
    }
    return counts;
  }
  function detectDelimiter(record) {
    var counts = delimiterCounts(record);
    for (var i = 0; i < DELIMITERS.length; i++) {
      if (counts[DELIMITERS[i].character] > 0) return DELIMITERS[i];
    }
    return { name: 'name', character: null };
  }

  function usesMixedDelimiter(record, selected) {
    var counts = delimiterCounts(record);
    if (!selected.character) {
      return counts['\t'] > 0 || counts[';'] > 0 || counts[','] > 0;
    }
    return counts[selected.character] === 0 || DELIMITERS.some(function (delimiter) {
      return delimiter.character !== selected.character && counts[delimiter.character] > 0;
    });
  }

  function splitFields(record, delimiter) {
    if (!delimiter) return [decodeSingleField(record)];
    var fields = [];
    var buffer = '';
    var inQuotes = false;
    for (var i = 0; i < record.length; i++) {
      var character = record[i];
      if (character === '"') {
        if (inQuotes && record[i + 1] === '"') {
          buffer += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (character === delimiter && !inQuotes) {
        fields.push(buffer.trim());
        buffer = '';
      } else {
        buffer += character;
      }
    }
    fields.push(buffer.trim());
    return fields;
  }

  function decodeSingleField(record) {
    var trimmed = record.trim();
    if (trimmed[0] === '"' && trimmed[trimmed.length - 1] === '"') {
      return trimmed.slice(1, -1).replace(/""/g, '"').trim();
    }
    return trimmed;
  }

  function isHeader(fields) {
    var expected = [
      ['name', 'nombre'],
      ['gender', 'genero', 'sexo'],
      ['level', 'nivel'],
    ];
    var matches = 0;
    for (var i = 0; i < Math.min(fields.length, expected.length); i++) {
      if (expected[i].indexOf(fold(fields[i])) !== -1) matches++;
    }
    return matches >= 2;
  }

  parsePlayerImport = function (text) {
    var records = splitRecords(text);
    var batchIssues = [];
    if (!records.length) {
      return { rows: [], dialect: 'name', headerSkipped: false, batchIssues: [makeIssue('batch', 'emptyBatch')] };
    }

    var selected = detectDelimiter(records[0].raw);
    var rows = records.map(function (record, index) {
      var structuralIssues = [];
      if (record.unclosedQuote) structuralIssues.push(makeIssue('row', 'unclosedQuote'));
      if (usesMixedDelimiter(record.raw, selected)) {
        structuralIssues.push(makeIssue('row', 'mixedDelimiter', { expected: selected.name }));
      }
      var fields = splitFields(record.raw, selected.character);
      if (fields.length > 3) {
        structuralIssues.push(makeIssue('row', 'tooManyColumns', { count: fields.length }));
      }
      return {
        key: 'import-row-' + record.sourceLine + '-' + (index + 1),
        sourceLine: record.sourceLine,
        draft: {
          name: fields[0] || '',
          genderToken: fields[1] || '',
          levelToken: fields[2] || '',
        },
        structuralIssues: structuralIssues,
      };
    });

    var headerSkipped = rows.length > 0 && !rows[0].structuralIssues.length &&
      isHeader(splitFields(records[0].raw, selected.character));
    if (headerSkipped) rows.shift();
    if (!rows.length) batchIssues.push(makeIssue('batch', 'emptyBatch'));
    return { rows: rows, dialect: selected.name, headerSkipped: headerSkipped, batchIssues: batchIssues };
  };

  function normalizeGender(token, locale, notices) {
    var value = fold(token);
    if (!value) return 'unspecified';
    if (value === 'm') {
      var resolved = locale === 'es' ? 'female' : 'male';
      notices.push(makeIssue('gender', 'ambiguousM', { locale: locale, resolvedGender: resolved }));
      return resolved;
    }
    if (Object.prototype.hasOwnProperty.call(GENDER_TOKENS, value)) return GENDER_TOKENS[value];
    return null;
  }

  validatePlayerImport = function (rows, options) {
    rows = Array.isArray(rows) ? rows : [];
    options = options || {};
    var locale = options.locale === 'es' ? 'es' : 'en';
    var existingCount = Math.max(0, Math.floor(Number(options.existingCount) || 0));
    var maxPlayers = Math.max(0, Math.floor(Number(options.maxPlayers) || 200));
    var batchIssues = [];

    var validatedRows = rows.map(function (row) {
      var draft = row && row.draft ? row.draft : {};
      var name = String(draft.name == null ? '' : draft.name).trim();
      var issues = (row.structuralIssues || []).map(function (issue) {
        return makeIssue(issue.field, issue.code, issue.params);
      });
      var notices = [];
      if (!name) issues.push(makeIssue('name', 'nameEmpty'));
      else if (name.length < 2) issues.push(makeIssue('name', 'nameTooShort'));
      else if (name.length > 50) issues.push(makeIssue('name', 'nameTooLong'));

      var gender = normalizeGender(draft.genderToken, locale, notices);
      if (!gender) issues.push(makeIssue('gender', 'invalidGender', { token: draft.genderToken }));

      var levelToken = String(draft.levelToken == null ? '' : draft.levelToken).trim();
      var level = null;
      if (levelToken) {
        if (/^[123]$/.test(levelToken)) level = Number(levelToken);
        else issues.push(makeIssue('level', 'invalidLevel', { token: draft.levelToken }));
      }

      var result = {
        key: row.key,
        sourceLine: row.sourceLine,
        draft: { name: name, genderToken: draft.genderToken || '', levelToken: draft.levelToken || '' },
        issues: issues,
        notices: notices,
      };
      if (!issues.length) {
        result.player = { name: name, gender: gender };
        if (level !== null) result.player.level = level;
      }
      return result;
    });

    var errorCount = validatedRows.filter(function (row) { return row.issues.length > 0; }).length;
    var totalAfterImport = existingCount + validatedRows.length;
    if (!validatedRows.length) batchIssues.push(makeIssue('batch', 'emptyBatch'));
    if (totalAfterImport > maxPlayers) {
      batchIssues.push(makeIssue('batch', 'playerLimitExceeded', { maxPlayers: maxPlayers, total: totalAfterImport }));
    }
    return {
      rows: validatedRows,
      summary: {
        validCount: validatedRows.length - errorCount,
        errorCount: errorCount,
        totalAfterImport: totalAfterImport,
        canCommit: validatedRows.length > 0 && errorCount === 0 && batchIssues.length === 0,
      },
      batchIssues: batchIssues,
    };
  };
  if (typeof Object.freeze === 'function') {
    Object.freeze(parsePlayerImport);
    Object.freeze(validatePlayerImport);
  }
})();
