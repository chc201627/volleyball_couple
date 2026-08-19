const { readFileSync } = require('node:fs');
const { after, before, beforeEach, test } = require('node:test');
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { get, ref, serverTimestamp, set, update } = require('firebase/database');

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
