#!/usr/bin/env python3
"""Fetch https://pdos.csail.mit.edu/6.828/2025/lec/ and add discovered lecture HTML pages to scripts/mappings.json.

This script will:
- fetch the lec/ index page
- extract links to .html pages under /6.828/2025/lec/
- add mappings to scripts/mappings.json for each discovered page, mapping to
  docs/mit6.1810/lec/<name>.md and preserving front-matter
- avoid adding duplicates
"""
from pathlib import Path
import json
import sys

try:
    import requests
    from bs4 import BeautifulSoup
except Exception as e:
    print('This script requires requests and bs4 installed in the active Python environment.', e)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
MAPPINGS = ROOT / 'scripts' / 'mappings.json'
BASE = 'https://pdos.csail.mit.edu/6.828/2025/'
LEC_INDEX = BASE + 'lec/'

def load_mappings():
    if MAPPINGS.exists():
        return json.loads(MAPPINGS.read_text(encoding='utf-8'))
    return []

def save_mappings(data):
    MAPPINGS.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')

def collect_from_index(index_url):
    """Return set of absolute URLs of files (txt/html/md) and directories under index_url."""
    r = requests.get(index_url, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, 'html.parser')
    found = set()
    for a in soup.find_all('a', href=True):
        href = a['href']
        # skip parent dir
        if href in ('../', '/2025/'):
            continue
        # normalize
        if href.startswith('http'):
            url = href
        elif href.startswith('/'):
            url = BASE.rstrip('/') + href
        else:
            url = index_url.rstrip('/') + '/' + href
        # only consider links under lec
        if '/6.828/2025/lec/' not in url:
            # allow subdirectories that are relative
            if '/6.828/2025/' in url:
                pass
            else:
                continue
        found.add(url)
    return found


def main():
    print('Fetching lec index:', LEC_INDEX)
    try:
        initial = collect_from_index(LEC_INDEX)
    except Exception as e:
        print('Failed to fetch lec index:', e)
        return

    # expand directories: if a link ends with '/', fetch it and collect children
    all_urls = set()
    for url in sorted(initial):
        all_urls.add(url)
        if url.rstrip().endswith('/'):
            try:
                children = collect_from_index(url)
                for c in children:
                    all_urls.add(c)
            except Exception:
                continue

    # filter to files of interest: .txt, .html, .md
    file_urls = [u for u in all_urls if any(u.lower().endswith(ext) for ext in ('.txt', '.html', '.md'))]
    print('Discovered', len(file_urls), 'lecture files (txt/html/md)')

    mappings = load_mappings()
    existing_urls = {m['url'] for m in mappings}
    added = 0
    for url in sorted(file_urls):
        if url in existing_urls:
            continue
        # derive local path
        parts = url.split('/6.828/2025/')[1]
        local_path = 'docs/mit6.1810/' + parts
        # normalize extensions to .md
        if local_path.endswith('.txt') or local_path.endswith('.html') or local_path.endswith('.md'):
            local_path = local_path.rsplit('.', 1)[0] + '.md'
        mappings.append({'url': url, 'local_path': local_path, 'preserve_front_matter': True})
        added += 1

    if added:
        save_mappings(mappings)
        print('Added', added, 'mappings to', MAPPINGS)
    else:
        print('No new mappings added')

if __name__ == '__main__':
    main()
