// Walkie-Talkie — аккаунты: вход через Google, профили, друзья, личные сообщения, админка.
// Работает только в программе (window.racia), данные хранятся в Firebase (проект walkie-talkie-01).
// Что кому можно, решают правила базы (firestore.rules), а не этот файл.
(() => {
  'use strict';
  const APP = window.racia;
  const Call = window.RaciaCall;
  if (!APP || !Call) return;

  const FB = 'https://www.gstatic.com/firebasejs/12.19.0/';
  const CFG = {
    apiKey: 'AIzaSyDzTTuY3UaO7HyjnpWmKYiyKwhYnhy_nF0',
    authDomain: 'walkie-talkie-01.firebaseapp.com',
    projectId: 'walkie-talkie-01',
    storageBucket: 'walkie-talkie-01.firebasestorage.app',
    messagingSenderId: '111055131729',
    appId: '1:111055131729:web:67f98376c8693498189470'
  };
  const REACTIONS = [['like', '👍'], ['love', '❤️'], ['lol', '😂'], ['wow', '😮'], ['sad', '😢'], ['fire', '🔥']];
  const STATUS_TEXT = { online: 'в сети', idle: 'неактивен', dnd: 'не беспокоить', offline: 'не в сети' };
  const TAG_RE = /^[a-z0-9_]{3,20}$/;
  // What this version can do, for friends' apps (live/<uid>.v): 18 — calls.
  const LIVE_V = 18;
  const RING_MS = 30000;
  // Test copies only (tools/test-harness --fb=…): the local Firestore emulator and a made-up account
  // instead of Google. Ignored unless the emulator is on this very computer.
  const TEST = (() => {
    try {
      const t = JSON.parse(localStorage.getItem('racia-test-fb') || 'null');
      return t && typeof t.uid === 'string' && /^(127\.0\.0\.1|localhost|[a-z0-9-]+\.localhost):\d+$/.test(t.emu) ? t : null;
    } catch (e) { return null; }
  })();

  // ---------- small helpers ----------
  const $ = (s, r) => (r || document).querySelector(s);
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style') el.style.cssText = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (const c of kids.flat(3)) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
    return el;
  }
  const svg = (body, size) => '<svg viewBox="0 0 24 24" width="' + (size || 18) + '" height="' + (size || 18) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  const I = {
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>', 20),
    back: svg('<path d="M15 18l-6-6 6-6"/>', 20),
    smile: svg('<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>'),
    edit: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    fwd: svg('<path d="M14 5l7 7-7 7M21 12H9a6 6 0 0 0-6 6"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    send: svg('<path d="M4 12l16-8-6 16-3-6z"/>', 20),
    phone: svg('<path d="M5 3.5h3.5l2 5-2.6 1.6a11.5 11.5 0 0 0 6 6l1.6-2.6 5 2V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>'),
    phoneDown: svg('<path transform="rotate(135 12 12)" d="M5 3.5h3.5l2 5-2.6 1.6a11.5 11.5 0 0 0 6 6l1.6-2.6 5 2V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>'),
    voice: svg('<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>', 14),
    phoneMissed: svg('<path d="M5 3.5h3.5l2 5-2.6 1.6a11.5 11.5 0 0 0 6 6l1.6-2.6 5 2V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z"/><path d="M15 3l6 6M21 3l-6 6"/>'),
    google: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>'
  };
  const ms = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : 0);
  const pairOf = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
  function errText(e) {
    const c = (e && e.code) || '';
    if (/permission-denied/.test(c)) return 'нет прав на это действие';
    if (/unavailable|network/.test(c)) return 'нет связи с сервером';
    if (/popup|cancel/.test(String(e && e.message))) return 'вход отменён';
    return (e && e.message) || String(e);
  }
  // dates follow the chosen language
  const fmts = {};
  function fmt(kind) {
    const lang = Call.prefs().lang === 'en' ? 'en-GB' : 'ru';
    const key = lang + kind;
    if (!fmts[key]) fmts[key] = new Intl.DateTimeFormat(lang, kind === 't' ? { hour: '2-digit', minute: '2-digit' } : kind === 'd' ? { day: 'numeric', month: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
    return fmts[key];
  }
  const timeFmt = { format: (d) => fmt('t').format(d) };
  const dayFmt = { format: (d) => fmt('d').format(d) };
  const dayYearFmt = { format: (d) => fmt('y').format(d) };
  function dayLabel(t) {
    const d = new Date(t), n = new Date();
    const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((start(n) - start(d)) / 86400000);
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Вчера';
    return d.getFullYear() === n.getFullYear() ? dayFmt.format(d) : dayYearFmt.format(d);
  }
  function shortTime(t) {
    if (!t) return '';
    const d = new Date(t);
    return dayLabel(t) === 'Сегодня' ? timeFmt.format(d) : dayLabel(t) === 'Вчера' ? 'вчера' : dayFmt.format(d);
  }
  async function copyText(t, okText) {
    try { await navigator.clipboard.writeText(t); toast(okText || 'Скопировано'); }
    catch (e) { toast('Не получилось скопировать'); }
  }

  // ---------- state ----------
  const S = {
    F: null, loadErr: '', user: null, me: null, needSetup: false, started: false, signingIn: false, err: '',
    unsub: [], presTimer: 0, watched: new Set(), presWatch: new Map(), hiddenBy: new Set(),
    profiles: new Map(), presence: new Map(),
    friends: new Map(),   // other uid -> {id, other, status, from}
    chats: new Map(),     // chat id -> {id, other, lastAt, last, read}
    blocked: new Set(),
    isAdmin: false, modList: [], modUnsub: null,
    open: false, tab: 'friends',
    chatWith: null, msgs: [], msgUnsub: null, msgLimit: 60, editing: null, focusMsg: null,
    seenMsgs: new Set(), seenReady: false,
    search: { q: '', res: [], busy: false }, adminSearch: { q: '', res: [], sel: null }, pwShown: new Set(),
    lastSeenAt: new Map(), audio: null,
    v2: false, v2Timer: 0, skew: 0, skewKnown: false,   // the database rules of version 18 are in; server clock − mine
    live: new Map(), liveKnown: new Set(), liveWatch: new Map(),   // friends' live/<uid> (what their app can do)
    callUnsub: null, out: null, ring: null,   // my outgoing call; the incoming one on screen
    roomSent: '', roomAt: 0, roomTimer: 0,    // my channel as friends last got it (live/<me>.room)
    actSent: '', noteDur: 'tomorrow', addGame: null,   // my game & status as friends last got them; the forms
    ringLog: new Map(), silenced: new Map(), missedAt: new Map()
  };
  const peerWatch = new Map(); // account uid -> Set(peer ids in my call)

  // ---------- Firebase ----------
  async function fb() {
    if (S.F) return S.F;
    const [a, A, D] = await Promise.all([import(FB + 'firebase-app.js'), import(FB + 'firebase-auth.js'), import(FB + 'firebase-firestore.js')]);
    const app = a.initializeApp(CFG);
    S.F = { auth: A.getAuth(app), db: D.getFirestore(app), A, D };
    if (TEST) {
      const [host, port] = TEST.emu.split(':');
      D.connectFirestoreEmulator(S.F.db, host, +port, { mockUserToken: { sub: TEST.uid, user_id: TEST.uid, email: TEST.uid + '@test.local', email_verified: true } });
    }
    return S.F;
  }
  const d = (...p) => S.F.D.doc(S.F.db, ...p);
  const col = (...p) => S.F.D.collection(S.F.db, ...p);
  const now = () => S.F.D.serverTimestamp();
  const myUid = () => (S.user ? S.user.uid : '');

  async function signIn() {
    S.signingIn = true; S.err = ''; renderAll();
    try {
      const cred = await APP.googleLogin(Call.prefs().lang);
      const c = S.F.A.GoogleAuthProvider.credential(cred.idToken, cred.accessToken || null);
      await S.F.A.signInWithCredential(S.F.auth, c);
    } catch (e) {
      const t = String((e && e.message) || e);
      if (!/cancel|restart/.test(t)) S.err = /timeout/.test(t) ? 'Время на вход вышло. Попробуй ещё раз.' : 'Не получилось войти: ' + errText(e);
    }
    S.signingIn = false; renderAll();
  }
  async function signOut() {
    writePresence(true);
    await new Promise((r) => setTimeout(r, 300));
    if (TEST) { onUser(null); return; }
    try { await S.F.A.signOut(S.F.auth); } catch (e) {}
  }

  function stopAll() {
    for (const u of S.unsub) { try { u(); } catch (e) {} }
    for (const u of S.presWatch.values()) { try { u(); } catch (e) {} }
    S.unsub = []; S.watched.clear(); S.presWatch.clear(); S.hiddenBy.clear();
    if (S.msgUnsub) { S.msgUnsub(); S.msgUnsub = null; }
    if (S.modUnsub) { S.modUnsub(); S.modUnsub = null; }
    if (S.callUnsub) { S.callUnsub(); S.callUnsub = null; }
    for (const u of S.liveWatch.values()) { try { u(); } catch (e) {} }
    S.liveWatch.clear(); S.live.clear(); S.liveKnown.clear();
    endOutgoing(); closeRing();
    clearInterval(S.presTimer); clearTimeout(S.v2Timer); clearTimeout(S.roomTimer); S.roomSent = ''; S.actSent = '';
    S.started = false; S.isAdmin = false; S.v2 = false;
    S.friends.clear(); S.chats.clear(); S.blocked.clear(); S.profiles.clear(); S.presence.clear();
    S.chatWith = null; S.msgs = [];
  }

  function onUser(user) {
    stopAll();
    S.user = user; S.me = null;
    if (!user) { Call.setAccount(null); closeSetup(); renderAll(); return; }
    S.unsub.push(S.F.D.onSnapshot(d('users', user.uid), (snap) => {
      if (!snap.exists()) {
        S.me = null; S.needSetup = true;
        Call.setAccount(null); openSetup(); renderAll();
        return;
      }
      S.needSetup = false; closeSetup();
      S.me = Object.assign({ uid: user.uid }, snap.data());
      S.profiles.set(user.uid, S.me);
      Call.setAccount(S.me);
      if (!S.started) startSubs();
      renderAll();
    }, (e) => { S.err = 'Не загрузился профиль: ' + errText(e); renderAll(); }));
  }

  function startSubs() {
    S.started = true;
    const uid = myUid(), D = S.F.D;
    writePresence();
    S.presTimer = setInterval(() => writePresence(), 60000);
    S.unsub.push(D.onSnapshot(D.query(col('friends'), D.where('users', 'array-contains', uid)), (qs) => {
      const before = new Set(S.friends.keys());
      S.friends.clear();
      qs.forEach((x) => {
        const v = x.data();
        const other = v.users[0] === uid ? v.users[1] : v.users[0];
        S.friends.set(other, { id: x.id, other, status: v.status, from: v.from });
        watchUser(other);
        if (v.status === 'accepted') watchLive(other);
      });
      // Someone removed me (maybe blocked me): ask the server again whether I may see their status.
      for (const u of before) if (!S.friends.has(u)) restartPresence(u);
      for (const u of Array.from(S.liveWatch.keys())) if (!isFriend(u)) unwatchLive(u);
      renderAll();
    }, onListenErr));
    S.unsub.push(D.onSnapshot(D.query(col('chats'), D.where('users', 'array-contains', uid)), (qs) => {
      qs.forEach((x) => {
        const v = x.data({ serverTimestamps: 'estimate' });
        const other = v.users[0] === uid ? v.users[1] : v.users[0];
        const c = { id: x.id, other, lastAt: ms(v.lastAt), last: v.last || null, read: v.read || {} };
        const prev = S.chats.get(x.id);
        S.chats.set(x.id, c);
        watchUser(other);
        if (prev && c.lastAt > prev.lastAt && c.last && c.last.from !== uid) notifyMessage(c);
      });
      if (S.chatWith && !S.msgUnsub && S.chats.has(chatIdWith(S.chatWith))) subscribeMessages();
      renderAll();
    }, onListenErr));
    S.unsub.push(D.onSnapshot(col('users', uid, 'blocked'), (qs) => {
      S.blocked = new Set(qs.docs.map((x) => x.id));
      for (const b of S.blocked) {
        watchUser(b);
        const un = S.presWatch.get(b); if (un) { un(); S.presWatch.delete(b); }
        S.presence.delete(b);
      }
      renderAll();
    }, onListenErr));
    checkAdmin();
    probeV2();
    for (const acc of peerWatch.keys()) watchUser(acc);
  }
  // Am I an admin? By password (admins/<me> exists) or by e-mail listed in the rules
  // (then reading config/admin is allowed). The server decides; this only shows the tools.
  async function checkAdmin() {
    const D = S.F.D, uid = myUid();
    let byPass = false, byRule = false;
    try { byPass = (await D.getDoc(d('admins', uid))).exists(); } catch (e) {}
    try { await D.getDoc(d('config', 'admin')); byRule = true; } catch (e) {}
    S.isAdmin = byPass || byRule; S.adminByPass = byPass; S.adminByEmail = byRule && !byPass;
    if (S.isAdmin) watchModList();
    renderAll();
  }
  function onListenErr(e) { S.err = 'Связь с сервером: ' + errText(e); renderAll(); }

  function watchUser(uid) {
    if (!uid || !S.F) return;
    const D = S.F.D;
    if (!S.watched.has(uid)) {
      S.watched.add(uid);
      S.unsub.push(D.onSnapshot(d('users', uid), (s) => {
        if (s.exists()) S.profiles.set(uid, Object.assign({ uid }, s.data())); else S.profiles.delete(uid);
        updatePeers(uid); renderAll();
      }, () => {}));
    }
    watchPresence(uid);
  }
  function restartPresence(uid) {
    const un = S.presWatch.get(uid);
    if (un) { try { un(); } catch (e) {} S.presWatch.delete(uid); }
    setTimeout(() => watchPresence(uid), 800);
  }
  // Presence is hidden by the server from people the owner blocked. A refused read means
  // "this person blocked me": show them as offline and don't offer to write. Retried every 30 s.
  function watchPresence(uid) {
    if (S.presWatch.has(uid) || uid === myUid() || S.blocked.has(uid)) return;
    const D = S.F.D;
    const un = D.onSnapshot(d('presence', uid), (s) => {
      S.hiddenBy.delete(uid);
      S.presence.set(uid, s.exists() ? s.data({ serverTimestamps: 'estimate' }) : null);
      updatePeers(uid); renderAll();
    }, (e) => {
      S.presWatch.delete(uid);
      S.presence.delete(uid);
      if (/permission/.test(e && e.code)) S.hiddenBy.add(uid);
      updatePeers(uid); renderAll();
    });
    S.presWatch.set(uid, un);
  }

  // ---------- presence: online / idle / dnd / offline ----------
  function writePresence(offline) {
    if (!S.user || !S.me || !S.F) return;
    const ci = Call.info();
    S.F.D.setDoc(d('presence', myUid()), { state: offline ? 'offline' : ci.status, at: now(), peer: offline ? '' : (ci.peer || '') }).catch(() => {});
  }
  function statusOf(uid) {
    if (uid === myUid()) return Call.info().status;
    if (S.blocked.has(uid) || S.hiddenBy.has(uid)) return 'offline';
    const p = S.presence.get(uid);
    if (!p || p.state === 'offline') return 'offline';
    const at = ms(p.at);
    if (!at || Date.now() - at > 150000) return 'offline';
    return p.state;
  }
  window.addEventListener('racia-call', () => { writePresence(); syncRoom(); });
  window.addEventListener('racia-activity', () => { writeActivity(); renderAll(); });
  window.addEventListener('racia-prefs', () => renderAll());
  window.addEventListener('beforeunload', () => writePresence(true));

  // ---------- confirming who is who in a call ----------
  // A peer says "I'm account X". It counts only if X's presence (which only X can write) names that peer.
  function updatePeers(uid) {
    const set = peerWatch.get(uid); if (!set) return;
    const prof = S.profiles.get(uid), p = S.presence.get(uid);
    for (const peerId of set) {
      const verified = !!prof && !!p && p.peer === peerId && Date.now() - ms(p.at) < 180000;
      Call.peerAccount(peerId, { uid, verified, name: prof ? prof.name : '', tag: prof ? prof.tag : '', avatar: prof ? safeAv(prof.avatar) : '', mod: prof ? prof.mod || {} : {} });
    }
  }

  // ---------- profile ----------
  async function imageToAvatar(src) {
    const img = await createImageBitmap(src);
    const side = Math.min(img.width, img.height);
    const cv = document.createElement('canvas'); cv.width = cv.height = 160;
    const g = cv.getContext('2d');
    g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 160, 160);
    for (const q of [0.85, 0.7, 0.5]) {
      const url = cv.toDataURL('image/webp', q);
      if (url.length <= 120000) return url;
    }
    return cv.toDataURL('image/jpeg', 0.5);
  }
  async function googlePhoto(url) {
    try { const r = await fetch(url.replace(/=s\d+-c$/, '=s256-c')); if (!r.ok) return ''; return await imageToAvatar(await r.blob()); }
    catch (e) { return ''; }
  }
  function cleanTag(t) { return String(t || '').toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '').slice(0, 20); }
  async function tagFree(tag) {
    const s = await S.F.D.getDoc(d('tags', tag));
    return !s.exists() || s.data().uid === myUid();
  }
  async function saveProfile(p) {
    const D = S.F.D, uid = myUid();
    const name = String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, 32);
    const tag = cleanTag(p.tag);
    if (!name) throw new Error('Напиши имя');
    if (!TAG_RE.test(tag)) throw new Error('Тег — от 3 до 20 латинских букв, цифр или _');
    if (!(await tagFree(tag))) throw new Error('Тег @' + tag + ' уже занят');
    const b = D.writeBatch(S.F.db);
    const old = S.me ? S.me.tag : null;
    if (tag !== old) { b.set(d('tags', tag), { uid }); if (old) b.delete(d('tags', old)); }
    const data = { name, tag };
    if (p.avatar) data.avatar = p.avatar;
    if (!S.me) { data.createdAt = now(); b.set(d('users', uid), data); }
    else { if (p.avatar === null) data.avatar = D.deleteField(); b.update(d('users', uid), data); }
    try { await b.commit(); }
    catch (e) { throw new Error(/permission/.test(e && e.code) ? 'Тег занят или правила базы не обновлены' : errText(e)); }
  }

  // ---------- friends & blocks ----------
  async function addFriend(uid) {
    const f = S.friends.get(uid);
    if (f && f.status === 'pending' && f.from !== myUid()) return acceptFriend(uid);
    if (f) return;
    try {
      await S.F.D.setDoc(d('friends', pairOf(myUid(), uid)), { users: [myUid(), uid], from: myUid(), status: 'pending', at: now() });
      toast('Заявка отправлена');
    } catch (e) { toast('Не получилось: ' + errText(e)); }
  }
  async function acceptFriend(uid) {
    const f = S.friends.get(uid); if (!f) return;
    try { await S.F.D.updateDoc(d('friends', f.id), { status: 'accepted', at: now() }); } catch (e) { toast('Не получилось: ' + errText(e)); }
  }
  async function removeFriend(uid) {
    const f = S.friends.get(uid); if (!f) return;
    try { await S.F.D.deleteDoc(d('friends', f.id)); } catch (e) { toast('Не получилось: ' + errText(e)); }
  }
  async function block(uid) {
    try {
      await S.F.D.setDoc(d('users', myUid(), 'blocked', uid), { at: now() });
      if (S.friends.has(uid)) await removeFriend(uid);
      toast('Заблокирован');
    } catch (e) { toast('Не получилось: ' + errText(e)); }
  }
  async function unblock(uid) {
    try { await S.F.D.deleteDoc(d('users', myUid(), 'blocked', uid)); } catch (e) { toast('Не получилось: ' + errText(e)); }
  }
  const isFriend = (uid) => { const f = S.friends.get(uid); return !!f && f.status === 'accepted'; };

  async function searchTags(q) {
    q = cleanTag(q);
    S.search.q = q;
    if (q.length < 2) { S.search.res = []; renderHub(); return; }
    S.search.busy = true; renderHub();
    const D = S.F.D;
    try {
      const qs = await D.getDocs(D.query(col('tags'), D.orderBy(D.documentId()), D.startAt(q), D.endAt(q + ''), D.limit(8)));
      if (S.search.q !== q) return;
      S.search.res = qs.docs.map((x) => x.data().uid).filter((u) => u && u !== myUid());
      for (const u of S.search.res) {
        if (!S.profiles.has(u)) {
          const s = await D.getDoc(d('users', u));
          if (s.exists()) S.profiles.set(u, Object.assign({ uid: u }, s.data()));
        }
      }
    } catch (e) { toast('Поиск: ' + errText(e)); }
    S.search.busy = false; renderHub();
  }

  // ---------- messages ----------
  function chatIdWith(uid) { return pairOf(myUid(), uid); }
  async function ensureChat(uid) {
    const id = chatIdWith(uid);
    if (S.chats.has(id)) return id;
    const s = await S.F.D.getDoc(d('chats', id)).catch(() => null);
    if (!s || !s.exists()) {
      await S.F.D.setDoc(d('chats', id), { users: [myUid(), uid], lastAt: now(), last: null, read: { [myUid()]: now() } });
    }
    return id;
  }
  async function postMessage(uid, text, fwd, extra) {
    const D = S.F.D;
    text = String(text || '').trim().slice(0, 2000);
    if (!text) return;
    const id = await ensureChat(uid);
    const msg = Object.assign({ from: myUid(), text, at: now() }, extra || {});
    if (fwd) msg.fwd = fwd;
    await D.addDoc(col('chats', id, 'messages'), msg);
    await D.updateDoc(d('chats', id), { lastAt: now(), last: { text: text.slice(0, 140), from: myUid() }, ['read.' + myUid()]: now() });
  }
  function openChat(uid) {
    S.tab = 'chats';
    if (S.chatWith !== uid) {
      S.chatWith = uid; S.msgs = []; S.editing = null; S.msgLimit = 60; S.seenReady = false;
      subscribeMessages();
    }
    show(true);
    renderHub();
    setTimeout(() => { const t = $('#sxText'); if (t) t.focus(); }, 50);
  }
  // Messages can be read only once the chat exists (the first message creates it),
  // so for a brand-new chat we wait for it to appear in the chat list and subscribe then.
  function subscribeMessages() {
    if (S.msgUnsub) { S.msgUnsub(); S.msgUnsub = null; }
    if (!S.chatWith) return;
    const D = S.F.D, id = chatIdWith(S.chatWith);
    if (!S.chats.has(id)) { S.msgs = []; S.msgsFull = true; return; }
    const forUid = S.chatWith;
    S.msgUnsub = D.onSnapshot(D.query(col('chats', id, 'messages'), D.orderBy('at', 'desc'), D.limit(S.msgLimit)), (qs) => {
      if (S.chatWith !== forUid) return;
      S.msgs = qs.docs.map((x) => Object.assign({ id: x.id }, x.data({ serverTimestamps: 'estimate' }))).reverse();
      S.msgsFull = qs.size < S.msgLimit;
      renderHub(); markRead();
      S.seenReady = true;
    }, (e) => {
      S.msgUnsub = null;
      if (!/permission/.test(e && e.code)) toast('Сообщения: ' + errText(e));
      setTimeout(() => { if (S.chatWith === forUid && !S.msgUnsub) subscribeMessages(); }, 3000);
    });
  }
  function markRead() {
    if (!S.open || S.tab !== 'chats' || !S.chatWith || !document.hasFocus()) return;
    const c = S.chats.get(chatIdWith(S.chatWith));
    if (!c || !c.last || c.last.from === myUid()) return;
    if (ms(c.read[myUid()]) >= c.lastAt) return;
    S.F.D.updateDoc(d('chats', c.id), { ['read.' + myUid()]: now() }).catch(() => {});
  }
  window.addEventListener('focus', () => markRead());
  function unreadCount() {
    let n = 0;
    for (const c of S.chats.values()) if (c.last && c.last.from !== myUid() && c.lastAt > ms(c.read[myUid()]) && !S.blocked.has(c.other)) n++;
    return n;
  }
  async function sendFromComposer() {
    const ta = $('#sxText'); if (!ta) return;
    const text = ta.value.trim(); if (!text) return;
    const uid = S.chatWith;
    const editing = S.editing;
    ta.value = ''; S.editing = null;
    try {
      if (editing) await S.F.D.updateDoc(d('chats', chatIdWith(uid), 'messages', editing), { text: text.slice(0, 2000), editedAt: now() });
      else await postMessage(uid, text);
      renderHub();
    } catch (e) {
      const t2 = $('#sxText'); if (t2 && !t2.value) t2.value = text;
      S.editing = editing;
      toast('Не отправилось: ' + errText(e));
    }
  }
  async function toggleReaction(m, key) {
    const D = S.F.D;
    const mine = ((m.reactions || {})[key] || []).includes(myUid());
    try {
      await D.updateDoc(d('chats', chatIdWith(S.chatWith), 'messages', m.id), new D.FieldPath('reactions', key), mine ? D.arrayRemove(myUid()) : D.arrayUnion(myUid()));
    } catch (e) { toast('Не получилось: ' + errText(e)); }
  }
  async function deleteMessage(m) {
    try { await S.F.D.updateDoc(d('chats', chatIdWith(S.chatWith), 'messages', m.id), { deleted: true, text: '' }); }
    catch (e) { toast('Не получилось: ' + errText(e)); }
  }
  function msgLink(m) { return 'racia://msg/' + chatIdWith(S.chatWith) + '/' + m.id; }
  async function forward(m, toUid) {
    try {
      const from = S.profiles.get(m.from);
      await postMessage(toUid, m.text, { name: from ? from.name : 'Без имени', from: m.from });
      toast('Переслано: ' + nameOf(toUid));
    } catch (e) { toast('Не переслалось: ' + errText(e)); }
  }
  async function inviteToCall(uid) {
    const ci = Call.info();
    if (!ci.inCall) return;
    const text = Call.prefs().lang === 'en' ? 'Join my channel ' + ci.code.toUpperCase() + ' — racia://join/' + ci.code : 'Заходи ко мне в канал ' + ci.code.toUpperCase() + ' — racia://join/' + ci.code;
    try { await postMessage(uid, text); toast('Приглашение отправлено'); }
    catch (e) { toast('Не отправилось: ' + errText(e)); }
  }
  function notifyMessage(c) {
    if (S.blocked.has(c.other)) return;
    const viewing = S.open && S.tab === 'chats' && S.chatWith === c.other && document.hasFocus();
    if (viewing) return;
    // the "missed call" message right after the ring ended (already shown), or a person who keeps calling
    if (Date.now() - (S.missedAt.get(c.other) || 0) < 20000 || (S.silenced.get(c.other) || 0) > Date.now()) return;
    APP.flash();
    if (Call.info().status !== 'dnd') ping();
    toast(nameOf(c.other) + ': ' + (c.last.text || '').slice(0, 80), () => openChat(c.other), true);
  }
  function ping() {
    try {
      if (!S.audio) S.audio = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = S.audio, t = ctx.currentTime;
      [[880, 0], [1320, 0.08]].forEach(([f, dl]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + dl); g.gain.exponentialRampToValueAtTime(0.05, t + dl + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dl + 0.15);
        o.connect(g); g.connect(ctx.destination); o.start(t + dl); o.stop(t + dl + 0.17);
      });
    } catch (e) {}
  }

  // ---------- links inside the app: racia://join/КОД, racia://msg/чат/сообщение ----------
  function openLink(link) {
    const m = /^racia:\/\/(join|msg)\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_-]+))?/i.exec(String(link || ''));
    if (!m) return;
    if (m[1].toLowerCase() === 'join') { show(false); Call.join(m[2]); return; }
    const chat = m[2], mid = m[3];
    if (!S.user) { toast('Сначала войди в аккаунт'); return; }
    const parts = chat.split('_');
    if (parts.length !== 2 || !parts.includes(myUid())) { toast('Это сообщение из чужой переписки'); return; }
    const other = parts[0] === myUid() ? parts[1] : parts[0];
    S.focusMsg = mid || null;
    openChat(other);
  }
  function linkify(text) {
    const out = [];
    const re = /(racia:\/\/[A-Za-z0-9/_-]+|https?:\/\/[^\s<>"]+)/g;
    let last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      const url = m[0];
      if (url.startsWith('racia://')) out.push(h('a', { href: '#', class: 'sx-link', onclick: (e) => { e.preventDefault(); openLink(url); } }, url.startsWith('racia://join/') ? 'Зайти в канал ' + url.slice(13).toUpperCase() : 'Ссылка на сообщение'));
      else out.push(h('a', { href: url, target: '_blank', rel: 'noopener', class: 'sx-link' }, url));
      last = m.index + url.length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }

  // ---------- database rules of version 18: live/<uid> ----------
  // Calls (and the other version 18+ things) need the new database rules. Until the owner publishes them
  // the server refuses to read live/<me>: then the new buttons stay hidden and nothing new is written
  // (the old rules would refuse it anyway). Checked again every 10 minutes.
  async function probeV2() {
    const uid = myUid();
    clearTimeout(S.v2Timer);
    if (!uid || S.v2) return;
    try { await S.F.D.getDoc(d('live', uid)); }
    catch (e) {
      if (myUid() === uid) S.v2Timer = setTimeout(probeV2, /permission/.test(e && e.code) ? 600000 : 60000);
      return;
    }
    if (myUid() !== uid || S.v2) return;
    S.v2 = true;
    await writeLive();
    startCalls();
    for (const f of S.friends.values()) if (f.status === 'accepted') watchLive(f.other);
    renderAll();
  }
  // My live/<uid> tells friends' apps what mine can do. Writing it also shows how far my clock is
  // from the server's (friends' clocks are sometimes off) — that's how the age of a call is judged.
  async function writeLive() {
    if (!S.v2) return;
    try {
      const t0 = Date.now();
      // the channel, game and status go right away too, so whatever a crash left behind is wiped
      const room = roomNow(), act = activityNow();
      await S.F.D.setDoc(d('live', myUid()), { v: LIVE_V, at: now(), room, game: act.game, note: act.note }, { mergeFields: ['v', 'at', 'room', 'game', 'note'] });
      S.roomSent = JSON.stringify(room); S.roomAt = Date.now(); S.actSent = act.key;
      const t1 = Date.now();
      const at = ms((await S.F.D.getDoc(d('live', myUid()))).get('at'));
      if (at) { S.skew = at - (t0 + t1) / 2; S.skewKnown = true; }
    } catch (e) {}
  }
  const serverNow = () => Date.now() + S.skew;
  function watchLive(uid) {
    if (!S.v2 || !uid || uid === myUid() || S.liveWatch.has(uid)) return;
    S.liveWatch.set(uid, S.F.D.onSnapshot(d('live', uid), (s) => {
      S.liveKnown.add(uid);
      if (s.exists()) S.live.set(uid, s.data({ serverTimestamps: 'estimate' })); else S.live.delete(uid);
      renderAll();
    }, () => { S.liveWatch.delete(uid); S.live.delete(uid); S.liveKnown.delete(uid); }));
  }
  function unwatchLive(uid) {
    const un = S.liveWatch.get(uid);
    if (un) { try { un(); } catch (e) {} }
    S.liveWatch.delete(uid); S.live.delete(uid); S.liveKnown.delete(uid);
  }

  // ---------- "join a friend": my channel in live/<me>.room, friends' channels in theirs ----------
  // room = { n: people in the channel, code } — the code only if friends may come in without an invitation
  // (a channel code works as its password; live/<uid> is readable by friends only).
  const joinOpen = () => { try { return localStorage.getItem('racia-join-open') !== '0'; } catch (e) { return true; } };
  function setJoinOpen(on) {
    try { localStorage.setItem('racia-join-open', on ? '1' : '0'); } catch (e) {}
    syncRoom(true);
  }
  function roomNow() {
    const ci = Call.info();
    if (!ci.inCall) return null;
    const r = { n: Math.max(1, Math.min(99, ci.count | 0 || 1)) };
    if (joinOpen() && /^[a-z0-9]{3,12}$/.test(ci.code)) r.code = ci.code;
    return r;
  }
  // Joining, leaving and switching the setting go out at once; a changed head count at most every 10 s.
  function syncRoom(now_) {
    if (!S.v2 || !S.me) return;
    const r = roomNow(), key = JSON.stringify(r);
    if (key === S.roomSent) { clearTimeout(S.roomTimer); return; }
    let prev = null; try { prev = JSON.parse(S.roomSent || 'null'); } catch (e) {}
    const urgent = now_ || !r !== !prev || (r && prev && r.code !== prev.code);
    clearTimeout(S.roomTimer);
    S.roomTimer = setTimeout(() => {
      const r2 = roomNow(), k2 = JSON.stringify(r2);
      if (!S.v2 || k2 === S.roomSent) return;
      S.roomSent = k2; S.roomAt = Date.now();
      S.F.D.setDoc(d('live', myUid()), { v: LIVE_V, at: now(), room: r2 }, { mergeFields: ['v', 'at', 'room'] })
        .catch(() => { if (S.roomSent === k2) S.roomSent = ''; });
    }, urgent ? 0 : Math.max(0, S.roomAt + 10000 - Date.now()));
  }
  setInterval(() => syncRoom(), 5000);
  // A friend's channel. Shown only while they're online: a crash leaves the last one behind.
  function roomOf(uid) {
    const r = (S.live.get(uid) || {}).room;
    if (!r || typeof r.n !== 'number' || !isFriend(uid) || statusOf(uid) === 'offline') return null;
    return { n: r.n, code: typeof r.code === 'string' && /^[a-z0-9]{3,12}$/.test(r.code) ? r.code : '' };
  }
  function voiceLine(uid) {
    const r = roomOf(uid); if (!r) return null;
    return h('span', { class: 'sx-voice' }, h('span', { class: 'ic', html: I.voice }), h('span', {}, 'В голосовом канале'), ' · ', h('span', {}, r.n + ' чел.'));
  }
  function joinBtn(uid) {
    const r = roomOf(uid); if (!r || !r.code) return null;
    const ci = Call.info();
    if (ci.inCall && ci.code === r.code) return h('span', { class: 's sx-same' }, 'Вы в одном канале');
    return button('Зайти', () => joinCode(r.code), 'btn-primary');
  }

  // ---------- "Playing …" and my own status: live/<me>.game / .note ----------
  // What the call page found (RaciaCall.activity) goes to friends. Times go by the server's clock.
  function activityNow() {
    const a = Call.activity ? Call.activity() : {};
    const ts = (t) => S.F.D.Timestamp.fromMillis(t);
    // "since" a bit early: the server refuses a start time later than its own clock
    const game = a.game ? { n: a.game.n, since: S.skewKnown ? ts(Math.min(a.game.since, Date.now()) + S.skew - 30000) : now() } : null;
    const note = a.note ? Object.assign({ t: a.note.t }, a.note.until ? { until: ts(a.note.until + S.skew) } : {}) : null;
    return { game, note, key: JSON.stringify([a.game ? a.game.n + '@' + a.game.since : '', a.note ? a.note.t + '@' + a.note.until : '']) };
  }
  function writeActivity() {
    if (!S.v2 || !S.me) return;
    const x = activityNow();
    if (x.key === S.actSent) return;
    S.actSent = x.key;
    S.F.D.setDoc(d('live', myUid()), { v: LIVE_V, at: now(), game: x.game, note: x.note }, { mergeFields: ['v', 'at', 'game', 'note'] })
      .catch(() => { if (S.actSent === x.key) S.actSent = ''; });
  }
  // A friend's game and status — like the channel, only while they're online.
  function gameOf(uid) {
    if (uid === myUid()) return Call.activity ? Call.activity().game : null;
    const g = (S.live.get(uid) || {}).game;
    if (!g || typeof g.n !== 'string' || !g.n || !isFriend(uid) || statusOf(uid) === 'offline') return null;
    return { n: g.n.slice(0, 40), since: (ms(g.since) || serverNow()) - S.skew };
  }
  function noteOf(uid) {
    if (uid === myUid()) { const a = Call.activity ? Call.activity() : {}; return a.note ? a.note.t : ''; }
    const n = (S.live.get(uid) || {}).note;
    if (!n || typeof n.t !== 'string' || !n.t || !isFriend(uid) || statusOf(uid) === 'offline') return '';
    if (n.until && ms(n.until) <= serverNow()) return '';
    return n.t.slice(0, 60);
  }
  function fmtDur(t) {
    const m = Math.floor(Math.max(0, t) / 60000);
    if (m < 1) return 'только что';
    if (m < 60) return m + ' мин';
    const hh = Math.floor(m / 60);
    return hh + ' ч' + (m % 60 ? ' ' + (m % 60) + ' мин' : '');
  }
  function gameLine(uid) {
    const g = gameOf(uid); if (!g) return null;
    return h('span', { class: 'sx-game' }, h('span', {}, '🎮 '), h('span', {}, 'Играет в'), ' ', h('span', { translate: 'no' }, g.n), ' · ', h('span', {}, fmtDur(Date.now() - g.since)));
  }

  // ---------- calls: one document per pair of friends, calls/<pair> ----------
  // ring (I call) → ok / no (the friend took it / declined) or end (I hung up / no answer in 30 s).
  // Taken: both go to one channel — the caller's if they're in one, else the friend's, else a new one.
  function canCall(uid) {
    return S.v2 && isFriend(uid) && !S.blocked.has(uid) && !S.hiddenBy.has(uid) && !((S.me && S.me.mod) || {}).banned;
  }
  // A fresh channel for a call: 10 random letters and digits (a channel code works as its password).
  function newCode() {
    const A = 'abcdefghijkmnpqrstuvwxyz23456789', a = new Uint32Array(10);
    crypto.getRandomValues(a);
    return Array.from(a, (n) => A[n % A.length]).join('');
  }
  function joinCode(code) {
    show(false);
    $('#sxCard').hidden = true;
    Call.join(code);
  }
  function startCalls() {
    if (S.callUnsub || !S.v2) return;
    const D = S.F.D, uid = myUid();
    let first = true;
    S.callUnsub = D.onSnapshot(D.query(col('calls'), D.where('users', 'array-contains', uid)), (qs) => {
      qs.docChanges().forEach((ch) => { if (ch.type !== 'removed') onCallDoc(ch.doc.id, ch.doc.data({ serverTimestamps: 'estimate' }), first); });
      first = false;
    }, () => {
      S.callUnsub = null;
      setTimeout(() => { if (S.v2 && myUid() === uid) startCalls(); }, 5000);
    });
  }
  function onCallDoc(pid, c, first) {
    const me = myUid();
    if (!c || !Array.isArray(c.users)) return;
    const o = S.out;
    if (o && o.pid === pid && o.sent) {
      if (c.from !== me) endOutgoing(); // the friend called me at the same moment: their call wins
      else if (c.state === 'ok') answered(o, c.code);
      else if (c.state === 'no') { endOutgoing(); toast(nameOf(o.uid) + ' сейчас не может ответить'); }
    }
    if (c.to !== me) return;
    if (c.state === 'ring') {
      // A call that just changed is "now". One found at start-up (or after the internet came back)
      // must be younger than the ring time.
      if ((first || S.skewKnown) && serverNow() - ms(c.at) > RING_MS + 5000) return;
      incoming(pid, c);
    } else if (S.ring && S.ring.pid === pid) {
      const r = S.ring;
      closeRing();
      if (c.state === 'end') missed(r.uid);
      // ok / no from my other computer: nothing more to do here
    }
  }

  // ----- I call -----
  async function startCall(uid) {
    if (!canCall(uid) || S.out) return;
    if (S.ring && S.ring.uid === uid) { acceptRing(); return; } // they're calling me right now
    // A friend whose app can't take calls (an older version) gets an invitation in the chat instead.
    const lv = S.live.get(uid);
    if (S.liveKnown.has(uid) && !(lv && lv.v >= 18)) { inviteOld(uid); return; }
    const ci = Call.info();
    const o = { uid, pid: chatIdWith(uid), code: ci.inCall ? ci.code : newCode(), inCall: !!ci.inCall, started: Date.now(), sent: true, timer: 0 };
    S.out = o;
    paintOut(); startTone('back'); renderAll();
    try {
      await S.F.D.setDoc(d('calls', o.pid), { users: [myUid(), uid], from: myUid(), to: uid, code: o.code, inCall: o.inCall, state: 'ring', at: now() });
    } catch (e) {
      if (S.out === o) endOutgoing();
      toast(/permission/.test(e && e.code) ? 'Не получилось позвонить. Если только что звонил — подожди 15 секунд.' : 'Не получилось: ' + errText(e));
      return;
    }
    if (S.out === o) o.timer = setTimeout(() => hangUp(true), RING_MS);
  }
  async function hangUp(noAnswer) {
    const o = S.out; if (!o) return;
    endOutgoing();
    try { await S.F.D.updateDoc(d('calls', o.pid), { state: 'end' }); }
    catch (e) {
      // the friend picked up at the very same moment: connect after all
      try { const c = (await S.F.D.getDoc(d('calls', o.pid))).data(); if (c && c.from === myUid() && c.state === 'ok') answered(o, c.code); } catch (e2) {}
      return;
    }
    if (noAnswer) toast('Нет ответа: ' + nameOf(o.uid));
    postMessage(o.uid, Call.prefs().lang === 'en' ? '📞 Missed call' : '📞 Пропущенный звонок', null, { call: 'missed' }).catch(() => {});
  }
  function answered(o, code) {
    endOutgoing();
    toast('Звонок принят: ' + nameOf(o.uid));
    const ci = Call.info();
    if (!(ci.inCall && ci.code === code)) joinCode(code);
  }
  function endOutgoing() {
    const o = S.out; S.out = null;
    if (o) clearTimeout(o.timer);
    clearInterval(S.outTick);
    stopTone('back');
    const bar = $('#sxCallBar'); if (bar) { bar.hidden = true; bar.textContent = ''; }
    if (o && S.started) renderAll();
  }
  function paintOut() {
    const o = S.out, bar = $('#sxCallBar'); if (!o) return;
    const p = S.profiles.get(o.uid), stt = statusOf(o.uid);
    const time = h('span', {});
    const tick = () => { time.textContent = '0:' + String(Math.floor((Date.now() - o.started) / 1000)).padStart(2, '0'); };
    tick(); clearInterval(S.outTick); S.outTick = setInterval(tick, 1000);
    bar.textContent = '';
    bar.append(
      h('span', { class: 'sx-cb-av' }, avatar(o.uid, 36, false)),
      h('span', { class: 'sx-cb-t' },
        h('b', { translate: 'no' }, p ? p.name : '…'),
        h('span', { class: 's' }, h('span', {}, stt === 'dnd' ? 'Звоню… Не беспокоить — может не ответить' : stt === 'offline' ? 'Звоню… Не в сети — может не ответить' : 'Звоню…'), ' · ', time)),
      h('button', { type: 'button', class: 'btn small sx-cb-end', onclick: () => hangUp(false), html: I.phoneDown + '<span>Отменить</span>' }));
    bar.hidden = false;
  }
  // A friend on an older version can't get calls: invite them to my channel in the chat instead.
  async function inviteOld(uid) {
    toast('У друга старая версия Walkie-Talkie — отправляю приглашение в личку');
    if (!Call.info().inCall) {
      joinCode(newCode());
      for (let i = 0; i < 40 && !Call.info().inCall; i++) await new Promise((r) => setTimeout(r, 500));
    }
    if (Call.info().inCall) inviteToCall(uid);
  }

  // ----- I'm called -----
  function incoming(pid, c) {
    const uid = c.from, t = Date.now();
    if (S.blocked.has(uid) || !isFriend(uid)) return;
    if (S.ring && S.ring.pid === pid && S.ring.at === ms(c.at)) return;
    // Someone keeps calling and I don't pick up: after the 3rd call in 2 minutes, 10 quiet minutes
    // (their calls only show up as "missed").
    if ((S.silenced.get(uid) || 0) > t) return;
    const log = (S.ringLog.get(uid) || []).filter((x) => t - x < 120000);
    log.push(t); S.ringLog.set(uid, log);
    if (log.length >= 3) S.silenced.set(uid, t + 600000);
    if (Call.info().status === 'dnd') return; // do not disturb: only the "missed call" in the chat
    if (S.ring && S.ring.pid !== pid) { toast(nameOf(uid) + ' тоже звонит тебе'); return; }
    S.ring = { pid, uid, code: c.code, inCall: !!c.inCall, at: ms(c.at) };
    clearTimeout(S.ringTimer);
    // the caller ends it after 30 s; this is in case their app was closed meanwhile
    S.ringTimer = setTimeout(() => { if (S.ring && S.ring.pid === pid) { closeRing(); missed(uid); } }, RING_MS + 5000);
    paintRing();
    startTone('ring');
    if (!document.hasFocus()) { APP.flash(); notifyCall(uid); }
  }
  function paintRing() {
    const r = S.ring, box = $('#sxRing'); if (!r) return;
    const p = S.profiles.get(r.uid);
    box.textContent = '';
    box.append(h('div', { class: 'sx-ring-box' },
      h('div', { class: 'sx-ring-av' }, h('span', { class: 'sx-ring-wave' }), h('span', { class: 'sx-ring-wave w2' }), avatar(r.uid, 104, false)),
      h('div', { class: 'sx-ring-name', translate: 'no' }, p ? p.name : '…'),
      h('div', { class: 's' }, r.inCall ? 'Зовёт тебя в свой канал' : 'Звонит тебе'),
      h('div', { class: 'sx-ring-acts' },
        h('button', { type: 'button', class: 'btn sx-ring-no', onclick: declineRing, html: I.phoneDown + '<span>Отклонить</span>' }),
        h('button', { type: 'button', class: 'btn sx-ring-yes', onclick: acceptRing, html: I.phone + '<span>Принять</span>' }))));
    box.hidden = false;
  }
  async function acceptRing() {
    const r = S.ring; if (!r) return;
    closeRing();
    S.ringLog.delete(r.uid); S.silenced.delete(r.uid);
    const ci = Call.info();
    // the caller isn't in a channel and I am: they come to mine
    const mine = !r.inCall && ci.inCall;
    try { await S.F.D.updateDoc(d('calls', r.pid), mine ? { state: 'ok', code: ci.code } : { state: 'ok' }); }
    catch (e) { toast(/permission/.test(e && e.code) ? 'Звонок уже закончился' : 'Не получилось: ' + errText(e)); return; }
    if (mine) toast(nameOf(r.uid) + ' сейчас зайдёт к тебе в канал');
    else joinCode(r.code);
  }
  function declineRing() {
    const r = S.ring; if (!r) return;
    closeRing();
    S.F.D.updateDoc(d('calls', r.pid), { state: 'no' }).catch(() => {});
  }
  function closeRing() {
    const r = S.ring; S.ring = null;
    clearTimeout(S.ringTimer);
    stopTone('ring');
    const box = $('#sxRing'); if (box) { box.hidden = true; box.textContent = ''; }
    if (r && APP.closeNotify) APP.closeNotify('call');
  }
  function missed(uid) {
    S.missedAt.set(uid, Date.now());
    toast('Пропущенный звонок: ' + nameOf(uid), () => openChat(uid));
  }
  // The window is minimized or behind a game: a Windows notification as well (the sound is ours).
  async function notifyCall(uid) {
    if (!APP.notify) return;
    const p = S.profiles.get(uid);
    const icon = await pngAvatar(p);
    if (!S.ring || S.ring.uid !== uid) return;
    APP.notify({ tag: 'call', title: p ? p.name : 'Walkie-Talkie', body: Call.prefs().lang === 'en' ? 'Calling you — open Walkie-Talkie to answer' : 'Звонит тебе — открой Walkie-Talkie, чтобы ответить', icon });
  }
  // Windows notifications take PNG; avatars are WebP.
  async function pngAvatar(p) {
    const src = p && safeAv(p.avatar);
    if (!src) return '';
    try {
      const img = await createImageBitmap(await (await fetch(src)).blob());
      const cv = document.createElement('canvas'); cv.width = cv.height = 96;
      const g = cv.getContext('2d');
      g.beginPath(); g.arc(48, 48, 48, 0, Math.PI * 2); g.clip();
      g.drawImage(img, 0, 0, 96, 96);
      return cv.toDataURL('image/png');
    } catch (e) { return ''; }
  }

  // ----- sounds, made on the spot: the ringtone (I'm called) and the ringback (I call) -----
  const tones = {};
  function startTone(kind) {
    stopTone(kind);
    const play = kind === 'ring' ? ringOnce : backOnce;
    play();
    tones[kind] = setInterval(play, kind === 'ring' ? 2600 : 4000);
  }
  function stopTone(kind) { clearInterval(tones[kind]); delete tones[kind]; }
  function actx() {
    if (!S.audio) S.audio = new (window.AudioContext || window.webkitAudioContext)();
    if (S.audio.state === 'suspended') S.audio.resume().catch(() => {});
    return S.audio;
  }
  function note(ctx, f, at, len, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + len + 0.02);
  }
  // a soft marimba-like phrase, played twice
  function ringOnce() {
    try {
      const ctx = actx(), t = ctx.currentTime + 0.02;
      [[784, 0], [988, 0.14], [1175, 0.28], [988, 0.42], [784, 0.9], [988, 1.04], [1175, 1.18], [1568, 1.32]].forEach(([f, dl]) => {
        note(ctx, f, t + dl, 0.5, 0.09);
        note(ctx, f * 4, t + dl, 0.12, 0.012); // a woody overtone
      });
    } catch (e) {}
  }
  // the calm "tuu…" while waiting for an answer
  function backOnce() {
    try {
      const ctx = actx(), t = ctx.currentTime + 0.02;
      for (const f of [425, 450]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025, t + 0.05);
        g.gain.setValueAtTime(0.025, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 1.2);
      }
    } catch (e) {}
  }
  function callBtn(uid) {
    if (!canCall(uid)) return null;
    return h('button', { type: 'button', class: 'sx-callbtn', 'aria-label': 'Позвонить', title: S.out ? 'Ты уже звонишь' : 'Позвонить', disabled: !!S.out, html: I.phone, onclick: () => startCall(uid) });
  }

  // ---------- admin ----------
  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function becomeAdmin(pass) {
    try {
      await S.F.D.setDoc(d('admins', myUid()), { pass, at: now() });
      S.isAdmin = true; watchModList(); toast('Ты администратор'); renderAll();
    } catch (e) {
      toast(/permission/.test(e && e.code) ? 'Неверный пароль (или отпечаток ещё не вставлен в правила базы)' : 'Не получилось: ' + errText(e));
    }
  }
  async function dropAdmin() {
    try { await S.F.D.deleteDoc(d('admins', myUid())); S.isAdmin = false; if (S.tab === 'admin') S.tab = 'profile'; renderAll(); } catch (e) { toast(errText(e)); }
  }
  function watchModList() {
    if (S.modUnsub) return;
    const D = S.F.D;
    S.modUnsub = D.onSnapshot(D.query(col('users'), D.where('mod.active', '==', true), D.limit(100)), (qs) => {
      S.modList = qs.docs.map((x) => Object.assign({ uid: x.id }, x.data()));
      qs.docs.forEach((x) => S.profiles.set(x.id, Object.assign({ uid: x.id }, x.data())));
      renderHub();
    }, () => {});
  }
  async function saveMod(uid, mod) {
    const clean = {
      banned: !!mod.banned, voice: !!mod.voice, stream: !!mod.stream, sound: !!mod.sound, dm: !!mod.dm,
      reason: String(mod.reason || '').slice(0, 200)
    };
    clean.active = clean.banned || clean.voice || clean.stream || clean.sound || clean.dm;
    clean.by = myUid(); clean.at = now();
    try { await S.F.D.updateDoc(d('users', uid), { mod: clean }); toast('Сохранено'); }
    catch (e) { toast('Не сохранилось: ' + errText(e)); }
  }
  async function adminFind(q) {
    q = cleanTag(q); S.adminSearch.q = q;
    if (q.length < 2) { S.adminSearch.res = []; renderHub(); return; }
    const D = S.F.D;
    try {
      const qs = await D.getDocs(D.query(col('tags'), D.orderBy(D.documentId()), D.startAt(q), D.endAt(q + ''), D.limit(10)));
      S.adminSearch.res = qs.docs.map((x) => x.data().uid);
      for (const u of S.adminSearch.res) {
        const s = await D.getDoc(d('users', u));
        if (s.exists()) S.profiles.set(u, Object.assign({ uid: u }, s.data()));
      }
    } catch (e) { toast('Поиск: ' + errText(e)); }
    renderHub();
  }

  // ---------- rendering helpers ----------
  function nameOf(uid) { const p = S.profiles.get(uid); return p ? p.name : 'Без имени'; }
  function statusText(uid) { return S.blocked.has(uid) ? 'заблокирован' : STATUS_TEXT[statusOf(uid)]; }
  const safeAv = (u) => (typeof u === 'string' && /^data:image\/(webp|jpeg|png);base64,/.test(u) ? u : '');
  function avatar(uid, size, withDot) {
    const p = S.profiles.get(uid);
    const name = p ? p.name : '?';
    const el = h('span', { class: 'sx-av', style: 'width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.42) + 'px' },
      p && safeAv(p.avatar) ? h('img', { src: safeAv(p.avatar), alt: '' }) : h('span', { translate: 'no' }, name.charAt(0).toUpperCase()));
    if (withDot && !S.blocked.has(uid)) el.append(h('span', { class: 'sx-dot ' + statusOf(uid), title: STATUS_TEXT[statusOf(uid)] }));
    return el;
  }
  const EYE = svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
  const EYE_OFF = svg('<path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>');
  // A password box with an eye button that shows what is typed.
  function pwField(id, placeholder, auto) {
    const shown = S.pwShown.has(id);
    const input = h('input', { type: shown ? 'text' : 'password', id, placeholder, autocomplete: auto || 'off', spellcheck: 'false' });
    const eye = h('button', { type: 'button', class: 'sx-eye', 'aria-label': shown ? 'Скрыть пароль' : 'Показать пароль', title: shown ? 'Скрыть пароль' : 'Показать пароль', html: shown ? EYE_OFF : EYE });
    eye.addEventListener('click', () => {
      const on = input.type === 'password';
      input.type = on ? 'text' : 'password';
      if (on) S.pwShown.add(id); else S.pwShown.delete(id);
      eye.innerHTML = on ? EYE_OFF : EYE;
      eye.setAttribute('aria-label', on ? 'Скрыть пароль' : 'Показать пароль'); eye.title = eye.getAttribute('aria-label');
      input.focus();
    });
    const wrap = h('span', { class: 'sx-pw' }, input, eye);
    wrap.input = input;
    return wrap;
  }
  function switchRow(title, sub, on, onChange) {
    const b = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!on), 'aria-label': title });
    b.addEventListener('click', () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); onChange(v); });
    return h('div', { class: 'set-row' }, h('div', { class: 'set-text' }, h('div', { class: 't' }, title), sub ? h('div', { class: 's' }, sub) : null), b);
  }
  function button(text, onclick, cls, extra) { return h('button', Object.assign({ type: 'button', class: 'btn small ' + (cls || ''), onclick }, extra || {}), text); }
  let toastTimer = 0;
  function toast(text, onclick, raw) {
    const t = $('#sxToast');
    if (raw) t.setAttribute('translate', 'no'); else t.removeAttribute('translate');
    t.textContent = text;
    t.classList.toggle('clickable', !!onclick);
    t.onclick = onclick ? () => { t.hidden = true; onclick(); } : null;
    t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
  }
  function menu(anchor, items) {
    const p = $('#sxMenu');
    p.textContent = '';
    for (const it of items) {
      if (!it) continue;
      if (it === '-') { p.append(h('div', { class: 'sep' })); continue; }
      if (it.row) { p.append(it.row); continue; }
      p.append(h('button', { type: 'button', class: 'pi' + (it.danger ? ' danger' : ''), onclick: () => { closeMenu(); it.run(); } }, h('span', { class: 'ck', html: it.icon || '' }), h('span', { text: it.text })));
    }
    p.hidden = false;
    const r = anchor.getBoundingClientRect();
    const w = p.offsetWidth, hh = p.offsetHeight;
    p.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
    p.style.top = (r.bottom + 6 + hh > innerHeight - 8 ? Math.max(8, r.top - hh - 6) : r.bottom + 6) + 'px';
    S.menuAnchor = anchor;
  }
  function closeMenu() { const p = $('#sxMenu'); if (p) { p.hidden = true; p.textContent = ''; } S.menuAnchor = null; }
  document.addEventListener('pointerdown', (e) => {
    const p = $('#sxMenu');
    if (!p || p.hidden || p.contains(e.target) || (S.menuAnchor && S.menuAnchor.contains(e.target))) return;
    closeMenu();
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if ($('#sxMenu') && !$('#sxMenu').hidden) { closeMenu(); e.stopPropagation(); return; }
    if (!$('#sxCard').hidden) { $('#sxCard').hidden = true; e.stopPropagation(); return; }
    if (S.editing) { S.editing = null; const t = $('#sxText'); if (t) t.value = ''; renderHub(); e.stopPropagation(); return; }
    if (S.open && $('#sxSetup').hidden) { show(false); e.stopPropagation(); }
  }, true);

  // ---------- shell: account box, hub, modals ----------
  function buildShell() {
    document.body.append(
      h('div', { id: 'sxHub', class: 'sx-hub', hidden: true, role: 'dialog', 'aria-label': 'Друзья и сообщения' },
        h('header', { class: 'sx-top' },
          h('nav', { class: 'sx-tabs', id: 'sxTabs' }),
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Закрыть', html: I.close, onclick: () => show(false) })),
        h('div', { id: 'sxBody', class: 'sx-body' })),
      h('div', { id: 'sxSetup', class: 'modal', hidden: true, role: 'dialog', 'aria-modal': 'true' }),
      h('div', { id: 'sxCard', class: 'modal', hidden: true, role: 'dialog', 'aria-modal': 'true', onclick: (e) => { if (e.target.id === 'sxCard') e.target.hidden = true; } }),
      h('div', { id: 'sxMenu', class: 'pop', hidden: true, role: 'menu' }),
      h('div', { id: 'sxToast', class: 'sx-toast', hidden: true, role: 'status' }),
      h('div', { id: 'sxRing', class: 'sx-ring', hidden: true, role: 'alertdialog', 'aria-label': 'Входящий звонок' }),
      h('div', { id: 'sxCallBar', class: 'sx-callbar', hidden: true, role: 'status' })
    );
  }
  function show(open) {
    S.open = open;
    $('#sxHub').hidden = !open;
    if (open) { renderHub(); markRead(); } else closeMenu();
  }

  function renderAll() {
    renderAcct();
    renderHub();
    const card = $('#sxCard');
    if (card && !card.hidden && card._paint) card._paint();
    const n = unreadCount();
    Call.setChatBadge(n, !!S.me);
    document.title = n ? '(' + n + ') Walkie-Talkie' : 'Walkie-Talkie';
  }

  function renderAcct() {
    const box = $('#acctBox'); if (!box) return;
    box.textContent = '';
    let content;
    if (S.loadErr) {
      content = [h('div', { class: 'sx-acct-t' }, 'Аккаунт'), h('p', { class: 's' }, 'Не загрузилась часть программы для аккаунтов — проверь интернет и перезапусти Walkie-Talkie. Звонки работают и без аккаунта.')];
    } else if (!S.F || (S.user === undefined)) {
      content = [h('p', { class: 's' }, 'Загружаю аккаунт…')];
    } else if (!S.user) {
      content = [
        h('div', { class: 'sx-acct-t' }, 'Аккаунт'),
        h('p', { class: 's' }, S.signingIn
          ? 'Открыл браузер — войди там через Google и возвращайся сюда.'
          : 'Войди через Google, чтобы завести профиль, добавлять друзей и переписываться. Звонить можно и без аккаунта.'),
        S.err ? h('p', { class: 'err' }, S.err) : null,
        S.signingIn
          ? button('Отмена', () => APP.cancelGoogleLogin())
          : h('button', { type: 'button', class: 'btn sx-google', onclick: signIn, html: I.google + '<span>Войти через Google</span>' })
      ];
    } else if (!S.me) {
      content = [h('p', { class: 's' }, S.needSetup ? 'Осталось заполнить профиль.' : 'Загружаю профиль…'), S.err ? h('p', { class: 'err' }, S.err) : null,
        S.needSetup ? button('Заполнить профиль', openSetup, 'btn-primary') : null];
    } else {
      const mod = S.me.mod || {};
      const n = unreadCount(), req = incomingCount();
      content = [
        h('div', { class: 'sx-me' },
          avatar(myUid(), 44, true),
          h('div', { class: 'sx-me-t' }, h('b', { translate: 'no' }, S.me.name), h('span', { class: 's' }, '@' + S.me.tag)),
          button('Профиль', () => { S.tab = 'profile'; show(true); })),
        mod.banned ? h('p', { class: 'err' }, 'Твой аккаунт заблокирован администратором' + (mod.reason ? ': ' + mod.reason : '') + '.') : null,
        h('div', { class: 'sx-acct-row' },
          h('button', { type: 'button', class: 'btn', onclick: () => { S.tab = 'friends'; show(true); } }, 'Друзья', req ? h('span', { class: 'sx-badge' }, String(req)) : null),
          h('button', { type: 'button', class: 'btn', onclick: () => { S.tab = 'chats'; show(true); } }, 'Сообщения', n ? h('span', { class: 'sx-badge' }, String(n)) : null))
      ];
    }
    box.append(h('section', { class: 'panel sx-acct' }, content));
  }
  function incomingCount() { let n = 0; for (const f of S.friends.values()) if (f.status === 'pending' && f.from !== myUid()) n++; return n; }

  function renderHub() {
    if (!S.open) return;
    const tabs = $('#sxTabs'); tabs.textContent = '';
    if (!S.me) { show(false); return; }
    const list = [['friends', 'Друзья', incomingCount()], ['chats', 'Сообщения', unreadCount()], ['profile', 'Профиль', 0]];
    if (S.isAdmin) list.push(['admin', 'Админка', 0]);
    for (const [id, text, n] of list) {
      tabs.append(h('button', { type: 'button', class: 'sx-tab', 'aria-pressed': String(S.tab === id), onclick: () => { S.tab = id; renderHub(); if (id === 'chats') markRead(); } },
        text, n ? h('span', { class: 'sx-badge' }, String(n)) : null));
    }
    const body = $('#sxBody');
    // keep everything the person is typing (the hub is redrawn when data changes)
    const keep = {};
    body.querySelectorAll('input[id], textarea[id]').forEach((el) => {
      if (el.type === 'file') return;
      keep[el.id] = { v: el.value, f: document.activeElement === el, s: el.selectionStart, e: el.selectionEnd };
    });
    const scroller = $('#sxMsgs');
    const atBottom = scroller ? scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 40 : true;
    const prevScroll = scroller ? scroller.scrollTop : 0;
    const bodyScroll = body.scrollTop;
    body.textContent = '';
    if ((S.me.mod || {}).banned) {
      body.append(h('div', { class: 'sx-empty' }, h('div', { class: 'big' }, 'Аккаунт заблокирован'), h('div', {}, 'Администратор Walkie-Talkie заблокировал твой аккаунт' + ((S.me.mod || {}).reason ? ': ' + S.me.mod.reason : '') + '.')));
      return;
    }
    let view = null;
    if (S.tab === 'friends') view = viewFriends();
    else if (S.tab === 'chats') view = viewChats();
    else if (S.tab === 'profile') view = viewProfile();
    else if (S.tab === 'admin' && S.isAdmin) view = viewAdmin();
    if (view) {
      // animate only when the view really changes, not on every data refresh
      const key = S.tab + ':' + (S.tab === 'chats' ? S.chatWith || '' : '');
      if (key !== S.lastView) { view.classList.add('enter'); S.lastView = key; }
      body.append(view);
    }
    for (const [id, k] of Object.entries(keep)) {
      const el = document.getElementById(id); if (!el) continue;
      if (id !== 'sxText' || !S.editingJustSet) el.value = k.v;
      if (k.f) { el.focus({ preventScroll: true }); try { el.setSelectionRange(k.s, k.e); } catch (e) {} }
    }
    S.editingJustSet = false;
    body.scrollTop = bodyScroll;
    const sc = $('#sxMsgs');
    if (sc) {
      const target = S.focusMsg && $('[data-mid="' + S.focusMsg + '"]', sc);
      if (target) { target.scrollIntoView({ block: 'center' }); target.classList.add('flash'); S.flashMsg = { id: S.focusMsg, until: Date.now() + 2000 }; S.focusMsg = null; }
      else if (S.focusMsg && !S.msgsFull && S.msgLimit < 600) { S.msgLimit += 120; subscribeMessages(); }
      else if (S.focusMsg && S.msgs.length) { toast('Это сообщение не нашлось — возможно, оно очень старое'); S.focusMsg = null; }
      else if (atBottom) sc.scrollTop = sc.scrollHeight;
      else sc.scrollTop = prevScroll;
    }
  }

  // ----- friends tab -----
  function personRow(uid, actions, sub, extra) {
    const p = S.profiles.get(uid);
    return h('li', { class: 'sx-person' },
      h('button', { type: 'button', class: 'sx-person-main', onclick: () => openProfile(uid) },
        avatar(uid, 40, true),
        h('span', { class: 'sx-person-t' }, h('b', { translate: 'no' }, p ? p.name : 'Загрузка…'), h('span', { class: 's' }, sub || ((p ? '@' + p.tag : '') + ' · ' + statusText(uid))), extra || null)),
      h('span', { class: 'sx-person-a' }, actions));
  }
  function friendMenuBtn(uid) {
    const b = h('button', { type: 'button', class: 'mbtn', 'aria-label': 'Ещё', html: svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>') });
    b.addEventListener('click', () => menu(b, [
      Call.info().inCall ? { text: 'Позвать в мой канал', run: () => inviteToCall(uid) } : null,
      { text: 'Скопировать тег', icon: I.copy, run: () => copyText('@' + (S.profiles.get(uid) || {}).tag, 'Тег скопирован') },
      '-',
      { text: 'Удалить из друзей', danger: true, run: () => removeFriend(uid) },
      { text: 'Заблокировать', danger: true, run: () => block(uid) }
    ]));
    return b;
  }
  function viewFriends() {
    const me = myUid();
    const incoming = [], outgoing = [], friends = [];
    for (const f of S.friends.values()) {
      if (S.blocked.has(f.other)) continue;
      if (f.status === 'accepted') friends.push(f.other);
      else if (f.from === me) outgoing.push(f.other); else incoming.push(f.other);
    }
    const order = { online: 0, dnd: 1, idle: 2, offline: 3 };
    // friends in a voice channel first, then by status
    friends.sort((a, b) => (roomOf(b) ? 1 : 0) - (roomOf(a) ? 1 : 0) || order[statusOf(a)] - order[statusOf(b)] || nameOf(a).localeCompare(nameOf(b)));
    const online = friends.filter((u) => statusOf(u) !== 'offline').length;

    const searchInput = h('input', { type: 'text', id: 'sxSearch', placeholder: 'Найти по тегу, например @vasya', autocomplete: 'off', spellcheck: 'false' });
    let tm = 0;
    searchInput.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => searchTags(searchInput.value), 300); });

    const results = S.search.q.length >= 2 ? h('ul', { class: 'sx-list' },
      S.search.busy && !S.search.res.length ? h('li', { class: 's' }, 'Ищу…') : null,
      !S.search.busy && !S.search.res.length ? h('li', { class: 's' }, 'Никого с тегом @' + S.search.q + '…') : null,
      S.search.res.map((u) => {
        const f = S.friends.get(u);
        let act;
        if (S.blocked.has(u)) act = button('Разблокировать', () => unblock(u));
        else if (!f) act = button('Добавить в друзья', () => addFriend(u), 'btn-primary');
        else if (f.status === 'accepted') act = button('Написать', () => openChat(u));
        else if (f.from === me) act = h('span', { class: 's' }, 'Заявка отправлена');
        else act = button('Принять заявку', () => acceptFriend(u), 'btn-primary');
        return personRow(u, act);
      })) : null;

    return h('div', { class: 'sx-col' },
      h('section', { class: 'sx-sec' }, h('label', { class: 'lbl', for: 'sxSearch' }, 'Добавить друга'), searchInput, results),
      incoming.length ? h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Заявки в друзья · ' + incoming.length),
        h('ul', { class: 'sx-list' }, incoming.map((u) => personRow(u, [button('Принять', () => acceptFriend(u), 'btn-primary'), button('Отклонить', () => removeFriend(u))])))) : null,
      h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Друзья · ' + friends.length + (friends.length ? ' · в сети ' + online : '')),
        friends.length ? h('ul', { class: 'sx-list' }, friends.map((u) => personRow(u, [joinBtn(u), callBtn(u), button('Написать', () => openChat(u)), friendMenuBtn(u)],
          noteOf(u) ? h('span', { translate: 'no' }, noteOf(u)) : null, [voiceLine(u), gameLine(u)])))
          : h('p', { class: 's' }, 'Пока никого. Найди друга по тегу — тег виден у него в профиле.')),
      outgoing.length ? h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Ты отправил заявки'),
        h('ul', { class: 'sx-list' }, outgoing.map((u) => personRow(u, button('Отменить', () => removeFriend(u)))))) : null,
      S.blocked.size ? h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Заблокированы'),
        h('ul', { class: 'sx-list' }, Array.from(S.blocked).map((u) => personRow(u, button('Разблокировать', () => unblock(u)), 'не может писать тебе и добавлять в друзья')))) : null
    );
  }

  // ----- chats tab -----
  function viewChats() {
    const me = myUid();
    const chats = Array.from(S.chats.values()).filter((c) => !S.blocked.has(c.other)).sort((a, b) => b.lastAt - a.lastAt);
    const list = h('aside', { class: 'sx-chatlist' },
      chats.length ? h('ul', { class: 'sx-list' }, chats.map((c) => {
        const unread = c.last && c.last.from !== me && c.lastAt > ms(c.read[me]);
        return h('li', {}, h('button', { type: 'button', class: 'sx-chatrow' + (S.chatWith === c.other ? ' on' : ''), onclick: () => openChat(c.other) },
          avatar(c.other, 40, true),
          h('span', { class: 'sx-person-t' },
            h('span', { class: 'sx-chatrow-top' }, h('b', { translate: 'no' }, nameOf(c.other)), h('span', { class: 's' }, shortTime(c.lastAt))),
            h('span', { class: 's sx-snip' + (unread ? ' unread' : '') }, c.last ? [c.last.from === me ? h('span', {}, 'Ты: ') : null, h('span', { translate: 'no' }, c.last.text || '')] : 'Нет сообщений')),
          unread ? h('span', { class: 'sx-unread' }) : null));
      })) : h('p', { class: 's', style: 'padding:12px' }, 'Переписок пока нет. Открой друга во вкладке «Друзья» и нажми «Написать».'));
    const conv = S.chatWith ? viewConversation() : h('div', { class: 'sx-empty' }, h('div', { class: 'big' }, 'Выбери переписку'), h('div', {}, 'Слева — твои диалоги с друзьями.'));
    return h('div', { class: 'sx-chats' + (S.chatWith ? ' has-conv' : '') }, list, conv);
  }
  function viewConversation() {
    const me = myUid(), other = S.chatWith, p = S.profiles.get(other);
    const chat = S.chats.get(chatIdWith(other));
    const canWrite = isFriend(other) && !S.blocked.has(other) && !S.hiddenBy.has(other) && !((S.me.mod || {}).dm);
    const head = h('header', { class: 'sx-conv-head' },
      h('button', { type: 'button', class: 'icon-btn sx-back', 'aria-label': 'К списку', html: I.back, onclick: () => { S.chatWith = null; if (S.msgUnsub) { S.msgUnsub(); S.msgUnsub = null; } renderHub(); } }),
      h('button', { type: 'button', class: 'sx-person-main', onclick: () => openProfile(other) },
        avatar(other, 36, true),
        h('span', { class: 'sx-person-t' }, h('b', { translate: 'no' }, p ? p.name : '…'), h('span', { class: 's' }, (p ? '@' + p.tag + ' · ' : '') + statusText(other)))),
      Call.info().inCall && canWrite ? button('Позвать в канал', () => inviteToCall(other)) : null,
      callBtn(other));

    const box = h('div', { class: 'sx-msgs', id: 'sxMsgs' });
    if (!S.msgsFull && S.msgs.length >= S.msgLimit) box.append(h('div', { class: 'sx-more' }, button('Показать раньше', () => { S.msgLimit += 60; subscribeMessages(); })));
    if (!S.msgs.length) box.append(h('div', { class: 'sx-empty small' }, 'Напиши первое сообщение.'));
    let prevDay = '', prev = null;
    const readAt = chat ? ms(chat.read[other]) : 0;
    let lastMine = null;
    for (const m of S.msgs) if (m.from === me && !m.deleted) lastMine = m;
    for (const m of S.msgs) {
      const at = ms(m.at);
      const day = dayLabel(at || Date.now());
      if (day !== prevDay) { box.append(h('div', { class: 'sx-day' }, h('span', {}, day))); prevDay = day; prev = null; }
      const grouped = prev && prev.from === m.from && at - ms(prev.at) < 5 * 60000;
      box.append(messageEl(m, grouped, m === lastMine && readAt >= at));
      prev = m;
    }

    const ta = h('textarea', { id: 'sxText', rows: '1', maxlength: '2000', placeholder: canWrite ? 'Сообщение для ' + (p ? p.name : '') + '…' : '', disabled: !canWrite });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendFromComposer(); } });
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; });
    const why = S.blocked.has(other) ? 'Ты заблокировал этого человека.' : S.hiddenBy.has(other) ? 'Этот человек ограничил общение с тобой.' : !isFriend(other) ? 'Вы больше не друзья — писать нельзя.' : (S.me.mod || {}).dm ? 'Администратор запретил тебе писать сообщения.' : '';
    const comp = h('footer', { class: 'sx-compose' },
      S.editing ? h('div', { class: 'sx-editing' }, h('span', {}, 'Редактирование сообщения'), button('Отмена', () => { S.editing = null; ta.value = ''; renderHub(); })) : null,
      why ? h('div', { class: 's' }, why) : null,
      h('div', { class: 'sx-compose-row' }, ta, h('button', { type: 'button', class: 'btn btn-primary sx-send', 'aria-label': 'Отправить', html: I.send, disabled: !canWrite, onclick: sendFromComposer })));
    return h('section', { class: 'sx-conv' }, head, box, comp);
  }
  function messageEl(m, grouped, read) {
    const me = myUid(), mine = m.from === me;
    const at = ms(m.at);
    const lit = S.flashMsg && S.flashMsg.id === m.id && Date.now() < S.flashMsg.until;
    // a message that just arrived slides in once
    const fresh = S.seenReady && !S.seenMsgs.has(m.id);
    S.seenMsgs.add(m.id);
    const el = h('div', { class: 'sx-msg' + (grouped ? ' grouped' : '') + (mine ? ' mine' : '') + (lit ? ' lit' : '') + (fresh ? ' new' : ''), 'data-mid': m.id });
    const side = grouped ? h('span', { class: 'sx-msg-time-side', text: at ? timeFmt.format(new Date(at)) : '' }) : avatar(m.from, 36, false);
    const content = h('div', { class: 'sx-msg-c' });
    if (!grouped) content.append(h('div', { class: 'sx-msg-h' }, h('b', { translate: 'no' }, nameOf(m.from)), h('span', { class: 's', title: at ? new Date(at).toLocaleString(Call.prefs().lang === 'en' ? 'en-GB' : 'ru') : '' }, at ? timeFmt.format(new Date(at)) : 'отправляется…')));
    const isCall = m.call === 'missed';
    if (m.deleted) content.append(h('div', { class: 'sx-msg-t deleted' }, 'Сообщение удалено'));
    else if (isCall) {
      // "missed call" (the text under it is for older versions)
      const other = S.chatWith;
      content.append(h('div', { class: 'sx-callmsg' + (mine ? '' : ' in') },
        h('span', { class: 'ic', html: I.phoneMissed }),
        h('span', {}, mine ? 'Звонок без ответа' : 'Пропущенный звонок'),
        canCall(other) ? button(mine ? 'Позвонить ещё раз' : 'Перезвонить', () => startCall(other), '', { disabled: !!S.out }) : null));
      if (read) content.append(h('div', { class: 'sx-read' }, 'прочитано'));
    } else {
      if (m.fwd) content.append(h('div', { class: 'sx-fwd' }, 'Переслано от ' + (m.fwd.name || 'кого-то')));
      content.append(h('div', { class: 'sx-msg-t' }, h('span', { translate: 'no' }, linkify(m.text || '')), m.editedAt ? h('span', { class: 'sx-edited', title: new Date(ms(m.editedAt)).toLocaleString(Call.prefs().lang === 'en' ? 'en-GB' : 'ru') }, ' (изменено)') : null));
      const rx = m.reactions || {};
      const chips = REACTIONS.filter(([k]) => (rx[k] || []).length).map(([k, e]) => {
        const who = rx[k];
        return h('button', { type: 'button', class: 'sx-rx' + (who.includes(me) ? ' on' : ''), title: who.map(nameOf).join(', '), onclick: () => toggleReaction(m, k) }, e + ' ' + who.length);
      });
      if (chips.length) content.append(h('div', { class: 'sx-rxs' }, chips));
      if (read) content.append(h('div', { class: 'sx-read' }, 'прочитано'));
    }
    el.append(side, content);
    if (isCall && mine && !m.deleted) {
      const bar = h('div', { class: 'sx-msg-bar' });
      const b = h('button', { type: 'button', 'aria-label': 'Удалить', title: 'Удалить', html: I.trash });
      b.addEventListener('click', () => menu(b, [{ text: 'Удалить сообщение', danger: true, run: () => deleteMessage(m) }]));
      bar.append(b);
      el.append(bar);
    } else if (!m.deleted && !isCall) {
      const bar = h('div', { class: 'sx-msg-bar' });
      const act = (icon, title, fn) => { const b = h('button', { type: 'button', 'aria-label': title, title, html: icon }); b.addEventListener('click', () => fn(b)); return b; };
      bar.append(...[
        act(I.smile, 'Реакция', (b) => menu(b, [{ row: h('div', { class: 'sx-rxpick' }, REACTIONS.map(([k, e]) => h('button', { type: 'button', onclick: () => { closeMenu(); toggleReaction(m, k); } }, e))) }])),
        mine ? act(I.edit, 'Изменить', () => { S.editing = m.id; S.editingJustSet = true; renderHub(); const t = $('#sxText'); if (t) { t.value = m.text; t.focus(); } }) : null,
        act(I.fwd, 'Переслать', (b) => {
          const fr = Array.from(S.friends.values()).filter((f) => f.status === 'accepted' && !S.blocked.has(f.other)).map((f) => f.other);
          menu(b, fr.length ? [{ row: h('div', { class: 'ph' }, 'Переслать кому:') }].concat(fr.map((u) => ({ text: nameOf(u), run: () => forward(m, u) }))) : [{ row: h('div', { class: 'ph' }, 'Нет друзей, кому переслать') }]);
        }),
        act(I.copy, 'Скопировать текст', () => copyText(m.text, 'Текст скопирован')),
        act(I.link, 'Скопировать ссылку', () => copyText(msgLink(m), 'Ссылка скопирована — её можно вставить в любой чат Walkie-Talkie')),
        mine ? act(I.trash, 'Удалить', (b) => menu(b, [{ text: 'Удалить сообщение', danger: true, run: () => deleteMessage(m) }])) : null
      ].filter(Boolean));
      el.append(bar);
    }
    return el;
  }

  // ----- profile tab & card -----
  function profileForm(opts) {
    const p = opts.initial;
    // the picked picture lives in S.formAvatar so a re-render (status ticks, new messages) doesn't drop it
    let avatarUrl = S.formAvatar !== undefined ? S.formAvatar : (p.avatar || '');
    const av = h('button', { type: 'button', class: 'sx-avpick', title: 'Сменить аватар' });
    const paintAv = () => { av.innerHTML = ''; av.append(avatarUrl ? h('img', { src: avatarUrl, alt: '' }) : h('span', { translate: 'no' }, (p.name || '?').charAt(0).toUpperCase())); av.append(h('span', { class: 'sx-avpick-l' }, 'Сменить')); };
    paintAv();
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
    av.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0]; if (!f) return;
      try { avatarUrl = await imageToAvatar(f); S.formAvatar = avatarUrl; paintAv(); renderHub(); } catch (e) { toast('Не получилось открыть картинку'); }
    });
    const name = h('input', { type: 'text', id: 'sxName', maxlength: '32', value: p.name || '' });
    const tag = h('input', { type: 'text', id: 'sxTag', maxlength: '21', value: p.tag ? '@' + p.tag : '', spellcheck: 'false', autocomplete: 'off' });
    const tagHint = h('div', { class: 's' }, 'По тегу тебя находят друзья. Латинские буквы, цифры и _ (3–20).');
    let tm = 0;
    tag.addEventListener('input', () => {
      clearTimeout(tm);
      const t = cleanTag(tag.value);
      if (!TAG_RE.test(t)) { tagHint.textContent = 'Латинские буквы, цифры и _ (3–20).'; tagHint.className = 's'; return; }
      tm = setTimeout(async () => {
        try { const free = await tagFree(t); tagHint.textContent = free ? '@' + t + ' свободен' : '@' + t + ' уже занят'; tagHint.className = free ? 's ok' : 'err'; } catch (e) {}
      }, 350);
    });
    const err = h('p', { class: 'err' });
    const save = button(opts.saveText || 'Сохранить', async () => {
      save.disabled = true; err.textContent = '';
      try {
        await saveProfile({ name: name.value, tag: tag.value, avatar: avatarUrl || (p.avatar ? null : '') });
        S.formAvatar = undefined;
        if (opts.onDone) opts.onDone(); else toast('Профиль сохранён');
      }
      catch (e) { err.textContent = e.message; }
      save.disabled = false;
    }, 'btn-primary');
    return h('div', { class: 'sx-form' },
      h('div', { class: 'sx-form-av' }, av, file, avatarUrl ? h('button', { type: 'button', class: 'btn small', onclick: () => { avatarUrl = ''; S.formAvatar = ''; paintAv(); renderHub(); } }, 'Убрать') : null),
      h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'sxName' }, 'Имя'), name),
      h('div', { class: 'field' }, h('label', { class: 'lbl', for: 'sxTag' }, 'Тег'), tag, tagHint),
      err, save);
  }
  function viewProfile() {
    const st0 = Call.info().settingsStatus;
    const statusSeg = h('div', { class: 'seg', role: 'radiogroup' },
      h('button', { type: 'button', role: 'radio', 'aria-checked': String(st0 !== 'dnd'), onclick: () => { Call.setStatus('online'); renderAll(); } }, 'В сети'),
      h('button', { type: 'button', role: 'radio', 'aria-checked': String(st0 === 'dnd'), onclick: () => { Call.setStatus('dnd'); renderAll(); } }, 'Не беспокоить'));
    const adminBox = h('details', { class: 'sx-sec sx-admin-box', open: !!S.adminOpen }, h('summary', { class: 'lbl' }, 'Администрирование'));
    adminBox.addEventListener('toggle', () => { S.adminOpen = adminBox.open; });
    if (S.isAdmin) {
      adminBox.append(h('p', { class: 's' }, 'Ты администратор Walkie-Talkie. Инструменты — во вкладке «Админка».'),
        S.adminByPass ? button('Отказаться от прав', dropAdmin) : h('p', { class: 's' }, 'Права выданы по твоей почте в правилах базы.'));
    } else {
      const pass = pwField('sxAdmPass', 'Пароль администратора');
      adminBox.append(h('p', { class: 's' }, 'Права администратора выдаются по паролю. Проверяет его сервер, в программе пароль не хранится.'),
        h('div', { class: 'sx-acct-row' }, pass, button('Получить права', () => { if (pass.input.value) becomeAdmin(pass.input.value); })));
    }
    const p1w = pwField('sxNewPass1', 'Новый пароль', 'new-password'), p1 = p1w.input;
    const p2w = pwField('sxNewPass2', 'Ещё раз', 'new-password'), p2 = p2w.input;
    const out = h('div', { class: 'sx-hash', hidden: !S.hashOut });
    if (S.hashOut) out.append(h('code', {}, S.hashOut), button('Скопировать', () => copyText(S.hashOut, 'Отпечаток скопирован')));
    adminBox.append(h('h4', {}, 'Создать пароль администратора'),
      h('p', { class: 's' }, 'Это нужно сделать один раз владельцу проекта. Придумай пароль — Walkie-Talkie покажет его отпечаток. Вставь отпечаток в правила базы вместо PASSWORD_HASH и нажми Publish. По отпечатку пароль узнать нельзя.'),
      h('div', { class: 'sx-acct-row' }, p1w, p2w, button('Показать отпечаток', async () => {
        if (p1.value.length < 10) { toast('Пароль — минимум 10 символов'); return; }
        if (p1.value !== p2.value) { toast('Пароли не совпадают'); return; }
        const hex = await sha256Hex(p1.value);
        S.hashOut = hex;
        out.hidden = false; out.textContent = '';
        out.append(h('code', {}, hex), button('Скопировать', () => copyText(hex, 'Отпечаток скопирован')));
      })), out);

    return h('div', { class: 'sx-col' },
      h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Профиль'),
        h('p', { class: 's' }, 'Изменения сразу видят друзья и люди в звонке.'),
        profileForm({ initial: S.me })),
      h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Оформление'),
        h('div', { class: 'themes', role: 'radiogroup', 'aria-label': 'Тема', 'data-pref': 'theme' },
          [['holo', 'Hologram'], ['deep', 'Deep Field'], ['solar', 'Solar Flare']].map(([v, t]) => h('button', { type: 'button', role: 'radio', class: 'theme-opt', 'data-v': v, 'aria-checked': String(Call.prefs().theme === v) },
            h('span', { class: 'sw' }), h('span', { class: 'tn' }, t)))),
        h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Язык', 'data-pref': 'lang', style: 'align-self:flex-start' },
          [['ru', 'Русский'], ['en', 'English']].map(([v, t]) => h('button', { type: 'button', role: 'radio', 'data-v': v, 'aria-checked': String(Call.prefs().lang === v) }, t)))),
      h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Статус'), statusSeg,
        h('p', { class: 's' }, 'Через 10 минут без действий станешь «неактивен», а когда Walkie-Talkie закрыта — «не в сети».')),
      activitySection(),
      S.v2 ? h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Голосовой канал'),
        switchRow('Друзья могут заходить ко мне без приглашения',
          'Друзья видят, в каком ты канале, и заходят одной кнопкой. Выключишь — увидят только, что ты в канале и сколько там людей.',
          joinOpen(), setJoinOpen)) : null,
      h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Аккаунт'),
        h('p', { class: 's' }, 'Вход через Google: ' + (S.user.email || '')),
        h('div', { class: 'sx-acct-row' }, button('Скопировать мой тег', () => copyText('@' + S.me.tag, 'Тег скопирован')), button('Выйти из аккаунта', signOut))),
      adminBox);
  }
  // ----- profile tab: my own status and games -----
  const NOTE_EMOJI = ['🎮', '🎧', '💤', '📚', '🍕', '🔥', '😎', '🚫'];
  // windows that are never a game (and our own)
  const NOT_GAMES = new Set(['explorer', 'applicationframehost', 'textinputhost', 'systemsettings', 'shellexperiencehost', 'searchhost',
    'startmenuexperiencehost', 'lockapp', 'electron', 'walkietalkie', 'racia', 'nvidia overlay', 'gamebar']);
  function untilFor(kind) {
    if (kind === '1h') return Date.now() + 3600000;
    if (kind === 'tomorrow') { const t = new Date(); t.setHours(24, 0, 0, 0); return t.getTime(); }
    return 0;
  }
  function untilText(t) {
    const x = new Date(t);
    if (x.toDateString() === new Date().toDateString()) return 'до ' + timeFmt.format(x);
    return x.getHours() === 0 && x.getMinutes() === 0 ? 'до завтра' : 'до ' + dayFmt.format(x) + ' ' + timeFmt.format(x);
  }
  const cleanTitle = (t) => String(t || '').split(/ [-–—|] /)[0].replace(/\s+/g, ' ').trim().slice(0, 40);
  async function openAddGame() {
    S.addGame = { busy: true, apps: null }; renderHub();
    let list = null;
    try { list = await Call.windows(); } catch (e) {}
    if (!S.addGame) return;
    S.addGame = { busy: false, apps: Array.isArray(list) ? list.filter((x) => x.n && x.t && !NOT_GAMES.has(x.n)).slice(0, 40) : null };
    renderHub();
  }
  function activitySection() {
    const a = Call.activity ? Call.activity() : null;
    if (!a) return null;
    // my own status
    const input = h('input', { type: 'text', id: 'sxNote', maxlength: '60', placeholder: 'Например: 🎮 катаю рейтинг, не звать', value: a.note ? a.note.t : '', autocomplete: 'off' });
    const emo = h('div', { class: 'sx-emo' }, NOTE_EMOJI.map((e) => h('button', { type: 'button', 'aria-label': e, onclick: () => {
      const s = input.selectionStart ?? input.value.length, en = input.selectionEnd ?? s;
      input.value = (input.value.slice(0, s) + e + input.value.slice(en)).slice(0, 60);
      input.focus(); input.setSelectionRange(s + e.length, s + e.length);
    } }, e)));
    const dur = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Сколько держать статус' },
      [['1h', '1 час'], ['tomorrow', 'До завтра'], ['forever', 'Навсегда']].map(([v, t]) =>
        h('button', { type: 'button', role: 'radio', 'aria-checked': String(S.noteDur === v), onclick: () => { S.noteDur = v; renderHub(); } }, t)));
    const save = button('Сохранить статус', () => {
      const t = input.value.replace(/\s+/g, ' ').trim();
      Call.setNote(t, t ? untilFor(S.noteDur) : 0);
      toast(t ? 'Статус сохранён' : 'Статус убран');
    }, 'btn-primary');
    const clear = a.note ? button('Убрать', () => { input.value = ''; Call.setNote(''); toast('Статус убран'); }) : null;
    const cur = a.note
      ? h('p', { class: 's' }, h('span', {}, 'Сейчас:'), ' ', h('span', { translate: 'no' }, '«' + a.note.t + '»'), ' · ', h('span', {}, a.note.until ? untilText(a.note.until) : 'навсегда'))
      : h('p', { class: 's' }, 'Свой статус видят друзья и люди в звонке, пока ты в сети.');
    // games
    const show = switchRow('Показывать, во что я играю', 'Друзья и люди в звонке видят «Играет в …». Игра узнаётся по запущенной программе раз в 20 секунд.', a.showGame, (on) => Call.setShowGame(on));
    const found = a.found
      ? h('p', { class: 's' }, h('span', {}, 'Сейчас:'), ' ', h('span', {}, '🎮 '), h('span', {}, 'Играет в'), ' ', h('span', { translate: 'no' }, a.found.n), ' · ', h('span', {}, fmtDur(Date.now() - a.found.since)),
        a.showGame ? null : h('span', {}, ' (никому не показывается)'))
      : h('p', { class: 's' }, 'Сейчас игра не найдена.');
    const games = a.games;
    const list = games.length ? h('ul', { class: 'sx-list' }, games.map((g, i) => h('li', { class: 'sx-gamerow' },
      h('span', { translate: 'no' }, h('b', {}, g.n), ' ', h('span', { class: 's' }, g.exe + '.exe')),
      h('button', { type: 'button', class: 'mbtn', 'aria-label': 'Убрать игру', title: 'Убрать игру', html: I.close, onclick: () => { Call.setGames(games.filter((x, j) => j !== i)); renderHub(); } })))) : null;
    const ag = S.addGame;
    let adder;
    if (!ag) adder = button('Добавить свою игру', openAddGame);
    else {
      const exe = h('input', { type: 'text', id: 'sxGameExe', placeholder: 'Файл игры, например game.exe', maxlength: '68', spellcheck: 'false', autocomplete: 'off' });
      const nm = h('input', { type: 'text', id: 'sxGameName', placeholder: 'Название, например Hollow Knight', maxlength: '40', autocomplete: 'off' });
      const apps = ag.apps && ag.apps.length ? ag.apps : null;
      adder = h('div', { class: 'sx-addgame' },
        h('p', { class: 's' }, ag.busy ? 'Ищу открытые окна…' : apps ? 'Запусти игру и выбери её окно — или впиши имя файла сам.' : 'Впиши имя файла игры — его видно в Диспетчере задач, вкладка «Подробности».'),
        apps ? h('div', { class: 'sx-apps' }, apps.map((x) => h('button', { type: 'button', class: 'sx-app', onclick: () => { exe.value = x.n + '.exe'; nm.value = cleanTitle(x.t); nm.focus(); } },
          h('span', { translate: 'no' }, x.t), h('span', { class: 's', translate: 'no' }, x.n + '.exe')))) : null,
        h('div', { class: 'sx-acct-row' }, exe, nm),
        h('div', { class: 'sx-acct-row' }, button('Добавить', () => {
          const e = exe.value.trim().toLowerCase().replace(/\.exe$/, ''), n = nm.value.replace(/\s+/g, ' ').trim();
          if (!e || !n) { toast('Нужны и файл игры, и название'); return; }
          Call.setGames(games.filter((g) => g.exe !== e).concat([{ exe: e, n }]));
          S.addGame = null; exe.value = ''; nm.value = '';
          toast('Игра добавлена'); renderHub();
        }, 'btn-primary'), button('Отмена', () => { S.addGame = null; renderHub(); })));
    }
    return [
      h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Свой статус'),
        input, emo, dur, h('div', { class: 'sx-acct-row' }, save, clear), cur),
      h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Игры'), show, found,
        games.length ? h('div', { class: 'lbl' }, 'Свои игры') : null, list, adder)
    ];
  }

  function openProfile(uid) {
    if (!S.user) return;
    watchUser(uid);
    const card = $('#sxCard');
    const paint = () => {
      const p = S.profiles.get(uid);
      const f = S.friends.get(uid);
      const me = myUid();
      card.textContent = '';
      let acts = [];
      if (uid === me) acts = [button('Мой профиль', () => { card.hidden = true; S.tab = 'profile'; show(true); })];
      else if (S.blocked.has(uid)) acts = [button('Разблокировать', () => unblock(uid).then(paint))];
      else {
        if (!f) acts.push(button('Добавить в друзья', () => addFriend(uid).then(paint), 'btn-primary'));
        else if (f.status === 'accepted') {
          const jb = joinBtn(uid);
          if (jb) acts.push(jb);
          acts.push(button('Написать', () => { card.hidden = true; openChat(uid); }, jb && jb.tagName === 'BUTTON' ? '' : 'btn-primary'));
          if (canCall(uid)) acts.push(button('Позвонить', () => { card.hidden = true; startCall(uid); }, '', { disabled: !!S.out }));
        }
        else if (f.from === me) acts.push(h('span', { class: 's' }, 'Заявка отправлена'));
        else acts.push(button('Принять заявку', () => acceptFriend(uid).then(paint), 'btn-primary'));
        acts.push(button('Заблокировать', () => block(uid).then(paint)));
      }
      if (S.isAdmin && uid !== me) acts.push(button('Модерация', () => { card.hidden = true; S.tab = 'admin'; S.adminSearch.sel = uid; show(true); }));
      card.append(h('div', { class: 'modal-box sx-card' },
        h('div', { class: 'drawer-head' }, h('h2', {}, 'Профиль'), h('button', { type: 'button', class: 'icon-btn', html: I.close, 'aria-label': 'Закрыть', onclick: () => { card.hidden = true; } })),
        h('div', { class: 'sx-card-main' }, avatar(uid, 88, true),
          h('div', {}, h('div', { class: 'sx-card-name', translate: 'no' }, p ? p.name : 'Загрузка…'), h('div', { class: 's' }, (p ? '@' + p.tag + ' · ' : '') + statusText(uid)),
            noteOf(uid) ? h('div', { class: 'sx-note', translate: 'no' }, noteOf(uid)) : null,
            gameLine(uid), voiceLine(uid),
            p && p.mod && p.mod.banned ? h('div', { class: 'err' }, 'Заблокирован администратором') : null)),
        h('div', { class: 'sx-acct-row' }, acts)));
    };
    paint();
    card.hidden = false;
    card._paint = paint;
  }

  // ----- admin tab -----
  function viewAdmin() {
    const q = h('input', { type: 'text', id: 'sxAdminQ', placeholder: 'Тег пользователя', autocomplete: 'off', spellcheck: 'false' });
    let tm = 0;
    q.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => adminFind(q.value), 300); });
    const sel = S.adminSearch.sel;
    const pick = (u) => { S.adminSearch.sel = u; watchUser(u); renderHub(); };
    return h('div', { class: 'sx-col' },
      h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Найти пользователя'), q,
        S.adminSearch.res.length ? h('ul', { class: 'sx-list' }, S.adminSearch.res.map((u) => personRow(u, button('Открыть', () => pick(u))))) : null),
      sel ? modEditor(sel) : null,
      h('section', { class: 'sx-sec' }, h('h3', { class: 'lbl' }, 'Под ограничениями · ' + S.modList.length),
        S.modList.length ? h('ul', { class: 'sx-list' }, S.modList.map((p) => personRow(p.uid, button('Открыть', () => pick(p.uid)), modSummary(p.mod)))) : h('p', { class: 's' }, 'Никого.')));
  }
  function modSummary(m) {
    m = m || {};
    const x = [];
    if (m.banned) x.push('заблокирован'); if (m.voice) x.push('без голоса'); if (m.stream) x.push('без стримов');
    if (m.sound) x.push('стримы без звука'); if (m.dm) x.push('без сообщений');
    return x.join(', ') + (m.reason ? ' — ' + m.reason : '');
  }
  function modEditor(uid) {
    const p = S.profiles.get(uid);
    if (!p) return h('p', { class: 's' }, 'Загрузка…');
    // the switches being edited survive redraws until saved
    if (!S.modDraft || S.modDraft.uid !== uid) S.modDraft = { uid, m: Object.assign({}, p.mod || {}) };
    const m = S.modDraft.m;
    const sw = (key, label) => {
      const b = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(!!m[key]) });
      b.addEventListener('click', () => { m[key] = !m[key]; b.setAttribute('aria-checked', String(!!m[key])); });
      return h('div', { class: 'set-row' }, h('div', { class: 'set-text' }, h('div', { class: 't' }, label)), b);
    };
    const reason = h('input', { type: 'text', id: 'sxModReason', placeholder: 'Причина (её увидит пользователь)', maxlength: '200', value: m.reason || '' });
    return h('section', { class: 'sx-sec' },
      h('div', { class: 'sx-card-main' }, avatar(uid, 56, true), h('div', {}, h('div', { class: 'sx-card-name', translate: 'no' }, p.name), h('div', { class: 's' }, '@' + p.tag + ' · ID ' + uid))),
      sw('banned', 'Заблокировать в Walkie-Talkie (ни звонков, ни сообщений)'),
      sw('voice', 'Запретить говорить в звонках'),
      sw('stream', 'Запретить стримы'),
      sw('sound', 'Стримы только без звука'),
      sw('dm', 'Запретить личные сообщения'),
      reason,
      h('div', { class: 'sx-acct-row' }, button('Сохранить', () => { m.reason = reason.value; S.modDraft = null; saveMod(uid, m); }, 'btn-primary'), button('Закрыть', () => { S.modDraft = null; S.adminSearch.sel = null; renderHub(); })));
  }

  // ----- first login: set up the profile -----
  async function openSetup() {
    const m = $('#sxSetup');
    if (!m.hidden || !S.user) return;
    const u = S.user;
    const guess = cleanTag((u.email || '').split('@')[0]).slice(0, 16);
    const init = { name: (u.displayName || '').slice(0, 32), tag: guess.length >= 3 ? guess : '', avatar: '' };
    const paint = () => {
      m.textContent = '';
      m.append(h('div', { class: 'modal-box sx-setup' },
        h('h2', {}, 'Привет! Заполни профиль'),
        h('p', { class: 's' }, 'Имя и аватар видят друзья и люди в звонке. Тег — твой уникальный ник, по нему тебя ищут.'),
        profileForm({ initial: init, saveText: 'Готово', onDone: () => { closeSetup(); toast('Профиль создан'); } }),
        button('Выйти из аккаунта', signOut)));
    };
    paint();
    m.hidden = false;
    if (u.photoURL) { const a = await googlePhoto(u.photoURL); if (a && !m.hidden) { init.avatar = a; init.name = $('#sxName') ? $('#sxName').value : init.name; init.tag = $('#sxTag') ? cleanTag($('#sxTag').value) : init.tag; paint(); } }
  }
  function closeSetup() { const m = $('#sxSetup'); if (m) { m.hidden = true; m.textContent = ''; } }

  // ---------- styles ----------
  function injectStyles() {
    const css = `
.sx-acct { gap: 12px; }
.sx-acct .s, .sx-hub .s, .sx-card .s, .sx-setup .s { color: var(--muted); font-size: .85rem; margin: 0; }
.sx-acct .err, .sx-hub .err, .sx-setup .err, .sx-card .err { color: var(--danger); font-size: .88rem; margin: 0; }
.sx-acct .err:empty, .sx-form .err:empty { display: none; }
.sx-acct-t { font-family: var(--f-display); font-weight: 700; font-size: 1.05rem; }
.sx-acct-t::after, .sx-setup h2::after, .sx-empty .big::after { content: "."; color: var(--spark); }
.sx-google { display: inline-flex; align-items: center; justify-content: center; gap: 10px; align-self: flex-start; padding: 13px 22px; background: var(--raise); }
.sx-me { display: flex; align-items: center; gap: 12px; }
.sx-me-t { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.sx-me-t b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sx-acct-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.sx-acct-row input { flex: 1 1 160px; min-width: 0; }
.sx-badge { display: inline-block; min-width: 18px; height: 18px; margin-left: 6px; padding: 0 5px; border-radius: 9px; background: var(--live); color: var(--on-live); font-size: .7rem; font-weight: 700; line-height: 18px; text-align: center; vertical-align: 1px; }
.sx-av { position: relative; flex: none; display: inline-grid; place-items: center; border-radius: 50%; background: var(--accent-soft); color: var(--accent); font-family: var(--f-display); font-weight: 700; }
.sx-av img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }
.sx-dot { position: absolute; right: -1px; bottom: -1px; width: 28%; height: 28%; min-width: 10px; min-height: 10px; border-radius: 50%; border: 2px solid var(--panel); background: var(--ok); }
.sx-dot.idle { background: var(--idle); } .sx-dot.dnd { background: var(--danger); } .sx-dot.offline { background: var(--panel); box-shadow: inset 0 0 0 2px var(--muted); }
.sx-hub { position: fixed; inset: 0; z-index: 22; background: var(--bg); display: grid; grid-template-rows: auto minmax(0, 1fr); }
.sx-top { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--line); background: var(--panel); }
.sx-tabs { display: flex; gap: 4px; flex: 1; overflow-x: auto; }
.sx-tab { border: 1px solid var(--line); background: transparent; padding: 9px 16px; border-radius: 999px; font-family: var(--f-mono); font-size: .7rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; white-space: nowrap; color: var(--muted); }
.sx-tab:hover { color: var(--fg); border-color: var(--line-2); }
.sx-tab[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.sx-tab .sx-badge { vertical-align: 0; letter-spacing: 0; }
.sx-body { overflow: auto; min-height: 0; }
.sx-col { max-width: 760px; margin: 0 auto; padding: 24px 16px 40px; display: flex; flex-direction: column; gap: 26px; }
.sx-sec > .themes { max-width: 560px; }
.sx-sec { display: flex; flex-direction: column; gap: 10px; }
.sx-sec h3, .sx-sec label.lbl { margin: 0; }
.sx-sec > .seg:not(.wide), .sx-sec > .btn, .sx-admin-box > .btn { align-self: flex-start; }
.sx-sec h4 { margin: 12px 0 0; font-size: .95rem; }
.sx-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.sx-list > li.s { padding: 6px 2px; }
.sx-person { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line); }
.sx-person:hover { border-color: var(--line-2); }
.sx-person-main { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; border: none; background: transparent; padding: 0; text-align: left; }
.sx-person-t { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.sx-person-t b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sx-person-t .s { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sx-person-a { display: flex; gap: 6px; align-items: center; flex: none; }
.sx-empty { height: 100%; display: grid; place-content: center; justify-items: center; gap: 6px; padding: 24px; color: var(--muted); text-align: center; }
.sx-empty .big { font-family: var(--f-display); font-weight: 700; font-size: 1.2rem; color: var(--fg); }
.sx-empty.small { height: auto; padding: 40px 0; }
.sx-chats { height: 100%; display: grid; grid-template-columns: 320px minmax(0, 1fr); min-height: 0; }
.sx-chatlist { border-right: 1px solid var(--line); overflow: auto; padding: 10px; background: var(--panel); }
.sx-chatrow { width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 1px solid transparent; border-radius: 14px; background: transparent; text-align: left; }
.sx-chatrow:hover { background: var(--raise); }
.sx-chatrow.on { background: var(--accent-soft); border-color: var(--accent); }
.sx-chatrow-top { display: flex; justify-content: space-between; gap: 8px; }
.sx-snip.unread { color: var(--fg) !important; font-weight: 600; }
.sx-unread { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); flex: none; }
.sx-conv { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; min-height: 0; height: 100%; }
.sx-conv-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line); background: var(--panel); }
.sx-back { display: none; }
.sx-msgs { overflow: auto; padding: 12px 16px; display: flex; flex-direction: column; }
.sx-more { display: flex; justify-content: center; padding: 6px; }
.sx-day { display: flex; align-items: center; gap: 10px; margin: 16px 0 6px; color: var(--muted); font-family: var(--f-mono); font-size: .64rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.sx-day::before, .sx-day::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.sx-msg { position: relative; display: grid; grid-template-columns: 40px minmax(0, 1fr); column-gap: 12px; padding: 6px 10px 2px; margin-top: 6px; border-radius: 14px; }
.sx-msg.grouped { margin-top: 0; padding-top: 1px; }
.sx-msg:hover { background: var(--raise); }
.sx-msg.flash { animation: sxflash 2s ease; }
.sx-msg.lit { background: var(--accent-soft); }
@keyframes sxflash { 0%, 40% { background: var(--accent-soft); } 100% { background: transparent; } }
.sx-msg-time-side { font-size: .66rem; color: var(--muted); text-align: right; padding-top: 4px; opacity: 0; font-family: var(--f-mono); }
.sx-msg:hover .sx-msg-time-side { opacity: 1; }
.sx-msg-h { display: flex; align-items: baseline; gap: 8px; }
.sx-msg-h .s { font-size: .74rem; }
.sx-msg-t { white-space: pre-wrap; overflow-wrap: anywhere; }
.sx-msg-t.deleted { color: var(--muted); font-style: italic; font-size: .9rem; }
.sx-edited { color: var(--muted); font-size: .74rem; }
.sx-fwd { font-size: .78rem; color: var(--muted); border-left: 3px solid var(--accent); padding-left: 8px; margin: 2px 0; }
.sx-link { color: var(--accent); }
.sx-rxs { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.sx-rx { padding: 1px 9px; border-radius: 999px; border: 1px solid var(--line); background: var(--raise); font-size: .82rem; }
.sx-rx.on { border-color: var(--accent); background: var(--accent-soft); }
.sx-read { font-size: .7rem; color: var(--muted); margin-top: 2px; }
.sx-msg-bar { position: absolute; top: -14px; right: 10px; display: none; gap: 2px; padding: 3px; border-radius: 999px; background: var(--panel); border: 1px solid var(--line); box-shadow: 0 6px 18px var(--overlay); }
.sx-msg:hover .sx-msg-bar, .sx-msg:focus-within .sx-msg-bar { display: flex; }
.sx-msg-bar button { width: 30px; height: 28px; display: grid; place-items: center; border: none; border-radius: 999px; background: transparent; color: var(--muted); }
.sx-msg-bar button:hover { background: var(--raise); color: var(--fg); }
.sx-rxpick { display: flex; gap: 2px; padding: 2px; }
.sx-rxpick button { font-size: 1.3rem; width: 40px; height: 40px; border: none; border-radius: 8px; background: transparent; }
.sx-rxpick button:hover { background: var(--raise); }
.sx-compose { border-top: 1px solid var(--line); padding: 10px 16px 14px; display: flex; flex-direction: column; gap: 6px; background: var(--panel); }
.sx-editing { display: flex; justify-content: space-between; align-items: center; font-size: .82rem; color: var(--accent); }
.sx-compose-row { display: flex; gap: 8px; align-items: flex-end; }
.sx-compose textarea { flex: 1; resize: none; min-height: 48px; max-height: 160px; background: var(--raise); color: var(--fg); border: 1px solid var(--line); border-radius: 24px; padding: 12px 18px; font: inherit; }
.sx-compose textarea::placeholder { color: var(--muted); opacity: .75; }
.sx-compose textarea:focus-visible { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.sx-send { width: 48px; height: 48px; flex: none; padding: 0; display: grid; place-items: center; }
.sx-form { display: flex; flex-direction: column; gap: 14px; }
.sx-form .s.ok { color: var(--ok); }
.sx-form-av { display: flex; align-items: center; gap: 12px; }
.sx-avpick { position: relative; width: 96px; height: 96px; border-radius: 50%; border: 2px dashed var(--line); background: var(--accent-soft); color: var(--accent); font-family: var(--f-display); font-weight: 700; font-size: 2rem; display: grid; place-items: center; overflow: hidden; padding: 0; }
.sx-avpick img { width: 100%; height: 100%; object-fit: cover; }
.sx-avpick-l { position: absolute; left: 0; right: 0; bottom: 0; padding: 3px 0; background: var(--shade); color: var(--cap-fg); font-family: var(--f-body); font-size: .7rem; }
.sx-setup, .sx-card { width: min(460px, 100%); }
.sx-setup h2 { margin: 0; font-family: var(--f-display); font-weight: 700; font-size: 1.35rem; }
.sx-card-main { display: flex; align-items: center; gap: 16px; }
.sx-card-name { font-family: var(--f-display); font-weight: 700; font-size: 1.15rem; }
.sx-admin-box summary { cursor: pointer; }
.sx-admin-box input[type=password], .sx-col input[type=text] { width: 100%; background: var(--raise); color: var(--fg); border: 1px solid var(--line); border-radius: 14px; padding: 12px 15px; font: inherit; }
.sx-admin-box input[type=password]:focus-visible { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.sx-pw { position: relative; display: flex; flex: 1 1 180px; min-width: 0; }
.sx-pw input { width: 100%; padding-right: 44px !important; }
.sx-eye { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; display: grid; place-items: center; border: none; border-radius: 8px; background: transparent; color: var(--muted); }
.sx-eye:hover { color: var(--fg); background: var(--line); }
.sx-hash { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.sx-hash code { font-family: var(--f-mono); font-size: .76rem; word-break: break-all; padding: 9px 12px; border-radius: 12px; background: var(--raise); border: 1px solid var(--line); flex: 1 1 260px; }
.sx-toast { position: fixed; right: 16px; top: 76px; z-index: 45; max-width: min(380px, calc(100% - 32px)); padding: 13px 18px; border-radius: 16px; background: var(--panel); border: 1px solid var(--accent); box-shadow: 0 12px 36px var(--overlay); font-size: .9rem; }
.sx-toast.clickable { cursor: pointer; }
.sx-hub:not([hidden]) { animation: wt-fade .16s ease-out; }
.sx-toast:not([hidden]) { animation: wt-rise .2s var(--ease); }
.sx-body > .enter { animation: wt-rise .2s var(--ease); }
.sx-msg.new { animation: wt-rise .22s var(--ease); }
.sx-chatrow, .sx-person { transition: background-color .14s var(--ease); }
#sxCard, #sxSetup { z-index: 35; }
.sx-voice { display: flex; align-items: center; gap: 5px; margin-top: 1px; font-size: .8rem; color: var(--ok); white-space: nowrap; overflow: hidden; }
.sx-voice .ic { display: grid; flex: none; }
.sx-voice > span:last-child { overflow: hidden; text-overflow: ellipsis; }
.sx-same { white-space: nowrap; }
.sx-game { display: block; margin-top: 1px; font-size: .8rem; color: var(--ok); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sx-note { margin-top: 3px; font-size: .9rem; overflow-wrap: anywhere; }
.sx-emo { display: flex; flex-wrap: wrap; gap: 4px; }
.sx-emo button { width: 40px; height: 40px; padding: 0; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 12px; background: var(--raise); font-size: 1.15rem; }
.sx-emo button:hover { border-color: var(--line-2); }
.sx-gamerow { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 7px 8px 7px 14px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line); }
.sx-gamerow > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sx-addgame { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 16px; border: 1px dashed var(--line-2); }
.sx-apps { display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow: auto; }
.sx-app { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--raise); text-align: left; }
.sx-app:hover { border-color: var(--accent); }
.sx-app > span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sx-app > span.s { flex: none; }
.sx-callbtn { width: 38px; height: 38px; flex: none; display: grid; place-items: center; padding: 0; border-radius: 50%; border: 1px solid var(--line-2); background: transparent; color: var(--fg); transition: border-color .14s var(--ease), color .14s var(--ease), transform .1s var(--ease); }
.sx-callbtn:hover:not(:disabled) { border-color: var(--ok); color: var(--ok); }
.sx-callbtn:active:not(:disabled) { transform: scale(.94); }
.sx-callbtn:disabled { opacity: .45; cursor: default; }
.sx-ring { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 16px; background: var(--overlay); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.sx-ring:not([hidden]) { animation: wt-fade .16s ease-out; }
.sx-ring-box { width: min(340px, 100%); display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 26px 22px 22px; border-radius: var(--r-l); background: var(--panel); border: 1px solid var(--line-2); box-shadow: 0 24px 70px var(--overlay); text-align: center; animation: wt-pop .22s var(--ease); }
.sx-ring .s, .sx-callbar .s { color: var(--muted); font-size: .88rem; }
.sx-ring-av { position: relative; display: grid; place-items: center; width: 156px; height: 156px; margin-bottom: 4px; }
.sx-ring-wave { position: absolute; inset: 26px; border-radius: 50%; border: 2px solid var(--ok); animation: sxwave 1.8s ease-out infinite; }
.sx-ring-wave.w2 { animation-delay: .9s; }
@keyframes sxwave { from { transform: scale(1); opacity: .9; } to { transform: scale(1.45); opacity: 0; } }
.sx-ring-name { font-family: var(--f-display); font-weight: 700; font-size: 1.3rem; overflow-wrap: anywhere; }
.sx-ring-acts { display: flex; gap: 10px; margin-top: 16px; width: 100%; }
.sx-ring-acts .btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 10px; border: none; color: var(--on-live); }
.sx-ring-acts .btn:hover { filter: brightness(1.08); }
.sx-ring-no, .sx-cb-end { background: var(--danger) !important; border-color: var(--danger) !important; color: var(--on-live) !important; }
.sx-ring-yes { background: var(--ok); }
.sx-callbar { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 46; display: flex; align-items: center; gap: 12px; max-width: calc(100% - 24px); padding: 7px 7px 7px 9px; border-radius: 999px; background: var(--panel); border: 1px solid var(--ok); box-shadow: 0 12px 36px var(--overlay); }
.sx-callbar:not([hidden]) { animation: wt-toast .2s var(--ease); }
.sx-cb-av { position: relative; display: grid; }
.sx-cb-av::after { content: ""; position: absolute; inset: -3px; border-radius: 50%; border: 2px solid var(--ok); animation: sxwave 1.8s ease-out infinite; }
.sx-cb-t { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.sx-cb-t b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sx-cb-t .s { font-size: .78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.sx-cb-end { display: inline-flex; align-items: center; gap: 6px; flex: none; }
.sx-callmsg { display: flex; width: fit-content; align-items: center; flex-wrap: wrap; gap: 8px 10px; max-width: 100%; margin: 3px 0 2px; padding: 8px 10px 8px 12px; border-radius: 14px; background: var(--raise); border: 1px solid var(--line); }
.sx-callmsg .ic { display: grid; color: var(--muted); }
.sx-callmsg.in .ic { color: var(--danger); }
@media (prefers-reduced-motion: reduce) { .sx-ring-wave, .sx-cb-av::after { animation: none; opacity: .5; } }
@media (max-width: 820px) {
  .sx-chats { grid-template-columns: 1fr; }
  .sx-chats.has-conv .sx-chatlist { display: none; }
  .sx-chats:not(.has-conv) .sx-conv, .sx-chats:not(.has-conv) > .sx-empty { display: none; }
  .sx-back { display: grid; }
  .sx-person { flex-wrap: wrap; }
}`;
    document.head.append(h('style', { id: 'sxStyles' }, css));
  }

  // ---------- public bits used by the call page ----------
  window.RaciaSocial = {
    watchPeer(acc, peerId) {
      let set = peerWatch.get(acc);
      if (!set) peerWatch.set(acc, (set = new Set()));
      set.add(peerId);
      if (S.user) { watchUser(acc); updatePeers(acc); }
    },
    openProfile,
    open(tab) {
      if (!S.me) { show(false); toast('Войди в аккаунт на главном экране Walkie-Talkie'); return; }
      if (tab) S.tab = tab;
      show(true);
    }
  };

  // For troubleshooting from the console (F12) with ?debug: window.__raciaSocial
  if (/[?&]debug\b/.test(location.search)) window.__raciaSocial = S;

  // ---------- start ----------
  injectStyles();
  buildShell();
  S.user = undefined;
  renderAcct();
  setInterval(() => {
    if (S.me) { for (const u of S.watched) watchPresence(u); }
    for (const acc of peerWatch.keys()) updatePeers(acc);
    if (S.me) renderAll();
  }, 30000);
  fb().then(() => {
    if (TEST) onUser({ uid: TEST.uid, email: TEST.uid + '@test.local', displayName: TEST.name || '', photoURL: '' });
    else S.F.A.onAuthStateChanged(S.F.auth, onUser);
    if (APP.pendingLink) APP.pendingLink().then((l) => { if (l) setTimeout(() => openLink(l), 1500); }).catch(() => {});
    if (APP.onLink) APP.onLink(openLink);
  }).catch((e) => { S.loadErr = String((e && e.message) || e); renderAcct(); });
})();
