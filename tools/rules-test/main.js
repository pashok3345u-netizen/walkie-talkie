// Rules test: checks a firestore.rules file in the local Firestore emulator before it goes to Firebase.
// The real database is never touched. The checks (tests.js) run in a hidden window with the same
// Firebase SDK the app uses, doing exactly what the app does: old versions' actions and the new ones.
//
//   java -jar cloud-firestore-emulator-v*.jar --host 127.0.0.1 --port 8085 --project_id demo-wt
//   electron.exe <this dir> --rules=<firestore.rules> [--emu=127.0.0.1:8085] [--out=<result.json>]
//     [--old=1]   the rules are the OLD ones: what the new version adds must be refused (and nothing else breaks)
//     [--slow=1]  also the checks that need waiting (a call can't be answered after 60 s)
//
// The rules stay private (admin e-mails): this script reads the admin e-mails from the rules file itself,
// and if the password hash is still the PASSWORD_HASH placeholder it puts in a test password's hash.
'use strict';
const { app, BrowserWindow } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const RULES = arg('rules');
const EMU = arg('emu', '127.0.0.1:8085');
const OUT = arg('out', path.join(require('os').tmpdir(), 'wt-rules-test.json'));
const OLD = arg('old', '0') === '1';
const SLOW = arg('slow', '0') === '1';
const PROJECT = 'demo-wt';
const TEST_PASS = 'rules-test-password-123';

function fail(msg) { console.error(msg); app.exit(2); }

app.whenReady().then(async () => {
  if (!RULES || !fs.existsSync(RULES)) return fail('no --rules file');
  let rules = fs.readFileSync(RULES, 'utf8');
  const emails = ((/email in \[([^\]]*)\]/.exec(rules) || [])[1] || '').match(/'[^']+'/g) || [];
  if (!emails.length) return fail('no admin e-mails found in the rules');
  if (rules.includes("'PASSWORD_HASH'")) rules = rules.replace("'PASSWORD_HASH'", "'" + crypto.createHash('sha256').update(TEST_PASS).digest('hex') + "'");

  const base = 'http://' + EMU;
  let r = await fetch(base + '/emulator/v1/projects/' + PROJECT + ':securityRules', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: rules }] } })
  });
  if (!r.ok) return fail('the emulator did not accept the rules:\n' + await r.text());
  r = await fetch(base + '/emulator/v1/projects/' + PROJECT + '/databases/(default)/documents', { method: 'DELETE' });
  if (!r.ok) return fail('could not clear the emulator: ' + r.status);

  const page = fs.readFileSync(path.join(__dirname, 'tests.js'), 'utf8');
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && u.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><meta charset="utf-8"><title>rules test</title><script type="module" src="/tests.js"></script>');
    } else if (req.method === 'GET' && u.pathname === '/tests.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(page);
    } else if (req.method === 'POST' && u.pathname === '/result') {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        res.writeHead(200); res.end('ok');
        let d; try { d = JSON.parse(body); } catch (e) { return fail('bad result'); }
        fs.writeFileSync(OUT, JSON.stringify(d, null, 2));
        const bad = d.results.filter((x) => !x.pass);
        for (const x of d.results) console.log((x.pass ? 'ok   ' : 'FAIL ') + '[' + x.group + '] ' + x.name + (x.pass ? '' : '  — got: ' + x.got));
        if (d.error) console.log('ERROR ' + d.error);
        console.log('\n' + (d.results.length - bad.length) + ' of ' + d.results.length + ' passed' + (OLD ? ' (old rules)' : ''));
        app.exit(bad.length || d.error ? 1 : 0);
      });
    } else { res.writeHead(404); res.end(); }
  });
  server.listen(0, '127.0.0.1', () => {
    const q = new URLSearchParams({ emu: EMU, admin: emails[0].slice(1, -1), pass: TEST_PASS, old: OLD ? '1' : '0', slow: SLOW ? '1' : '0' });
    const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true } });
    win.webContents.on('console-message', (e) => { const m = e.message || ''; if (/^STEP /.test(m) || /error|uncaught/i.test(m)) console.log('[page] ' + m); });
    win.loadURL('http://127.0.0.1:' + server.address().port + '/?' + q);
  });
  setTimeout(() => fail('timed out'), (SLOW ? 6 : 4) * 60 * 1000);
});
