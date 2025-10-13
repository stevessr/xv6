#!/usr/bin/env python3
"""Fetch remote MIT pages and update local docs.

Usage: run this script from the repo root. It reads scripts/mappings.json and
for each mapping fetches the url, extracts the main content, converts it to
markdown and writes to the local path. If preserve_front_matter is true, it
keeps existing YAML front-matter in the target file.
"""
import json
import pathlib
import sys
from typing import Optional

try:
    import requests
except Exception:
    requests = None

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

try:
    import html2text
except Exception:
    html2text = None
    
import urllib.request
import re


ROOT = pathlib.Path(__file__).resolve().parents[1]
MAPPINGS = ROOT / 'scripts' / 'mappings.json'


def read_front_matter(p: pathlib.Path) -> Optional[str]:
    if not p.exists():
        return None
    txt = p.read_text(encoding='utf-8')
    if txt.startswith('---'):
        parts = txt.split('---', 2)
        if len(parts) >= 3:
            return '---' + parts[1] + '---\n'
    return None


def extract_main_html(html: str) -> str:
    """Extract main content from MIT page.

    Try to use BeautifulSoup if available, otherwise fall back to regex-based
    extraction: look for <main>...</main>, then <article>, then <div id="content">,
    finally return whole HTML.
    """
    if BeautifulSoup:
        soup = BeautifulSoup(html, 'html.parser')
        main = soup.find('main') or soup.find('article')
        if main:
            return str(main)
        # pick largest div or section by text length
        candidates = soup.find_all(['div', 'section'])
        if not candidates:
            return html
        best = max(candidates, key=lambda t: len(t.get_text() or ''))
        return str(best)

    # fallback: regex search
    m = re.search(r'<main\b[^>]*>(.*?)</main>', html, flags=re.S | re.I)
    if m:
        return m.group(0)
    m = re.search(r'<article\b[^>]*>(.*?)</article>', html, flags=re.S | re.I)
    if m:
        return m.group(0)
    m = re.search(r'<div[^>]*id=["\']?content["\']?[^>]*>(.*?)</div>', html, flags=re.S | re.I)
    if m:
        return m.group(0)
    return html


def html_to_markdown(html: str) -> str:
    if html2text:
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.body_width = 0
        return h.handle(html)
    # fallback: return HTML wrapped in a single block so markdown renderers
    # will show the content. Add a note that content is raw HTML.
    return '\n<!-- source: inserted raw HTML -->\n' + html + '\n'


def update_mapping(url: str, local_path: str, preserve_front_matter: bool):
    print(f'Fetching {url}...')
    content = None
    try:
        if requests:
            r = requests.get(url, timeout=20)
            r.raise_for_status()
            content = r.text
        else:
            with urllib.request.urlopen(url, timeout=20) as resp:
                content = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        # Don't abort the whole run for a single missing or failing URL.
        print(f'Warning: failed to fetch {url}: {e}')
        return
    main_html = extract_main_html(content)
    md = html_to_markdown(main_html)

    target = ROOT / local_path
    target.parent.mkdir(parents=True, exist_ok=True)

    fm = read_front_matter(target) if preserve_front_matter else None
    if fm:
        out = fm + '\n' + md
    else:
        out = md

    target.write_text(out, encoding='utf-8')
    print('Wrote', target)


def main():
    if not MAPPINGS.exists():
        print('Missing mappings.json at', MAPPINGS)
        sys.exit(1)
    mappings = json.loads(MAPPINGS.read_text(encoding='utf-8'))
    for m in mappings:
        update_mapping(m['url'], m['local_path'], m.get('preserve_front_matter', True))


if __name__ == '__main__':
    main()
