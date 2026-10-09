# Publishes a Walkie-Talkie version into the GitHub repo folder:
#   update.json        — what the program checks (version, engine, notes, files + SHA-256)
#   v<N>/<files>       — the files the program downloads (everything in app/ except the installer-only ones)
#   Walkie-Talkie.zip  — the installer for new people
# usage: python3 release.py <package dir with install.bat + app/> <repo dir> "<notes>"
import hashlib, json, os, shutil, sys, zipfile
PKG, REPO, NOTES = sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else ''
APP = os.path.join(PKG, 'app')
ver = json.load(open(os.path.join(APP, 'version.json')))
V, ENGINE = ver['version'], ver['engine']
FIXED = {'loader.js', 'package.json', 'version.json'}   # only the installer puts these
files = {}
for old in os.listdir(REPO):
    if old.startswith('v') and old[1:].isdigit() and int(old[1:]) != V:
        shutil.rmtree(os.path.join(REPO, old))           # keep only the newest version's files
vdir = os.path.join(REPO, 'v%d' % V)
shutil.rmtree(vdir, ignore_errors=True); os.makedirs(vdir)
for f in sorted(os.listdir(APP)):
    if f in FIXED or f.endswith('.exe'): continue
    b = open(os.path.join(APP, f), 'rb').read()
    open(os.path.join(vdir, f), 'wb').write(b)
    files[f] = hashlib.sha256(b).hexdigest()
json.dump({'version': V, 'minEngine': ENGINE, 'notes': NOTES, 'files': files},
          open(os.path.join(REPO, 'update.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
z = zipfile.ZipFile(os.path.join(REPO, 'Walkie-Talkie.zip'), 'w', zipfile.ZIP_DEFLATED)
for root, dirs, fs in os.walk(PKG):
    for f in sorted(fs):
        full = os.path.join(root, f)
        z.write(full, os.path.relpath(full, PKG))
z.close()
print('version', V, 'files', len(files), 'zip', os.path.getsize(os.path.join(REPO, 'Walkie-Talkie.zip')))
