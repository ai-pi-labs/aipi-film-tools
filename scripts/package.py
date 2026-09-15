#!/usr/bin/env python3
"""Build reproducible standalone skill archives using the Python standard library."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'dist'
SKILLS = ('aipi-film-study', 'aipi-sync-video')
ROOT_FILES = {'SKILL.md', 'LICENSE', 'RIGHTS.txt'}
SOURCE_DIRS = {'scripts', 'ui', 'references', 'tests'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build():
    DEST.mkdir(exist_ok=True)
    version = json.loads((ROOT / 'package.json').read_text())['version']
    license_bytes = (ROOT / 'LICENSE').read_bytes()
    manifest = {'project': 'AIπ｜AI圆周派', 'version': version, 'license': 'MIT', 'packages': []}
    for name in SKILLS:
        folder = ROOT / 'skills' / name
        frontmatter = re.match(r'^---\n(.*?)\n---', (folder / 'SKILL.md').read_text(), re.S)
        if not frontmatter:
            raise ValueError(f'{name}: missing skill metadata')
        for key, expected in [('name', name), ('version', version), ('author', 'AIπ')]:
            if not re.search(rf'^{key}: {re.escape(expected)}$', frontmatter[1], re.M):
                raise ValueError(f'{name}: inconsistent {key}')
        if (folder / 'LICENSE').read_bytes() != license_bytes:
            raise ValueError(f'{name}: standalone license differs from repository license')
        files = []
        for file in sorted(folder.rglob('*')):
            if file.is_symlink():
                raise ValueError(f'Unexpected symlink: {file.relative_to(ROOT)}')
            if not file.is_file():
                continue
            rel = file.relative_to(folder)
            if rel.as_posix() in ROOT_FILES or (len(rel.parts) > 1 and rel.parts[0] in SOURCE_DIRS):
                if any(part.startswith('.') or part in {'__pycache__', 'node_modules', 'work', 'outputs', 'browser-profile'} for part in rel.parts):
                    continue
                files.append(file)
        archive = DEST / f'{name}.zip'
        contents = {}
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipped:
            for file in files:
                rel = file.relative_to(folder).as_posix()
                data = file.read_bytes()
                info = zipfile.ZipInfo(rel, date_time=(2026, 1, 1, 0, 0, 0))
                info.create_system = 3
                info.external_attr = 0o100644 << 16
                info.compress_type = zipfile.ZIP_DEFLATED
                zipped.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
                contents[rel] = digest(data)
        with zipfile.ZipFile(archive) as zipped:
            assert zipped.testzip() is None
            assert ROOT_FILES.issubset(zipped.namelist())
            for rel, expected in contents.items():
                assert digest(zipped.read(rel)) == expected
            with tempfile.TemporaryDirectory(prefix='aipi-package-') as scratch:
                zipped.extractall(scratch)
                entry = 'engine.mjs' if name == 'aipi-film-study' else 'export.mjs'
                result = subprocess.run(['node', str(Path(scratch) / 'scripts' / entry), '--help'], capture_output=True, text=True, timeout=20)
                if result.returncode != 0 or 'AIπ' not in result.stdout:
                    raise RuntimeError(f'{name}: extracted CLI failed: {result.stderr}')
        manifest['packages'].append({'id': name, 'file': archive.name, 'bytes': archive.stat().st_size, 'sha256': digest(archive.read_bytes()), 'contents': contents, 'extractedCLI': 'passed'})
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (DEST / 'SHA256SUMS').write_text(''.join(f"{item['sha256']}  {item['file']}\n" for item in manifest['packages']))
    print(json.dumps({'version': version, 'archives': [{'file': p['file'], 'bytes': p['bytes'], 'sha256': p['sha256']} for p in manifest['packages']]}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build()
