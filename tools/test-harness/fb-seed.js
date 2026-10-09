// Fills the local Firestore emulator for test copies started with --fb (the real database is never touched):
// loads the rules, wipes everything, makes profiles and friendships.
//   set ELECTRON_RUN_AS_NODE=1
//   electron.exe fb-seed.js --emu=127.0.0.1:8085 --rules=<firestore.rules>
//     --users=alice:Алиса,bob:Боб[,carl:Карл] [--friends=alice+bob,alice+carl] [--avatars=1]
// A user "alice" gets the uid "alice" padded with zeros to 28 characters (like a real one) and the tag "alice".
// Prints the uids as JSON.
'use strict';
const fs = require('fs');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const EMU = arg('emu', '127.0.0.1:8085');
const PROJECT = 'walkie-talkie-01';
const BASE = 'http://' + EMU + '/v1/projects/' + PROJECT + '/databases/(default)/documents/';
const uidOf = (key) => (key + '0'.repeat(28)).slice(0, 28);
const pair = (a, b) => (a < b ? a + '_' + b : b + '_' + a);

function val(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
}
async function put(docPath, data) {
  const r = await fetch(BASE + docPath, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, val(v)])) })
  });
  if (!r.ok) throw new Error(docPath + ': ' + r.status + ' ' + await r.text());
}
// A tiny one-colour avatar (8×8 PNG, scaled up by the app), so the screens look like real ones.
function avatar(i) {
  const zlib = require('zlib');
  const colors = [[124, 92, 240], [39, 121, 184], [176, 55, 154], [19, 115, 74], [217, 29, 92]];
  const [r, g, b] = colors[i % colors.length];
  const raw = Buffer.alloc(8 * (1 + 8 * 3));
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const o = y * 25 + 1 + x * 3, k = (x + y) / 14;
    raw[o] = r + (255 - r) * k * 0.5; raw[o + 1] = g + (255 - g) * k * 0.5; raw[o + 2] = b + (255 - b) * k * 0.5;
  }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const t = Buffer.from(type); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(8, 0); ihdr.writeUInt32BE(8, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + png.toString('base64');
}

(async () => {
  const rules = fs.readFileSync(arg('rules'), 'utf8');
  let r = await fetch('http://' + EMU + '/emulator/v1/projects/' + PROJECT + ':securityRules', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: rules }] } })
  });
  if (!r.ok) throw new Error('rules: ' + await r.text());
  r = await fetch('http://' + EMU + '/emulator/v1/projects/' + PROJECT + '/databases/(default)/documents', { method: 'DELETE' });
  if (!r.ok) throw new Error('wipe: ' + r.status);
  const out = {};
  const users = arg('users', '').split(',').filter(Boolean);
  for (const [i, u] of users.entries()) {
    const [key, name] = u.split(':');
    const uid = uidOf(key);
    out[key] = uid;
    await put('tags/' + key, { uid });
    const p = { name: name || key, tag: key, createdAt: new Date() };
    if (arg('avatars') === '1') p.avatar = avatar(i);
    await put('users/' + uid, p);
  }
  for (const f of arg('friends', '').split(',').filter(Boolean)) {
    const [a, b] = f.split('+').map(uidOf);
    await put('friends/' + pair(a, b), { users: [a, b], from: a, status: 'accepted', at: new Date() });
  }
  console.log(JSON.stringify(out));
})().catch((e) => { console.error(String(e && e.message || e)); process.exit(1); });
