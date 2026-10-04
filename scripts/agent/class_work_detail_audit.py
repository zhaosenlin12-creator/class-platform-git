import json
import os
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
LOGIN_SCRIPT = ROOT / 'scripts' / 'agent' / 'captcha-login.js'
BASE = 'http://127.0.0.1:8081'
OUT = ROOT / 'logs' / 'class_work_detail_audit.json'


def login():
    completed = subprocess.run(
        ['node', str(LOGIN_SCRIPT), 'admin', 'zsl13177068887'],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
        check=True,
        env={**os.environ, 'AUDIT_API_BASE_URL': BASE}
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
    result = []
    seen = set()
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def visible_texts(locator, limit=30):
    values = []
    for index in range(min(locator.count(), limit)):
        try:
            node = locator.nth(index)
            if node.is_visible(timeout=800):
                text = (node.inner_text(timeout=1500) or '').strip()
                if text:
                    values.append(text)
        except Exception:
            continue
    return uniq(values)


def read_first_row(page):
    rows = page.locator('.ant-table-tbody tr')
    if rows.count() == 0:
        return {}
    row = rows.nth(0)
    return {
        'text': (row.inner_text(timeout=1500) or '').strip(),
        'actions': visible_texts(row.locator('button, .ant-btn, a'), 20)
    }


def click_text_button(container, label):
    nodes = container.locator('button, .ant-btn, a')
    for index in range(nodes.count()):
        try:
            node = nodes.nth(index)
            text = (node.inner_text(timeout=1000) or '').strip()
            if label in text:
                node.click(timeout=5000)
                return True
        except Exception:
            continue
    return False


def read_modal(modal):
    title = ''
    try:
        title_locator = modal.locator('.ant-modal-title')
        if title_locator.count() > 0:
            title = (title_locator.inner_text(timeout=2500) or '').strip()
    except Exception:
        title = ''
    return {
        'title': title,
        'buttons': visible_texts(modal.locator('button, .ant-btn, a'), 30),
        'labels': visible_texts(modal.locator('.ant-form-item-label, label'), 20),
        'table_headers': visible_texts(modal.locator('.ant-table-thead th'), 20),
        'body_sample': (modal.inner_text(timeout=3000) or '').strip()[:1500]
    }


def audit_student_works(page):
    page.goto(BASE + '/student/works?tab=all', wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(2200)
    result = {
        'url': page.url,
        'title': page.title(),
        'tabs': visible_texts(page.locator('.ant-tabs-tab, [role="tab"]'), 10),
        'tab_all_headers': visible_texts(page.locator('.ant-table-thead th'), 20),
        'tab_all_first_row': read_first_row(page),
        'tab_my_headers': [],
        'tab_my_first_row': {}
    }

    tabs = page.locator('.ant-tabs-tab, [role="tab"]')
    for index in range(tabs.count()):
        try:
            text = (tabs.nth(index).inner_text(timeout=1000) or '').strip()
            if '我的作品' in text:
                tabs.nth(index).click(timeout=5000)
                page.wait_for_timeout(1500)
                result['tab_my_headers'] = visible_texts(page.locator('.ant-table-thead th'), 20)
                result['tab_my_first_row'] = read_first_row(page)
                break
        except Exception:
            continue

    return result


def audit_class_student_modals(page):
    page.goto(BASE + '/admin/class-management', wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(2500)

    result = {
        'class_management': {
            'first_row': read_first_row(page)
        }
    }

    first_row = page.locator('.ant-table-tbody tr').nth(0)
    click_text_button(first_row, '学员')
    page.wait_for_timeout(2000)
    student_modal = page.locator('.ant-modal-content').last
    result['student_modal'] = read_modal(student_modal)

    if click_text_button(student_modal, '添加已有学员'):
        page.wait_for_timeout(1200)
        picker_modal = page.locator('.ant-modal-content').last
        result['picker_modal'] = read_modal(picker_modal)
        result['picker_modal']['first_row'] = read_first_row(picker_modal)
        footer_buttons = picker_modal.locator('.ant-modal-footer button')
        if footer_buttons.count() > 0:
            footer_buttons.nth(0).click(timeout=5000)
            page.wait_for_timeout(600)

    if click_text_button(student_modal, '新建并加入本班'):
        page.wait_for_timeout(1200)
        create_modal = page.locator('.ant-modal-content').last
        result['quick_create_modal'] = read_modal(create_modal)

    return result


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    login_result = login()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        context.add_init_script(build_init_script(login_result))
        page = context.new_page()

        report = {
            'student_works': audit_student_works(page),
            'class_modals': audit_class_student_modals(page)
        }

        context.close()
        browser.close()

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(str(OUT))


if __name__ == '__main__':
    main()
