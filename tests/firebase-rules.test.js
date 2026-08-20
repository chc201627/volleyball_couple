const { readFileSync } = require('node:fs');
const { after, before, beforeEach, test } = require('node:test');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { get, ref, serverTimestamp, set, update } = require('firebase/database');
const firebase = require('firebase/compat/app');
require('firebase/compat/auth');
require('firebase/compat/database');
require('node:vm').runInThisContext(readFileSync('js/tournament.js', 'utf8'));
require('node:vm').runInThisContext(readFileSync('js/tournament-repository.js', 'utf8'));

const PROJECT_ID = 'demo-volleyball-couple';
const SESSION_ID = 'session01';
let env;

function structure() {
  return {
    playersById: { p0: { id: 'p1', name: 'One' }, p1: { id: 'p2', name: 'Two' } },
    teamsById: { t0: { id: 't0', playerIds: ['p1'] }, t1: { id: 't1', playerIds: ['p2'] } },
    groupsById: { g0: { id: 'A', teamIds: ['t0', 't1'] } },
    matchesById: {
      matchA: { id: 'matchA', groupId: 'A', team1Id: 't0', team2Id: 't1', round: 1, order: 1 },
      matchB: { id: 'matchB', groupId: 'A', team1Id: 't1', team2Id: 't0', round: 2, order: 2 },
    },
  };
}

function session() {
  return { schemaVersion: 2, ownerUid: 'owner', createdAt: 1, structure: structure() };
}

function structure3() {
  const withFormat = structure();
  withFormat.matchesById.matchA.stageId = 'group';
  withFormat.matchesById.matchB.stageId = 'group';
  withFormat.matchesById.kFinal1 = {
    id: 'kFinal1', groupId: 'final', stageId: 'final', team1Id: 'slot:A1', team2Id: 'slot:A2', round: 1, order: 3,
  };
  withFormat.format = {
    version: 1, preset: 'groupsFinal',
    stagesById: {
      group: { id: 'group', kind: 'roundRobin', order: 1, pointsTo: 21, overtime: false },
      final: { id: 'final', kind: 'knockout', order: 2, pointsTo: 15, overtime: false },
    },
  };
  return withFormat;
}

function session3() {
  return { schemaVersion: 3, ownerUid: 'owner', createdAt: 1, structure: structure3() };
}

async function seed3(access) {
  await env.withSecurityRulesDisabled(async context => {
    const root = ref(context.database());
    await set(root, {
      tournaments: { [SESSION_ID]: session3() },
      tournamentAccess: {
        [SESSION_ID]: {
          members: access || {
            scorer: { label: 'Court one', status: 'approved', requestedAt: 1, decidedAt: 2 },
          },
        },
      },
    });
  });
}

function result(actor, revision, overrides) {
  return Object.assign({
    score1: 21,
    score2: 18,
    status: 'finished',
    revision,
    updatedBy: actor,
    updatedAt: serverTimestamp(),
  }, overrides || {});
}

function db(uid) {
  return uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database();
}

async function seed(access) {
  await env.withSecurityRulesDisabled(async context => {
    const root = ref(context.database());
    await set(root, {
      tournaments: { [SESSION_ID]: session() },
      tournamentAccess: {
        [SESSION_ID]: {
          members: access || {
            scorer: { label: 'Court one', status: 'pending', requestedAt: 1 },
            revoked: { label: 'Old phone', status: 'revoked', requestedAt: 1, decidedAt: 2 },
          },
        },
      },
    });
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      host: '127.0.0.1',
      port: 9000,
      rules: readFileSync('firebase-rules.json', 'utf8'),
    },
  });
});
beforeEach(async () => { await env.clearDatabase(); await seed(); });
after(async () => { await env.cleanup(); });

test('tournaments are public while the access roster stays private', async () => {
  await assertSucceeds(get(ref(db(), `tournaments/${SESSION_ID}`)));
  await assertSucceeds(get(ref(db('owner'), `tournamentAccess/${SESSION_ID}/members`)));
  await assertSucceeds(get(ref(db('scorer'), `tournamentAccess/${SESSION_ID}/members/scorer`)));
  await assertFails(get(ref(db('viewer'), `tournamentAccess/${SESSION_ID}/members`)));
  await assertFails(get(ref(db('viewer'), `tournamentAccess/${SESSION_ID}/members/scorer`)));
});

test('new sessions require schema v2 and the authenticated owner', async () => {
  await env.clearDatabase();
  await assertSucceeds(set(ref(db('owner'), 'tournaments/created01'), Object.assign(session(), {
    createdAt: serverTimestamp(),
  })));
  await assertFails(set(ref(db('attacker'), 'tournaments/spoofed01'), session()));
});

test('a device can only create its own pending request', async () => {
  const member = ref(db('new-scorer'), `tournamentAccess/${SESSION_ID}/members/new-scorer`);
  await assertSucceeds(set(member, { label: 'Court two', status: 'pending', requestedAt: serverTimestamp() }));
  await assertFails(update(member, { status: 'approved', decidedAt: serverTimestamp() }));
  await assertFails(set(ref(db('new-scorer'), `tournamentAccess/${SESSION_ID}/members/other`), {
    label: 'Other', status: 'pending', requestedAt: serverTimestamp(),
  }));
});

test('only the owner approves a pending scorer', async () => {
  const request = { label: 'Court one', status: 'approved', requestedAt: 1, decidedAt: serverTimestamp() };
  await assertFails(set(ref(db('viewer'), `tournamentAccess/${SESSION_ID}/members/scorer`), request));
  await assertSucceeds(set(ref(db('owner'), `tournamentAccess/${SESSION_ID}/members/scorer`), request));
  await assertSucceeds(set(ref(db('scorer'), `tournaments/${SESSION_ID}/results/matchA`), result('scorer', 1)));
});

test('revocation is checked before the next scorer write', async () => {
  await seed({ scorer: { label: 'Court one', status: 'approved', requestedAt: 1, decidedAt: 2 } });
  await assertSucceeds(set(ref(db('scorer'), `tournaments/${SESSION_ID}/results/matchA`), result('scorer', 1)));
  await assertSucceeds(set(ref(db('owner'), `tournamentAccess/${SESSION_ID}/members/scorer`), {
    label: 'Court one', status: 'revoked', requestedAt: 1, decidedAt: serverTimestamp(),
  }));
  await assertFails(set(ref(db('scorer'), `tournaments/${SESSION_ID}/results/matchA`), result('scorer', 2)));
});

test('spectators and scorers cannot alter structure or grants', async () => {
  await assertFails(set(ref(db('viewer'), `tournaments/${SESSION_ID}/results/matchA`), result('viewer', 1)));
  await assertFails(update(ref(db('scorer'), `tournaments/${SESSION_ID}/structure/matchesById/matchA`), { order: 9 }));
  await assertFails(update(ref(db('scorer'), `tournamentAccess/${SESSION_ID}/members/revoked`), { status: 'approved' }));
});

test('results require an existing match and an exact next revision', async () => {
  const owner = db('owner');
  await assertFails(set(ref(owner, `tournaments/${SESSION_ID}/results/missing`), result('owner', 1)));
  await assertSucceeds(set(ref(owner, `tournaments/${SESSION_ID}/results/matchA`), result('owner', 1)));
  await assertFails(set(ref(owner, `tournaments/${SESSION_ID}/results/matchA`), result('owner', 1)));
  await assertFails(set(ref(owner, `tournaments/${SESSION_ID}/results/matchA`), result('owner', 3)));
  await assertSucceeds(set(ref(owner, `tournaments/${SESSION_ID}/results/matchA`), result('owner', 2)));
});

test('result actor, server timestamp, and fields are validated', async () => {
  const target = ref(db('owner'), `tournaments/${SESSION_ID}/results/matchA`);
  await assertFails(set(target, result('someone-else', 1)));
  await assertFails(set(target, result('owner', 1, { updatedAt: 1 })));
  await assertFails(set(target, result('owner', 1, { extra: true })));
});

test('result scores and status follow single-game constraints', async () => {
  const target = ref(db('owner'), `tournaments/${SESSION_ID}/results/matchA`);
  await assertSucceeds(set(target, result('owner', 1, { score1: 10, score2: 10, status: 'live' })));
  await env.clearDatabase(); await seed();
  await assertFails(set(ref(db('owner'), `tournaments/${SESSION_ID}/results/matchA`), result('owner', 1, { score2: 21 })));
  await assertFails(set(ref(db('owner'), `tournaments/${SESSION_ID}/results/matchA`), result('owner', 1, { score1: -1 })));
  await assertFails(set(ref(db('owner'), `tournaments/${SESSION_ID}/results/matchA`), result('owner', 1, { status: 'pending' })));
});

test('different matches accept independent concurrent revisions', async () => {
  const owner = db('owner');
  await Promise.all([
    assertSucceeds(set(ref(owner, `tournaments/${SESSION_ID}/results/matchA`), result('owner', 1))),
    assertSucceeds(set(ref(owner, `tournaments/${SESSION_ID}/results/matchB`), result('owner', 1))),
  ]);
  const snapshot = await get(ref(owner, `tournaments/${SESSION_ID}/results`));
  if (snapshot.size !== 2) throw new Error('Expected two independent results');
});

test('v3 sessions with a well-formed format are accepted by the owner', async () => {
  await env.clearDatabase();
  await assertSucceeds(set(ref(db('owner'), 'tournaments/created-v3'), Object.assign(session3(), {
    createdAt: serverTimestamp(),
  })));
  await assertFails(set(ref(db('attacker'), 'tournaments/spoofed-v3'), session3()));
});

test('schema v4 and malformed format fields are rejected', async () => {
  await env.clearDatabase();
  const v4 = Object.assign(session3(), { schemaVersion: 4, createdAt: serverTimestamp() });
  await assertFails(set(ref(db('owner'), 'tournaments/bad-v4'), v4));

  const zeroPoints = session3(); zeroPoints.structure.format.stagesById.group.pointsTo = 0;
  await assertFails(set(ref(db('owner'), 'tournaments/bad-points-low'), Object.assign(zeroPoints, { createdAt: serverTimestamp() })));

  const overCapPoints = session3(); overCapPoints.structure.format.stagesById.group.pointsTo = 100;
  await assertFails(set(ref(db('owner'), 'tournaments/bad-points-high'), Object.assign(overCapPoints, { createdAt: serverTimestamp() })));

  const nonBooleanOvertime = session3(); nonBooleanOvertime.structure.format.stagesById.group.overtime = 'yes';
  await assertFails(set(ref(db('owner'), 'tournaments/bad-overtime'), Object.assign(nonBooleanOvertime, { createdAt: serverTimestamp() })));

  const tooLongCustomRules = session3(); tooLongCustomRules.structure.format.customRules = 'x'.repeat(501);
  await assertFails(set(ref(db('owner'), 'tournaments/bad-custom-rules'), Object.assign(tooLongCustomRules, { createdAt: serverTimestamp() })));

  const mismatchedStageId = session3(); mismatchedStageId.structure.format.stagesById.group.id = 'other';
  await assertFails(set(ref(db('owner'), 'tournaments/bad-stage-id'), Object.assign(mismatchedStageId, { createdAt: serverTimestamp() })));

  const strayFormatField = session3(); strayFormatField.structure.format.extra = true;
  await assertFails(set(ref(db('owner'), 'tournaments/bad-format-extra'), Object.assign(strayFormatField, { createdAt: serverTimestamp() })));
});

test('scorers write knockout results but cannot touch the format structure', async () => {
  await seed3();
  await assertFails(update(ref(db('scorer'), `tournaments/${SESSION_ID}/structure/format`), { preset: 'custom' }));
  await assertSucceeds(set(ref(db('scorer'), `tournaments/${SESSION_ID}/results/kFinal1`), result('scorer', 1)));
  await assertFails(set(ref(db('viewer'), `tournaments/${SESSION_ID}/results/kFinal1`), result('viewer', 1)));
});

test('spectators read v3 stages and the format read-only', async () => {
  await seed3();
  await assertSucceeds(get(ref(db('viewer'), `tournaments/${SESSION_ID}/structure/format`)));
  await assertFails(update(ref(db('viewer'), `tournaments/${SESSION_ID}/structure/format`), { preset: 'custom' }));
});

test('v2 sessions remain unaffected by the v3 rule widening', async () => {
  await env.clearDatabase(); await seed();
  await assertSucceeds(set(ref(db('owner'), `tournaments/${SESSION_ID}/results/matchA`), result('owner', 1)));
  await assertFails(set(ref(db('scorer'), `tournaments/${SESSION_ID}/results/matchA`), result('scorer', 2)));
});

test('Firebase repository creates schema v3 for a format tournament', async () => {
  const tournament = {
    players: [{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }],
    teams: [{ id: 't0', name: 'One', players: [{ id: 'p1', name: 'One' }] }, { id: 't1', name: 'Two', players: [{ id: 'p2', name: 'Two' }] }],
  };
  tournament.teams.forEach(team => { team.player1 = team.players[0]; team.player2 = null; });
  tournament.groups = [{ id: 'A', teams: tournament.teams }];
  tournament.matches = [
    { id: 'matchA', groupId: 'A', stageId: 'group', team1Id: 't0', team2Id: 't1', round: 1, order: 1, status: 'pending', revision: 0, played: false, score1: null, score2: null },
    { id: 'kFinal1', groupId: 'final', stageId: 'final', team1Id: 'slot:A1', team2Id: 'slot:A2', round: 1, order: 2, status: 'pending', revision: 0, played: false, score1: null, score2: null },
  ];
  tournament.format = {
    version: 1, preset: 'groupsFinal',
    stagesById: {
      group: { id: 'group', kind: 'roundRobin', order: 1, pointsTo: 21, overtime: false },
      final: { id: 'final', kind: 'knockout', order: 2, pointsTo: 15, overtime: false },
    },
  };
  const name = `repository-v3-${Date.now()}`;
  const app = firebase.initializeApp({ apiKey: 'demo-key', projectId: PROJECT_ID, databaseURL: `https://${PROJECT_ID}-default-rtdb.firebaseio.com` }, name);
  app.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
  app.database().useEmulator('127.0.0.1', 9000);
  const repo = globalThis.createFirebaseTournamentRepository(app);
  const created = await repo.createSession(tournament);
  if (created.status !== 'synced') throw new Error('Expected schema v3 creation');
  const rawStructure = (await get(ref(app.database(), `tournaments/${created.sessionId}/structure`))).val();
  if (!rawStructure.format || rawStructure.format.stagesById.final.pairs !== undefined) {
    throw new Error('Expected a persisted format node without authoring-time pairs');
  }
  if (rawStructure.matchesById.kFinal1.score1 !== undefined || rawStructure.matchesById.kFinal1.status !== undefined) {
    throw new Error('Expected no result fields on the pre-created knockout match');
  }
  const saved = await repo.saveResult(created.sessionId, {
    matchId: 'kFinal1', score1: 15, score2: 10, status: 'finished', expectedRevision: 0,
  });
  if (saved.status !== 'synced' || saved.result.revision !== 1) throw new Error('Expected synced revision');
  app.database().goOffline();
  await app.delete();
});

test('Firebase repository creates schema v2 and transacts a result', async () => {
  const tournament = {
    players: [{ id: 'p1', name: 'One' }, { id: 'p2', name: 'Two' }],
    teams: [{ id: 't0', name: 'One', players: [{ id: 'p1', name: 'One' }] }, { id: 't1', name: 'Two', players: [{ id: 'p2', name: 'Two' }] }],
  };
  tournament.teams.forEach(team => { team.player1 = team.players[0]; team.player2 = null; });
  tournament.groups = [{ id: 'A', teams: tournament.teams }];
  tournament.matches = [{ id: 'matchA', groupId: 'A', team1Id: 't0', team2Id: 't1', round: 1, order: 1, status: 'pending', revision: 0, played: false, score1: null, score2: null }];
  const name = `repository-${Date.now()}`;
  const app = firebase.initializeApp({ apiKey: 'demo-key', projectId: PROJECT_ID, databaseURL: `https://${PROJECT_ID}-default-rtdb.firebaseio.com` }, name);
  app.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true });
  app.database().useEmulator('127.0.0.1', 9000);
  const repo = globalThis.createFirebaseTournamentRepository(app);
  const created = await repo.createSession(tournament);
  if (created.status !== 'synced') throw new Error('Expected schema v2 creation');
  const saved = await repo.saveResult(created.sessionId, {
    matchId: 'matchA', score1: 21, score2: 18, status: 'finished', expectedRevision: 0,
  });
  if (saved.status !== 'synced' || saved.result.revision !== 1) throw new Error('Expected synced revision');
  app.database().goOffline();
  await app.delete();
});
