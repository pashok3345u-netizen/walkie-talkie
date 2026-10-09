// The checks for main.js. Every step does what the app does (social.js), as a given person,
// and says whether the database must allow or refuse it.
//   [old] — what versions up to 17 do: must keep working with the new rules.
//   [new] — what version 18+ adds. With the OLD rules (--old=1) all of it must be refused.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import * as D from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

const P = new URLSearchParams(location.search);
const [HOST, PORT] = P.get('emu').split(':');
const OLD = P.get('old') === '1', SLOW = P.get('slow') === '1';
const RUN = Date.now().toString(36).slice(-6); // fresh ids every run
const results = [];

function rec(group, name, wantOk, err) {
  const want = OLD && group === 'new' ? false : wantOk;
  const denied = !!err && /permission-denied/.test(err.code || '');
  results.push({ group, name, want: want ? 'allowed' : 'denied', got: err ? (err.code || String(err.message || err)) : 'allowed', pass: want ? !err : denied });
  const r = results[results.length - 1];
  console.log('STEP ' + (r.pass ? 'ok   ' : 'FAIL ') + name + (r.pass ? '' : ' — got: ' + r.got));
}
// A step that hangs (no answer from the emulator) counts as failed after 15 s.
const step = (fn) => Promise.race([fn(), new Promise((r, j) => setTimeout(() => j(new Error('timeout')), 15000))]);
async function ok(group, name, fn) { try { await step(fn); rec(group, name, true, null); } catch (e) { rec(group, name, true, e); } }
async function no(group, name, fn) { try { await step(fn); rec(group, name, false, null); } catch (e) { rec(group, name, false, e); } }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function user(key, email) {
  const uid = key + RUN + 'x'.repeat(12);
  const fa = initializeApp({ projectId: 'demo-wt', apiKey: 'test' }, key);
  const db = D.getFirestore(fa);
  const tok = { sub: uid, user_id: uid };
  if (email) Object.assign(tok, { email, email_verified: true });
  // A browser keeps at most 6 connections per address, so every person gets their own name for this computer.
  D.connectFirestoreEmulator(db, HOST === '127.0.0.1' ? key + '.localhost' : HOST, +PORT, { mockUserToken: tok });
  return { key, uid, tag: key + RUN, db, d: (...p) => D.doc(db, ...p), c: (...p) => D.collection(db, ...p) };
}
const ts = () => D.serverTimestamp();
const pair = (a, b) => (a.uid < b.uid ? a.uid + '_' + b.uid : b.uid + '_' + a.uid);
const AV = 'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';

// ----- what the app does -----
async function createProfile(u, name, extra) {
  const b = D.writeBatch(u.db);
  b.set(u.d('tags', u.tag), { uid: u.uid });
  b.set(u.d('users', u.uid), Object.assign({ name, tag: u.tag, avatar: AV, createdAt: ts() }, extra || {}));
  await b.commit();
}
async function changeTag(u, tag, name) {
  const b = D.writeBatch(u.db);
  b.set(u.d('tags', tag), { uid: u.uid }); b.delete(u.d('tags', u.tag));
  b.update(u.d('users', u.uid), { name, tag });
  await b.commit(); u.tag = tag;
}
const presence = (u, extra) => D.setDoc(u.d('presence', u.uid), Object.assign({ state: 'online', at: ts(), peer: 'peer' + u.key }, extra || {}));
const friendReq = (a, b) => D.setDoc(a.d('friends', pair(a, b)), { users: [a.uid, b.uid], from: a.uid, status: 'pending', at: ts() });
const accept = (b, a) => D.updateDoc(b.d('friends', pair(a, b)), { status: 'accepted', at: ts() });
const ensureChat = (a, b) => D.setDoc(a.d('chats', pair(a, b)), { users: [a.uid, b.uid], lastAt: ts(), last: null, read: { [a.uid]: ts() } });
async function post(a, b, text, extra) {
  const ref = await D.addDoc(a.c('chats', pair(a, b), 'messages'), Object.assign({ from: a.uid, text, at: ts() }, extra || {}));
  await D.updateDoc(a.d('chats', pair(a, b)), { lastAt: ts(), last: { text: text.slice(0, 140), from: a.uid }, ['read.' + a.uid]: ts() });
  return ref.id;
}
const saveMod = (adm, u, m) => D.updateDoc(adm.d('users', u.uid), { mod: Object.assign({ banned: false, voice: false, stream: false, sound: false, dm: false, reason: '' }, m, { active: Object.values(m).some((v) => v === true), by: adm.uid, at: ts() }) });
const block = (a, b) => D.setDoc(a.d('users', a.uid, 'blocked', b.uid), { at: ts() });
const unblock = (a, b) => D.deleteDoc(a.d('users', a.uid, 'blocked', b.uid));
// version 18+
const live = (u, data) => D.setDoc(u.d('live', u.uid), Object.assign({ v: 18, at: ts() }, data));
const ring = (a, b, code, inCall) => D.setDoc(a.d('calls', pair(a, b)), { users: [a.uid, b.uid], from: a.uid, to: b.uid, code, inCall: !!inCall, state: 'ring', at: ts() });
const answer = (b, a, state, code) => D.updateDoc(b.d('calls', pair(a, b)), code ? { state, code } : { state });
const hang = (a, b) => D.updateDoc(a.d('calls', pair(a, b)), { state: 'end' });
const card = (u, data) => D.setDoc(u.d('cards', u.uid), Object.assign({ at: ts() }, data));

async function run() {
  const OWN = user('own', P.get('admin')); // e-mail admin from the rules
  const PADM = user('padm');               // admin by password
  const A = user('alice'), B = user('bob'), C = user('carl'), Dv = user('dave'), E = user('eve'), X = user('xban'), Z = user('zed');

  // ===== old: profiles =====
  for (const u of [OWN, PADM, A, B, C, Dv, E, X]) await ok('old', 'create profile: ' + u.key, () => createProfile(u, u.key));
  await no('old', 'take someone else\'s tag', async () => { const b = D.writeBatch(B.db); b.set(B.d('tags', A.tag), { uid: B.uid }); await b.commit(); });
  await ok('old', 'change name and tag', () => changeTag(A, 'alice2' + RUN, 'Alice'));
  await ok('old', 'remove avatar', () => D.updateDoc(A.d('users', A.uid), { name: 'Alice', tag: A.tag, avatar: D.deleteField() }));
  await ok('old', 'read someone\'s profile', () => D.getDoc(Dv.d('users', A.uid)));
  await ok('old', 'search by tag', () => D.getDocs(D.query(B.c('tags'), D.orderBy(D.documentId()), D.startAt('ali'), D.endAt('ali'), D.limit(8))));
  await no('old', 'give yourself a ban flag (mod)', () => D.updateDoc(A.d('users', A.uid), { mod: { banned: false, active: false } }));

  // ===== old: presence =====
  await ok('old', 'presence write', () => presence(A));
  await no('old', 'presence with an extra field', () => presence(A, { game: 'CS2' }));
  await ok('old', 'read a presence', () => D.getDoc(B.d('presence', A.uid)));

  // ===== old: friends =====
  for (const [a, b] of [[A, B], [A, C], [A, E], [A, X]]) {
    await ok('old', 'friend request ' + a.key + '→' + b.key, () => friendReq(a, b));
    await ok('old', 'accept ' + b.key, () => accept(b, a));
  }
  await ok('old', 'friend request alice→dave', () => friendReq(A, Dv));
  await no('old', 'accept your own request', () => accept(A, Dv));
  await ok('old', 'decline a request', () => D.deleteDoc(Dv.d('friends', pair(A, Dv))));
  await no('old', 'read someone else\'s friendship', () => D.getDoc(Dv.d('friends', pair(A, B))));
  await ok('old', 'list my friends', () => D.getDocs(D.query(A.c('friends'), D.where('users', 'array-contains', A.uid))));

  // ===== old: messages =====
  let mid = '';
  await ok('old', 'start a chat', () => ensureChat(A, B));
  await ok('old', 'send a message', async () => { mid = await post(A, B, 'Привет'); });
  await ok('old', 'list my chats', () => D.getDocs(D.query(B.c('chats'), D.where('users', 'array-contains', B.uid))));
  await ok('old', 'read messages', () => D.getDocs(D.query(B.c('chats', pair(A, B), 'messages'), D.orderBy('at', 'desc'), D.limit(60))));
  await ok('old', 'mark as read', () => D.updateDoc(B.d('chats', pair(A, B)), { ['read.' + B.uid]: ts() }));
  await ok('old', 'react to a message', () => D.updateDoc(B.d('chats', pair(A, B), 'messages', mid), new D.FieldPath('reactions', 'like'), D.arrayUnion(B.uid)));
  await no('old', 'edit someone else\'s message', () => D.updateDoc(B.d('chats', pair(A, B), 'messages', mid), { text: 'взлом', editedAt: ts() }));
  await ok('old', 'edit my message', () => D.updateDoc(A.d('chats', pair(A, B), 'messages', mid), { text: 'Привет!', editedAt: ts() }));
  await ok('old', 'forward a message', () => post(B, A, 'Привет!', { fwd: { name: 'Alice', from: A.uid } }));
  await ok('old', 'delete my message', () => D.updateDoc(A.d('chats', pair(A, B), 'messages', mid), { deleted: true, text: '' }));
  await no('old', 'read someone else\'s messages', () => D.getDocs(D.query(Dv.c('chats', pair(A, B), 'messages'), D.orderBy('at', 'desc'), D.limit(60))));
  await no('old', 'start a chat with a non-friend', () => ensureChat(Dv, A));

  // ===== old: blocking =====
  await ok('old', 'block someone', () => block(E, Dv));
  await no('old', 'friend request to who blocked you', () => friendReq(Dv, E));
  await no('old', 'see the presence of who blocked you', () => D.getDoc(Dv.d('presence', E.uid)));
  await ok('old', 'list my blocks', () => D.getDocs(E.c('users', E.uid, 'blocked')));

  // ===== old: admins =====
  await ok('old', 'e-mail admin: "am I admin?"', () => D.getDoc(OWN.d('config', 'admin')));
  await no('old', 'not admin: "am I admin?"', () => D.getDoc(A.d('config', 'admin')));
  await ok('old', 'check my admins entry', () => D.getDoc(A.d('admins', A.uid)));
  await no('old', 'become admin with a wrong password', () => D.setDoc(PADM.d('admins', PADM.uid), { pass: 'wrong', at: ts() }));
  await ok('old', 'become admin with the password', () => D.setDoc(PADM.d('admins', PADM.uid), { pass: P.get('pass'), at: ts() }));
  await ok('old', 'password admin: "am I admin?"', () => D.getDoc(PADM.d('config', 'admin')));
  await ok('old', 'admin forbids messages (dm)', () => saveMod(OWN, B, { dm: true }));
  await no('old', 'send a message while forbidden', () => post(B, A, 'спам'));
  await ok('old', 'admin lifts it', () => saveMod(OWN, B, {}));
  await ok('old', 'send a message again', () => post(B, A, 'ура'));
  await ok('old', 'password admin bans someone', () => saveMod(PADM, X, { banned: true, reason: 'тест' }));
  await no('old', 'banned: edit profile', () => D.updateDoc(X.d('users', X.uid), { name: 'X2', tag: X.tag }));
  await no('old', 'banned: send a message', () => post(X, A, 'привет'));
  await no('old', 'not admin: moderate someone', () => saveMod(A, B, { banned: true }));
  await ok('old', 'admin: list restricted people', () => D.getDocs(D.query(OWN.c('users'), D.where('mod.active', '==', true), D.limit(100))));

  // ===== new: name colour and badges =====
  await ok('new', 'set my name colour', () => D.updateDoc(A.d('users', A.uid), { color: 3 }));
  await no('new', 'colour out of the palette', () => D.updateDoc(A.d('users', A.uid), { color: 16 }));
  await no('new', 'colour as text', () => D.updateDoc(A.d('users', A.uid), { color: 'red' }));
  await ok('new', 'new profile with a colour', () => createProfile(Z, 'zed', { color: 2 }));
  await no('new', 'new profile with a badge', () => createProfile(user('zed3'), 'zed3', { badges: ['first10'] }));
  await no('new', 'give myself a badge', () => D.updateDoc(A.d('users', A.uid), { badges: ['first10'] }));
  await ok('new', 'e-mail admin gives badges', () => D.updateDoc(OWN.d('users', A.uid), { badges: ['first10', 'tester'] }));
  await ok('old', 'edit profile (old app) with colour and badges in it', () => D.updateDoc(A.d('users', A.uid), { name: 'Alice', tag: A.tag, avatar: AV }));
  await no('new', 'remove my own badge', () => D.updateDoc(A.d('users', A.uid), { badges: [] }));
  await ok('new', 'e-mail admin gives himself Creator and Admin', () => D.updateDoc(OWN.d('users', OWN.uid), { badges: ['creator', 'admin'] }));
  await ok('new', 'password admin gives a badge', () => D.updateDoc(PADM.d('users', B.uid), { badges: ['tester'] }));
  await ok('new', 'password admin takes a badge away', () => D.updateDoc(PADM.d('users', A.uid), { badges: ['first10'] }));
  await no('new', 'password admin gives Creator', () => D.updateDoc(PADM.d('users', B.uid), { badges: ['tester', 'creator'] }));
  await no('new', 'password admin gives Admin', () => D.updateDoc(PADM.d('users', C.uid), { badges: ['admin'] }));
  await no('new', 'password admin takes Creator away', () => D.updateDoc(PADM.d('users', OWN.uid), { badges: ['admin'] }));
  await no('new', 'password admin gives himself a badge', () => D.updateDoc(PADM.d('users', PADM.uid), { badges: ['tester'] }));
  await no('new', 'unknown badge', () => D.updateDoc(OWN.d('users', C.uid), { badges: ['king'] }));
  await no('new', 'same badge twice', () => D.updateDoc(OWN.d('users', C.uid), { badges: ['tester', 'tester'] }));
  await no('new', 'admin changes someone\'s name', () => D.updateDoc(OWN.d('users', C.uid), { name: 'взлом' }));
  await ok('old', 'moderate someone who has badges', () => saveMod(PADM, B, { stream: true }));
  await ok('old', 'lift it', () => saveMod(PADM, B, {}));

  // ===== new: live (friends only: channel, game, status) =====
  await ok('new', 'probe: read my own live (new rules?)', () => D.getDoc(A.d('live', A.uid)));
  await ok('new', 'write my live', () => live(A, { room: { n: 2, code: 'abc123' }, game: { n: 'CS2', since: ts() }, note: { t: '🎮 катаю, не звать', until: D.Timestamp.fromMillis(Date.now() + 3600e3) } }));
  await ok('new', 'friend reads my live', () => D.getDoc(B.d('live', A.uid)));
  await ok('new', 'friend listens to my live', () => new Promise((res, rej) => { const un = D.onSnapshot(C.d('live', A.uid), () => { un(); res(); }, rej); }));
  await no('new', 'stranger reads my live', () => D.getDoc(Dv.d('live', A.uid)));
  await no('new', 'pending friend reads my live', async () => { await friendReq(Dv, A).catch(() => {}); await D.getDoc(Dv.d('live', A.uid)); });
  await no('new', 'friend I blocked reads my live', async () => { await block(A, E); await D.getDoc(E.d('live', A.uid)); });
  await no('new', 'write someone else\'s live', () => D.setDoc(B.d('live', A.uid), { v: 18, at: ts() }));
  await ok('new', 'channel without the code', () => D.updateDoc(A.d('live', A.uid), { room: { n: 3 }, at: ts() }));
  await ok('new', 'left the channel', () => D.updateDoc(A.d('live', A.uid), { room: null, game: null, at: ts() }));
  await no('new', 'bad channel code', () => D.updateDoc(A.d('live', A.uid), { room: { n: 1, code: 'ABC!' }, at: ts() }));
  await no('new', 'extra field in live', () => D.updateDoc(A.d('live', A.uid), { secret: 1, at: ts() }));
  await no('new', 'live without a server time', () => D.updateDoc(A.d('live', A.uid), { room: { n: 1 } }));
  await no('new', 'status text too long', () => D.updateDoc(A.d('live', A.uid), { note: { t: 'x'.repeat(121) }, at: ts() }));
  await ok('new', 'status "forever" (no end time)', () => D.updateDoc(A.d('live', A.uid), { note: { t: 'в отпуске 🌴' }, at: ts() }));

  // ===== new: profile card =====
  await ok('new', 'save my banner and bio', () => card(A, { banner: AV, bio: 'Люблю CS2 и котиков' }));
  await ok('new', 'anyone signed in reads a card', () => D.getDoc(Dv.d('cards', A.uid)));
  await no('new', 'bio too long', () => card(A, { bio: 'x'.repeat(401) }));
  await no('new', 'banner that is not a picture', () => card(A, { banner: 'https://evil.example/x.png' }));
  await no('new', 'write someone else\'s card', () => D.setDoc(Dv.d('cards', A.uid), { bio: 'взлом', at: ts() }));
  await no('new', 'banned: write my card', () => card(X, { bio: 'привет' }));
  await ok('new', 'admin removes a card', () => D.deleteDoc(OWN.d('cards', A.uid)));

  // ===== new: calls =====
  await ok('new', 'call a friend', () => ring(A, B, 'zq1234567', false));
  await ok('new', 'callee sees the call', () => D.getDocs(D.query(B.c('calls'), D.where('users', 'array-contains', B.uid))));
  await no('new', 'stranger reads the call', () => D.getDoc(Dv.d('calls', pair(A, B))));
  await no('new', 'stranger lists someone\'s calls', () => D.getDocs(D.query(Dv.c('calls'), D.where('users', 'array-contains', A.uid))));
  await no('new', 'call the same friend again at once', () => ring(A, B, 'zq7654321', false));
  await no('new', 'caller "accepts" his own call', () => answer(A, B, 'ok'));
  await ok('new', 'accept and invite to my channel', () => answer(B, A, 'ok', 'bobroom1'));
  await no('new', 'caller hangs up after it was accepted', () => hang(A, B));
  await ok('new', 'call back at once (the other one calls)', () => ring(B, A, 'bobroom1', true));
  await ok('new', 'decline', () => answer(A, B, 'no'));
  await ok('new', 'call back again (the other one calls)', () => ring(A, B, 'alroom12', true));
  await no('new', 'accept but change the code of a channel the caller is in', () => answer(B, A, 'ok', 'bobroom1'));
  await ok('new', 'accept into the caller\'s channel', () => answer(B, A, 'ok'));
  await no('new', 'call a non-friend', () => ring(A, Dv, 'zq1234567', false));
  await no('new', 'call a friend I blocked', () => ring(A, E, 'zq1234567', false));
  await no('new', 'call a friend who blocked me', async () => { await block(C, A); await ring(A, C, 'zq1234567', false); });
  await ok('new', 'call after being unblocked', async () => { await unblock(C, A); await ring(A, C, 'zq1234567', false); });
  await no('new', 'callee "hangs up" the caller\'s call', () => hang(C, A));
  await no('new', 'bad state', () => answer(C, A, 'maybe'));
  await ok('new', 'caller hangs up (no answer)', () => hang(A, C));
  await no('new', 'accept a call that was hung up', () => answer(C, A, 'ok'));
  await no('new', 'banned: call a friend', () => ring(X, A, 'zq1234567', false));
  await no('new', 'call with a bad code', () => ring(A, X, 'ZZ', false));
  await no('new', 'call with an extra field', () => D.setDoc(A.d('calls', pair(A, X)), { users: [A.uid, X.uid], from: A.uid, to: X.uid, code: 'abc123', inCall: false, state: 'ring', at: ts(), spam: 1 }));
  await ok('new', 'missed-call message', () => post(A, B, '📞 Пропущенный звонок', { call: 'missed' }));
  await no('new', 'message with an unknown call mark', () => post(A, B, '📞', { call: 'hacked' }));
  if (SLOW) {
    await wait(16000);
    await ok('new', 'call the same friend again after 15 s', () => ring(A, B, 'zq1234567', false));
    await wait(61000);
    await no('new', 'accept a call older than 60 s', () => answer(B, A, 'ok'));
  }

  // ===== old: still fine at the end =====
  await ok('old', 'presence write (end)', () => presence(B));
  await ok('old', 'remove a friend', () => D.deleteDoc(A.d('friends', pair(A, C))));
  await no('new', 'ex-friend reads my live', () => D.getDoc(C.d('live', A.uid)));
  await ok('old', 'give up admin rights', () => D.deleteDoc(PADM.d('admins', PADM.uid)));
}

run().then(() => null, (e) => String((e && e.stack) || e)).then((error) =>
  fetch('/result', { method: 'POST', body: JSON.stringify({ old: OLD, results, error }) }));
