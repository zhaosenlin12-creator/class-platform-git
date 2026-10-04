import json
import os
import subprocess
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
LOGIN_SCRIPT = ROOT / 'scripts' / 'agent' / 'captcha-login.js'
OUT = ROOT / 'logs' / 'source_vs_local_extended_audit.json'
BASES = {
    'baseline_8081': 'http://127.0.0.1:8081',
    'source_8091': 'http://127.0.0.1:8091'
}
ADMIN_USER = 'admin'
ADMIN_PASS = 'zsl13177068887'
TARGETS = [
    '/portal/home',
    '/student/works?tab=all',
    '/student/works?tab=my',
    '/admin/class-management',
    '/admin/student-management',
    '/admin/course-content-admin',
    '/admin/homework-assignment',
    '/admin/homework-template',
    '/admin/course',
    '/admin/classroom-manager'
]


def login():
    completed = subprocess.run(
        ['node', str(LOGIN_SCRIPT), ADMIN_USER, ADMIN_PASS],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
        check=True,
        env={**os.environ, 'AUDIT_API_BASE_URL': BASES['baseline_8081']}
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
        if not value or value in seen:
            continue
        result.append(value)
        seen.add(value)
    return result


def visible_texts(locator, limit=40):
    values = []
    count = min(locator.count(), limit)
    for index in range(count):
        try:
            node = locator.nth(index)
            if node.is_visible(timeout=800):
                text = (node.inner_text(timeout=1500) or '').strip()
                if text:
                    values.append(text)
        except Exception:
            continue
    return uniq(values)


def body_sample(page, limit=1600):
    text = page.locator('body').inner_text(timeout=10000)
    compact = '\n'.join(line.strip() for line in text.splitlines() if line.strip())
    return compact[:limit]


def table_headers(scope):
    return visible_texts(scope.locator('.ant-table-thead th'), 20)


def summarize_table_row(row):
    cells = []
    columns = row.locator('td')
    for index in range(min(columns.count(), 10)):
        try:
            cells.append((columns.nth(index).inner_text(timeout=1500) or '').strip())
        except Exception:
            cells.append('')

    return {
        'cells': cells,
        'actions': visible_texts(row.locator('button, .ant-btn, a'), 20)
    }


def summarize_page(page, url):
    page.goto(url, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(1800)
    summary = {
        'url': page.url,
        'title': page.title(),
        'headings': visible_texts(page.locator('h1, h2, h3, .ant-card-head-title, .page-header h2'), 20),
        'tabs': visible_texts(page.locator('.ant-tabs-tab, [role="tab"], .header .menu a'), 30),
        'buttons': visible_texts(page.locator('button, .ant-btn'), 40),
        'table_headers': table_headers(page),
        'body_sample': body_sample(page),
        'first_row': None,
        'student_modal': None
    }

    rows = page.locator('.ant-table-tbody tr')
    if rows.count() > 0:
        summary['first_row'] = summarize_table_row(rows.nth(0))

    if '/admin/class-management' in url and rows.count() > 0:
        row = rows.nth(0)
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

        if target_index is not None:
            action_nodes.nth(target_index).click(timeout=8000)
            page.wait_for_timeout(1200)
            modal = page.locator('.ant-modal-content').last
            if modal.count() > 0:
                summary['student_modal'] = {
                    'title': (modal.locator('.ant-modal-title').inner_text(timeout=1500) or '').strip(),
                    'buttons': visible_texts(modal.locator('button, .ant-btn'), 30),
                    'table_headers': table_headers(modal),
                    'body_sample': (modal.inner_text(timeout=3000) or '').strip()[:1000]
                }

                close_btn = page.locator('.ant-modal-close').last
                if close_btn.count() > 0:
                    close_btn.click(timeout=5000)
                    page.wait_for_timeout(400)

    return summary


def compare_lists(left, right):
    left_values = left or []
    right_values = right or []
    return {
        'baseline_only': [item for item in left_values if item not in right_values],
        'source_only': [item for item in right_values if item not in left_values]
    }


def compare_pages(baseline, source):
    diff = {}

    if baseline.get('title') != source.get('title'):
        diff['title'] = {
            'baseline': baseline.get('title'),
            'source': source.get('title')
        }

    for key in ['headings', 'tabs', 'buttons', 'table_headers']:
        list_diff = compare_lists(baseline.get(key), source.get(key))
        if list_diff['baseline_only'] or list_diff['source_only']:
            diff[key] = list_diff

    baseline_row = baseline.get('first_row') or {}
    source_row = source.get('first_row') or {}
    row_action_diff = compare_lists(baseline_row.get('actions'), source_row.get('actions'))
    if row_action_diff['baseline_only'] or row_action_diff['source_only']:
        diff['first_row_actions'] = row_action_diff

    baseline_modal = baseline.get('student_modal') or {}
    source_modal = source.get('student_modal') or {}
    if baseline_modal or source_modal:
        modal_diff = {}
        if baseline_modal.get('title') != source_modal.get('title'):
            modal_diff['title'] = {
                'baseline': baseline_modal.get('title'),
                'source': source_modal.get('title')
            }

        for key in ['buttons', 'table_headers']:
            list_diff = compare_lists(baseline_modal.get(key), source_modal.get(key))
            if list_diff['baseline_only'] or list_diff['source_only']:
                modal_diff[key] = list_diff

        if modal_diff:
            diff['student_modal'] = modal_diff

    return diff


def main():
    login_result = login()
    report = {
        'targets': TARGETS,
        'baseline_8081': {},
        'source_8091': {},
        'diff': {}
    }

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for env_name, base in BASES.items():
            context = browser.new_context(viewport={'width': 1440, 'height': 900})
            context.add_init_script(build_init_script(login_result))
            page = context.new_page()
            target_bucket = report[env_name]
            for target in TARGETS:
                target_bucket[target] = summarize_page(page, base + target)
            context.close()
        browser.close()

    for target in TARGETS:
        report['diff'][target] = compare_pages(
            report['baseline_8081'][target],
            report['source_8091'][target]
        )

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(str(OUT))


if __name__ == '__main__':
    main()
