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
    '/portal/home',
    '/admin/course',
    '/admin/course-content-admin',
    '/admin/classroom-manager'
]
HOME_ACTIONS = ['课程中心', '作品资源库', '乐启宠物', 'AI互动课堂', 'Python冒险岛']
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


def compact_body_text(page, limit=800):
    text = page.locator('body').inner_text(timeout=10000)
    compact = '\n'.join(line.strip() for line in text.splitlines() if line.strip())
    return compact[:limit]


def visible_texts(locator, limit=20):
    values = []
    count = min(locator.count(), limit)
    for index in range(count):
        try:
            item = locator.nth(index)
            if item.is_visible(timeout=1000):
                text = item.inner_text(timeout=2000).strip()
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


def summarize_page(page, url):
    page.goto(url, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(1500)
    summary = {
        'url': page.url,
        'title': page.title(),
        'body_sample': compact_body_text(page),
        'buttons': visible_texts(page.locator('button, .ant-btn, [role="button"]'), 50),
        'links': [],
        'table_rows': []
    }

    links = page.locator('a[href]')
    for index in range(min(links.count(), 20)):
        try:
            node = links.nth(index)
            text = node.inner_text(timeout=2000).strip()
            href = node.get_attribute('href')
            if text or href:
                summary['links'].append({'text': text, 'href': href})
        except Exception:
            continue

    rows = page.locator('.ant-table-tbody tr')
    for index in range(min(rows.count(), 3)):
        try:
            row = rows.nth(index)
            cells = []
            columns = row.locator('td')
            for cell_index in range(min(columns.count(), 10)):
                cells.append(columns.nth(cell_index).inner_text(timeout=2000).strip())
            summary['table_rows'].append({
                'cells': cells,
                'buttons': visible_texts(row.locator('button, .ant-btn, [role="button"]'), 12)
            })
        except Exception:
            continue

    return summary


def click_home_action(page, context, base, label):
    page.goto(base + '/portal/home', wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(1200)
    result = {'label': label, 'before_url': page.url}

    locator = page.locator(
        f'a:has-text("{label}"), button:has-text("{label}"), .ant-btn:has-text("{label}"), *:has-text("{label}")'
    ).first

    try:
        locator.wait_for(state='visible', timeout=8000)
    except Exception as error:
        result['error'] = f'not_found: {error}'
        return result

    before_page_count = len(context.pages)
    try:
        locator.click(timeout=8000, force=True)
    except Exception as error:
        result['error'] = f'click_failed: {error}'
        return result

    page.wait_for_timeout(2500)
    result['after_url'] = page.url

    if len(context.pages) > before_page_count:
        popup = context.pages[-1]
        try:
            popup.wait_for_load_state('domcontentloaded', timeout=10000)
        except Exception:
            pass
        result['popup_url'] = popup.url
        try:
            result['popup_title'] = popup.title()
        except Exception:
            result['popup_title'] = None
        popup.close()

    return result


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
            console_errors = []
            http_errors = []

            page.on(
                'console',
                lambda message, bucket=console_errors: bucket.append({
                    'type': message.type,
                    'text': message.text
                }) if message.type == 'error' else None
            )
            page.on(
                'response',
                lambda response, bucket=http_errors: bucket.append({
                    'status': response.status,
                    'url': response.url
                }) if response.status >= 400 else None
            )

            report[env_name] = {
                'base': base,
                'pages': {},
                'home_clicks': []
            }

            for target in TARGETS:
                try:
                    report[env_name]['pages'][target] = summarize_page(page, base + target)
                except Exception as error:
                    report[env_name]['pages'][target] = {'error': str(error)}

            for label in HOME_ACTIONS:
                try:
                    report[env_name]['home_clicks'].append(click_home_action(page, context, base, label))
                except Exception as error:
                    report[env_name]['home_clicks'].append({'label': label, 'error': str(error)})

            report[env_name]['console_errors'] = console_errors[:50]
            report[env_name]['http_errors'] = http_errors[:50]
            context.close()

        browser.close()

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
