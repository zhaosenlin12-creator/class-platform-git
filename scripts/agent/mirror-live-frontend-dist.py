import hashlib
import re
import shutil
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import requests


BASE_URL = 'https://class.codebn.cn/'
ROOT = Path(__file__).resolve().parents[2]
DIST_DIR = ROOT / 'web' / 'dist'
BACKUP_DIR = ROOT / 'web' / 'dist.pre-live-sync-backup'


CSS_URL_PATTERN = re.compile(r'url\((["\']?)([^)"\']+)\1\)', re.IGNORECASE)


def should_skip_asset(asset_path: str) -> bool:
    if not asset_path:
        return True
    if asset_path.startswith('data:'):
        return True
    if asset_path.startswith('javascript:'):
        return True
    if asset_path.startswith('#'):
        return True
    return False


def normalize_path(asset_url: str) -> str:
    parsed = urlparse(asset_url)
    path = parsed.path or '/'
    if path == '/':
        path = '/index.html'
    return path


def local_target_for(asset_url: str) -> Path:
    path = normalize_path(asset_url).lstrip('/')
    return DIST_DIR / path


class AssetHtmlParser(HTMLParser):
    def __init__(self, current_url: str):
        super().__init__()
        self.current_url = current_url
        self.assets = set()

    def handle_starttag(self, tag, attrs):
        if tag.lower() not in {'script', 'link', 'img', 'source'}:
            return
        for key, value in attrs:
            if key.lower() in {'src', 'href'} and value and not should_skip_asset(value):
                self.assets.add(urljoin(self.current_url, value))


def fetch_bytes(session: requests.Session, asset_url: str) -> bytes:
    response = session.get(asset_url, timeout=60)
    response.raise_for_status()
    return response.content


def extract_assets(text: str, current_url: str) -> set[str]:
    parser = AssetHtmlParser(current_url)
    parser.feed(text)
    assets = set(parser.assets)
    for quote, match in CSS_URL_PATTERN.findall(text):
        if should_skip_asset(match):
            continue
        assets.add(urljoin(current_url, match))

    return assets


def backup_existing_dist():
    if BACKUP_DIR.exists():
        if BACKUP_DIR.is_dir():
            shutil.rmtree(BACKUP_DIR)
        else:
            BACKUP_DIR.unlink()

    if DIST_DIR.exists():
        shutil.move(str(DIST_DIR), str(BACKUP_DIR))

    DIST_DIR.mkdir(parents=True, exist_ok=True)


def restore_local_config():
    backup_config = BACKUP_DIR / 'config.js'
    target_config = DIST_DIR / 'config.js'
    if backup_config.exists():
        target_config.write_bytes(backup_config.read_bytes())


def main():
    backup_existing_dist()

    session = requests.Session()
    pending = {urljoin(BASE_URL, '/index.html')}
    visited = set()
    written = []

    while pending:
        current_url = pending.pop()
        if current_url in visited:
            continue
        visited.add(current_url)

        content = fetch_bytes(session, current_url)
        target = local_target_for(current_url)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        written.append(target)

        if target.suffix.lower() in {'.html', '.css'}:
            try:
                text = content.decode('utf-8')
            except UnicodeDecodeError:
                text = content.decode('utf-8', errors='ignore')
            for asset_url in extract_assets(text, current_url):
                if urlparse(asset_url).netloc == urlparse(BASE_URL).netloc:
                    pending.add(asset_url)

    restore_local_config()

    manifest = {
        'base_url': BASE_URL,
        'downloaded_files': len(written),
        'index_hash': hashlib.sha256((DIST_DIR / 'index.html').read_bytes()).hexdigest(),
        'files': [str(path.relative_to(DIST_DIR)).replace('\\', '/') for path in sorted(written)]
    }

    manifest_path = ROOT / 'release' / 'live-frontend-mirror-manifest.json'
    manifest_path.write_text(str(manifest), encoding='utf-8')
    print(manifest_path)


if __name__ == '__main__':
    main()
