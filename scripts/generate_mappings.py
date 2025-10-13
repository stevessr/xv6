#!/usr/bin/env python3
"""Generate scripts/mappings.json by scanning docs/mit6.1810 for .md files.

Rules:
- Skip any path that has a '/zh/' component.
- Skip files named 'index.md' at the root of mit6.1810 or any folder (these often map to directory index pages but remote site may not need them).
- Map local 'docs/mit6.1810/<path>.md' to 'https://pdos.csail.mit.edu/6.828/2025/<path>.html'
- Preserve existing front-matter by default.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MIT_DIR = ROOT / 'docs' / 'mit6.1810'
OUT = ROOT / 'scripts' / 'mappings.json'

if not MIT_DIR.exists():
    print('Directory not found:', MIT_DIR)
    sys.exit(1)

entries = []
for p in sorted(MIT_DIR.rglob('*.md')):
    rel = p.relative_to(MIT_DIR)
    # skip zh directories
    if 'zh' in rel.parts:
        continue
    name = rel.name.lower()
    if name == 'index.md':
        # skip top-level and folder index files
        continue
    # build remote path: use POSIX style
    remote_path = '/'.join(rel.with_suffix('.html').parts)
    url = f'https://pdos.csail.mit.edu/6.828/2025/{remote_path}'
    entries.append({
        'url': url,
        'local_path': str((pathlib.Path('docs') / 'mit6.1810' / rel).as_posix()),
        'preserve_front_matter': True,
    })

OUT.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding='utf-8')
print('Wrote', OUT, 'with', len(entries), 'entries')
