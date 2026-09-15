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
        for key, expected, indent in [('name', name, ''), ('version', version, '  '), ('author', 'AIπ', '  ')]:
            if not re.search(rf'^{indent}{key}: [\"]?{re.escape(expected)}[\"]?$', frontmatter[1], re.M):
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
        skill_text = (folder / 'SKILL.md').read_text()
        def field(key, indent=''):
            match = re.search(rf'^{indent}{re.escape(key)}: (.+)$', frontmatter[1], re.M)
            if not match:
                raise ValueError(f'{name}: missing packaging field {key}')
            return match[1].strip('"')
        workbuddy_fields = {
            'display_name': field('display_name', '  '),
            'description_zh': field('description'),
            'description_en': field('description_en', '  '),
            'version': version,
            'author': field('author', '  '),
        }
        workbuddy_text = '---\n' + ''.join(f'{key}: {value}\n' for key, value in workbuddy_fields.items()) + skill_text[4:]
        assert workbuddy_text.split('\n---\n', 1)[1] == skill_text.split('\n---\n', 1)[1]
        variant_contents = []
        for layout in ('flat', 'claude'):
            prefix = f'{name}/' if layout == 'claude' else ''
            suffix = '-claude' if layout == 'claude' else ''
            archive = DEST / f'{name}{suffix}.zip'
            contents = {}
            with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipped:
                for file in files:
                    rel = file.relative_to(folder).as_posix()
                    data = workbuddy_text.encode('utf-8') if layout == 'flat' and rel == 'SKILL.md' else file.read_bytes()
                    info = zipfile.ZipInfo(prefix + rel, date_time=(2026, 1, 1, 0, 0, 0))
                    info.create_system = 3
                    info.external_attr = 0o100644 << 16
                    info.compress_type = zipfile.ZIP_DEFLATED
                    zipped.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
                    contents[prefix + rel] = digest(data)
            with zipfile.ZipFile(archive) as zipped:
                assert zipped.testzip() is None
                assert {prefix + item for item in ROOT_FILES}.issubset(zipped.namelist())
                assert set(zipped.namelist()) == set(contents)
                if layout == 'claude':
                    assert all(item.startswith(prefix) for item in zipped.namelist())
                    assert 'SKILL.md' not in zipped.namelist()
                for rel, expected in contents.items():
                    assert digest(zipped.read(rel)) == expected
                expected_skill = workbuddy_text if layout == 'flat' else skill_text
                assert zipped.read(prefix + 'SKILL.md').decode('utf-8') == expected_skill
                variant_contents.append({rel[len(prefix):]: digest(zipped.read(rel)) for rel in zipped.namelist() if rel != prefix + 'SKILL.md'})
                with tempfile.TemporaryDirectory(prefix='aipi-package-') as scratch:
                    zipped.extractall(scratch)
                    entry = 'engine.mjs' if name == 'aipi-film-study' else 'export.mjs'
                    skill_root = Path(scratch) / name if layout == 'claude' else Path(scratch)
                    result = subprocess.run(['node', str(skill_root / 'scripts' / entry), '--help'], capture_output=True, text=True, timeout=20)
                    if result.returncode != 0 or 'AIπ' not in result.stdout:
                        raise RuntimeError(f'{name}: extracted {layout} CLI failed: {result.stderr}')
            manifest['packages'].append({'id': name, 'layout': layout, 'metadataFormat': 'workbuddy' if layout == 'flat' else 'agent-skills', 'file': archive.name, 'bytes': archive.stat().st_size, 'sha256': digest(archive.read_bytes()), 'contents': contents, 'extractedCLI': 'passed'})
        assert variant_contents[0] == variant_contents[1], f'{name}: archive variants changed executable resources'
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (DEST / 'SHA256SUMS').write_text(''.join(f"{item['sha256']}  {item['file']}\n" for item in manifest['packages']))
    print(json.dumps({'version': version, 'archives': [{'file': p['file'], 'bytes': p['bytes'], 'sha256': p['sha256']} for p in manifest['packages']]}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    build()
