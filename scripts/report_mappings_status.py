#!/usr/bin/env python3
"""Report status of scripts/mappings.json: how many mappings, how many local files exist, and list missing remote URLs."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAPPINGS = ROOT / 'scripts' / 'mappings.json'

def main():
    if not MAPPINGS.exists():
        print('mappings.json not found at', MAPPINGS)
        return
    m = json.loads(MAPPINGS.read_text(encoding='utf-8'))
    total = len(m)
    existing = 0
    missing = []
    for e in m:
        p = ROOT / e['local_path']
        if p.exists():
            existing += 1
        else:
            missing.append(e['url'])
    print('total mappings:', total)
    print('files exist locally:', existing)
    print('missing locally:', len(missing))
    print('\nfirst 20 missing remote URLs:')
    for u in missing[:20]:
        print(u)

if __name__ == '__main__':
    main()
