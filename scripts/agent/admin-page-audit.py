import json
import os
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
LOGIN_SCRIPT = ROOT / 'scripts' / 'agent' / 'captcha-login.js'
ADMIN_USER = 'admin'
ADMIN_PASS = 'zsl13177068887'
TARGETS = [
    '/admin/class-management',
    '/admin/student-management',
    '/admin/course-content-admin',
    '/admin/homework-assignment',
    '/admin/homework-template'
]
BASES = {
    'local': 'http://localhost:8081',
    'live': 'https://class.codebn.cn'
}


def login(base):
    completed = subprocess.run(
        ['node', str(LOGIN_SCRIPT), ADMIN_USER, ADMIN_PASS],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
        check=True,
        env={**os.environ, 'AUDIT_API_BASE_URL': base}
    )
    payload = json.loads(completed.stdout)
    return payload['login']['result']


def build_storage_payload(login_result):
    expire = int((time.time() + 7 * 24 * 60 * 60) * 1000)
    user_info = login_result['userInfo']
    role = login_result['role']
    return {
        'pro__Access-Token': {'value': login_result['token'], 'expire': expire},
        'pro__Login_Username': {'value': user_info['username'], 'expire': expire},
        'pro__Login_Userinfo': {'value': user_info, 'expire': expire},
        'pro__Login_UserRole': {'value': role, 'expire': expire}
    }


def build_init_script(login_result):
    payload = build_storage_payload(login_result)
    return f"""
(() => {{
  const payload = {json.dumps(payload, ensure_ascii=False)};
  Object.entries(payload).forEach(([key, value]) => {{
    localStorage.setItem(key, JSON.stringify(value));
  }});
}})();
"""


def compact_text(text, limit=1500):
    return '\n'.join(line.strip() for line in text.splitlines() if line.strip())[:limit]


def visible_texts(locator, limit=30):
    values = []
    count = min(locator.count(), limit)
    for index in range(count):
        try:
            node = locator.nth(index)
            if node.is_visible(timeout=1000):
                text = node.inner_text(timeout=2000).strip()
                if text:
                    values.append(text)
        except Exception:
            continue
    result = []
    seen = set()
    for value in values:
        if value not in seen:
            result.append(value)
            seen.add(value)
    return result


def summarize(page, url):
    page.goto(url, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(1500)
    body = page.locator('body').inner_text(timeout=10000)
    summary = {
        'url': page.url,
        'title': page.title(),
        'body_sample': compact_text(body),
        'buttons': visible_texts(page.locator('button, .ant-btn, [role="button"]')),
        'table_rows': []
    }

    rows = page.locator('.ant-table-tbody tr')
    for index in range(min(rows.count(), 4)):
        try:
            row = rows.nth(index)
            columns = row.locator('td')
            cells = []
            for col_index in range(min(columns.count(), 10)):
                cells.append(columns.nth(col_index).inner_text(timeout=2000).strip())
            summary['table_rows'].append({
                'cells': cells,
                'buttons': visible_texts(row.locator('button, .ant-btn, [role="button"]'), 12)
            })
        except Exception:
            continue

    return summary


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    report = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for env_name, base in BASES.items():
            login_result = login(base)
            context = browser.new_context(viewport={'width': 1440, 'height': 900})
            context.add_init_script(build_init_script(login_result))
            page = context.new_page()
            report[env_name] = {}
            for target in TARGETS:
                try:
                    report[env_name][target] = summarize(page, base + target)
                except Exception as error:
                    report[env_name][target] = {'error': str(error)}
            context.close()
        browser.close()

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
