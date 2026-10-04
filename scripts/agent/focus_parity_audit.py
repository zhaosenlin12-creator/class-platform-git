import json
import os
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
LOGIN_SCRIPT = ROOT / 'scripts' / 'agent' / 'captcha-login.js'
OUT = ROOT / 'logs' / 'focus_parity_audit.json'
BASES = {
    'deploy_8081': 'http://127.0.0.1:8081',
    'source_8091': 'http://127.0.0.1:8091'
}
ADMIN_USER = 'admin'
ADMIN_PASS = 'zsl13177068887'


def login():
    completed = subprocess.run(
        ['node', str(LOGIN_SCRIPT), ADMIN_USER, ADMIN_PASS],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
        check=True,
        env={**os.environ, 'AUDIT_API_BASE_URL': BASES['deploy_8081']}
    )
    payload = json.loads(completed.stdout)
    return payload['login']['result']


def build_init_script(login_result):
    expire = int((time.time() + 7 * 24 * 60 * 60) * 1000)
    user_info = login_result['userInfo']
    role = login_result['role']
    payload = {
        'pro__Access-Token': {'value': login_result['token'], 'expire': expire},
        'pro__Login_Username': {'value': user_info['username'], 'expire': expire},
        'pro__Login_Userinfo': {'value': user_info, 'expire': expire},
        'pro__Login_UserRole': {'value': role, 'expire': expire}
    }
    return f"""
(() => {{
  const payload = {json.dumps(payload, ensure_ascii=False)};
  Object.entries(payload).forEach(([key, value]) => {{
    localStorage.setItem(key, JSON.stringify(value));
  }});
}})();
"""


def uniq(values):
    seen = set()
    result = []
    for value in values:
        if not value:
            continue
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def visible_texts(locator, limit=30):
    values = []
    count = locator.count()
    for index in range(min(count, limit)):
        try:
            node = locator.nth(index)
            if node.is_visible(timeout=800):
                text = (node.inner_text(timeout=1500) or '').strip()
                if text:
                    values.append(text)
        except Exception:
            continue
    return uniq(values)


def body_sample(page, limit=1200):
    text = page.locator('body').inner_text(timeout=10000)
    compact = '\n'.join(line.strip() for line in text.splitlines() if line.strip())
    return compact[:limit]


def table_headers(container):
    return visible_texts(container.locator('.ant-table-thead th'), 20)


def audit_work_list(page, base):
    page.goto(base + '/portal/workList', wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(2000)
    result = {
        'url': page.url,
        'title': page.title(),
        'headings': visible_texts(page.locator('h1, h2, h3, .panel-title, .ant-card-head-title'), 20),
        'tabs': visible_texts(page.locator('.ant-tabs-tab, [role="tab"], .tab-item, .filter-chip, .category-item'), 20),
        'buttons': visible_texts(page.locator('button, .ant-btn, a[role="button"]'), 40),
        'links': visible_texts(page.locator('a'), 30),
        'body_sample': body_sample(page),
        'cards': []
    }

    cards = page.locator('.work-card, .work-item, .gallery-card, .ant-card, .resource-card')
    for index in range(min(cards.count(), 4)):
        try:
            text = (cards.nth(index).inner_text(timeout=1500) or '').strip()
            if text:
                result['cards'].append(text[:300])
        except Exception:
            continue

    return result


def audit_class_management(page, base):
    page.goto(base + '/admin/class-management', wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(2500)
    result = {
        'url': page.url,
        'title': page.title(),
        'page_buttons': visible_texts(page.locator('button, .ant-btn'), 40),
        'table_headers': table_headers(page),
        'body_sample': body_sample(page),
        'first_row': None,
        'student_modal': None
    }

    rows = page.locator('.ant-table-tbody tr')
    if rows.count() == 0:
        return result

    row = rows.nth(0)
    cells = []
    columns = row.locator('td')
    for index in range(min(columns.count(), 8)):
        try:
            cells.append((columns.nth(index).inner_text(timeout=1500) or '').strip())
        except Exception:
            cells.append('')

    result['first_row'] = {
        'cells': cells,
        'actions': visible_texts(row.locator('button, .ant-btn, a'), 20)
    }

    action_nodes = row.locator('button, .ant-btn, a')
    target_index = None
    for index in range(action_nodes.count()):
        try:
            text = (action_nodes.nth(index).inner_text(timeout=1000) or '').strip()
            if '学员' in text:
                target_index = index
                break
        except Exception:
            continue

    if target_index is None and action_nodes.count() >= 2:
        target_index = 1

    if target_index is None:
        return result

    action_nodes.nth(target_index).click(timeout=8000)
    page.wait_for_timeout(1800)
    modal = page.locator('.ant-modal-content').last
    if modal.count() == 0:
        return result

    modal_title = ''
    try:
        modal_title = (modal.locator('.ant-modal-title').inner_text(timeout=1500) or '').strip()
    except Exception:
        pass

    result['student_modal'] = {
        'title': modal_title,
        'buttons': visible_texts(modal.locator('button, .ant-btn'), 40),
        'table_headers': table_headers(modal),
        'body_sample': (modal.inner_text(timeout=3000) or '').strip()[:1200]
    }
    return result


def audit_admin_table_page(page, base, route):
    page.goto(base + route, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(2200)
    result = {
        'url': page.url,
        'title': page.title(),
        'page_buttons': visible_texts(page.locator('button, .ant-btn'), 40),
        'table_headers': table_headers(page),
        'body_sample': body_sample(page),
        'first_row': None
    }

    rows = page.locator('.ant-table-tbody tr')
    if rows.count() == 0:
        return result

    row = rows.nth(0)
    cells = []
    columns = row.locator('td')
    for index in range(min(columns.count(), 10)):
        try:
            cells.append((columns.nth(index).inner_text(timeout=1500) or '').strip())
        except Exception:
            cells.append('')
    result['first_row'] = {
        'cells': cells,
        'actions': visible_texts(row.locator('button, .ant-btn, a'), 20)
    }
    return result


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    login_result = login()
    report = {}

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for env_name, base in BASES.items():
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
                'work_list': audit_work_list(page, base),
                'class_management': audit_class_management(page, base),
                'student_management': audit_admin_table_page(page, base, '/admin/student-management'),
                'course_content_admin': audit_admin_table_page(page, base, '/admin/course-content-admin'),
                'course_management': audit_admin_table_page(page, base, '/admin/course'),
                'classroom_manager': audit_admin_table_page(page, base, '/admin/classroom-manager'),
                'homework_assignment': audit_admin_table_page(page, base, '/admin/homework-assignment'),
                'console_errors': console_errors[:50],
                'http_errors': [item for item in http_errors if 'favicon.ico' not in item['url']][:50]
            }

            context.close()
        browser.close()

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(str(OUT))


if __name__ == '__main__':
    main()
