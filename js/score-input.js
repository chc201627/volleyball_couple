/** Editable score field — pure, DOM-free.
 *
 * The score is a field, not a label. v1 exposed only + and − buttons, so
 * correcting 12 to 9 meant three taps and correcting a mistyped 21 meant
 * twelve. Typing it is faster, but a free field brings problems the steppers
 * did not have, and this module is where they are answered:
 *
 *   - What does + do to a half-typed number?
 *   - What happens when the field is left empty?
 *   - What stops someone entering 9-9 as a finished result, which the Firebase
 *     rules reject outright?
 *
 * Keeping the answers here rather than in the screen means the hero card, the
 * scoring screen and the wide layout all behave identically, and that the rules
 * can be tested without a browser.
 */
/* exported scoreInput, SCORE_INPUT_MAX */
var scoreInput, SCORE_INPUT_MAX;
(function () {
  'use strict';

  /** Two digits is every real volleyball score with room to spare, and the cap
   * is what stops a stuck key turning into 999999 on a phone in a pocket. */
  var MAX = 99;

  /** Digits only. The numeric keyboard does not offer a minus sign or a decimal
   * point, but a pasted value or a hardware keyboard can still produce them, so
   * they are stripped rather than trusted. Leading zeros collapse so "09" reads
   * as "9" — a scoreboard never shows 09. */
  function sanitize(raw) {
    var digits = String(raw == null ? '' : raw).replace(/[^0-9]/g, '');
    if (!digits) return '';
    var trimmed = digits.replace(/^0+(?=\d)/, '');
    var value = Number(trimmed);
    return String(Math.min(value, MAX));
  }

  /** Leaving the field empty reverts to the last saved value rather than
   * committing a zero: clearing a field to retype it is not the same gesture
   * as scoring nothing, and losing the old value to a mis-tap would be worse
   * than either. */
  function commit(raw, previous) {
    var clean = sanitize(raw);
    if (clean === '') return Number(previous) || 0;
    return Number(clean);
  }

  /** + and − operate on what is on screen, not on what was last saved. Typing
   * 12 and pressing − leaves 11, which is what someone correcting a typo
   * expects; applying it to the stored 9 would silently discard the typing. */
  function step(raw, delta, previous) {
    var base = commit(raw, previous);
    var next = base + delta;
    if (next < 0) next = 0;
    if (next > MAX) next = MAX;
    return String(next);
  }

  /**
   * Whether a pair of scores can be stored with the given status.
   *
   * The tie rule is not a preference: `firebase-rules.json` validates
   * `status === 'live' || score1 !== score2`, so a drawn final result is
   * rejected by the database. With only + and − a tie was almost impossible to
   * reach; with a keyboard it is two taps, so the screen has to say so before
   * the save fails.
   *
   * @param {{score1:number, score2:number, status:string}} input
   * @param {{pointsTo:number|null, overtime:boolean}} [rules] - from rulesForMatch()
   */
  function validate(input, rules) {
    var score1 = Number(input.score1);
    var score2 = Number(input.score2);
    var status = input.status === 'live' ? 'live' : 'finished';

    if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) {
      return { ok: false, reason: 'invalidScore' };
    }
    if (score1 > MAX || score2 > MAX) return { ok: false, reason: 'tooHigh' };
    if (status === 'finished' && score1 === score2) return { ok: false, reason: 'tie' };

    if (rules && rules.pointsTo != null && typeof matchOutcome === 'function') {
      var outcome = matchOutcome(rules, score1, score2);
      // Over the cap without overtime is not a score this format can produce.
      if (!rules.overtime && outcome.capped && !outcome.finished) {
        return { ok: false, reason: 'overTarget' };
      }
      if (status === 'finished' && !outcome.finished) {
        return { ok: false, reason: 'notFinished' };
      }
    }

    return { ok: true, reason: null };
  }

  /** Whether the scores describe a finished match on their own, used to offer
   * saving as final without making anyone think about status. */
  function suggestsFinished(input, rules) {
    if (!rules || rules.pointsTo == null || typeof matchOutcome !== 'function') return false;
    return matchOutcome(rules, Number(input.score1), Number(input.score2)).finished;
  }

  function winnerOf(score1, score2) {
    if (Number(score1) === Number(score2)) return null;
    return Number(score1) > Number(score2) ? 1 : 2;
  }

  scoreInput = {
    sanitize: sanitize,
    commit: commit,
    step: step,
    validate: validate,
    suggestsFinished: suggestsFinished,
    winnerOf: winnerOf,
    MAX: MAX,
  };
  SCORE_INPUT_MAX = MAX;
})();
