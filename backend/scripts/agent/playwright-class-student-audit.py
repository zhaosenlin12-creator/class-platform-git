import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
WEB_BASE_URL = 'http://localhost:8091'
API_BASE_URL = 'http://localhost:8081'
LOGIN_SCRIPT = ROOT / 'scripts' / 'agent' / 'captcha-login.js'


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


def login(username, password):
    completed = subprocess.run(
        ['node', str(LOGIN_SCRIPT), username, password],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='replace',
        check=True,
        env={
            **os.environ,
            'AUDIT_API_BASE_URL': API_BASE_URL
        }
    )
    payload = json.loads(completed.stdout)
    login_payload = payload['login']
    if not login_payload.get('success'):
        raise RuntimeError(f'Login failed for {username}: {json.dumps(login_payload, ensure_ascii=False)}')
    return {
        'captcha': payload['captcha'],
        'login': login_payload
    }


def api_request(token, method, path, data=None):
    body = None
    headers = {
        'Accept': 'application/json',
        'X-Access-Token': token
    }

    if data is not None:
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        headers['Content-Type'] = 'application/json; charset=utf-8'

    request = urllib.request.Request(
        urllib.parse.urljoin(API_BASE_URL, path),
        data=body,
        headers=headers,
        method=method
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = response.read().decode('utf-8')
            return response.getcode(), json.loads(payload)
    except urllib.error.HTTPError as error:
        payload = error.read().decode('utf-8', errors='replace')
        try:
            return error.code, json.loads(payload)
        except json.JSONDecodeError:
            return error.code, {'success': False, 'message': payload}


def find_student_by_keyword(token, keyword):
    query = urllib.parse.urlencode({
        'pageNo': 1,
        'pageSize': 10,
        'keyword': keyword
    })
    status, payload = api_request(token, 'GET', f'/teaching/student/list?{query}')
    if status >= 400 or not payload.get('success'):
        return None, payload

    result = payload.get('result') or {}
    records = result.get('records') or result if isinstance(result, list) else []
    for item in records:
        if str(item.get('studentNo') or item.get('student_no') or '').strip() == keyword:
            return item, payload
    return None, payload


def delete_student_if_exists(token, student_id):
    if not student_id:
        return None
    return api_request(token, 'DELETE', f'/student/{student_id}')


def audit_account(username, password):
    session = login(username, password)
    login_payload = session['login']['result']
    token = login_payload['token']
    storage_payload = build_storage_payload(login_payload)
    init_script = f"""
(() => {{
  const payload = {json.dumps(storage_payload, ensure_ascii=False)};
  Object.entries(payload).forEach(([key, value]) => {{
    localStorage.setItem(key, JSON.stringify(value));
  }});
}})();
"""

    student_no = f"AUDIT{int(time.time()) % 1000000:06d}"
    student_name = 'AuditTempStudent'
    report = {
        'account': username,
        'captcha': session['captcha'],
        'userIdentity': login_payload['userIdentity'],
        'studentNo': student_no,
        'studentName': student_name
    }
    issues = []
    created_student_id = None

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        context.add_init_script(init_script)
        page = context.new_page()

        page.on('console', lambda message: issues.append({
            'type': 'console',
            'level': message.type,
            'text': message.text
        }) if message.type == 'error' else None)
        page.on('response', lambda response: issues.append({
            'type': 'response',
            'status': response.status,
            'url': response.url
        }) if response.status >= 400 else None)

        page.goto(f'{WEB_BASE_URL}/admin/class-management', wait_until='domcontentloaded', timeout=45000)
        page.wait_for_timeout(4000)

        first_row = page.locator('.ant-table-tbody tr').first
        report['className'] = first_row.locator('td').nth(0).inner_text().strip()

        first_row.locator('button').nth(1).click()
        page.wait_for_timeout(1500)
        report['studentsModalOpened'] = page.locator('.ant-modal-content').count() > 0

        page.locator('.toolbar--students button').nth(0).click()
        page.wait_for_timeout(2000)
        selector_modal = page.locator('.ant-modal-content').last
        report['selectorOpened'] = selector_modal.count() > 0
        report['candidateRows'] = selector_modal.locator('.ant-table-tbody tr').count()
        selector_modal.locator('.ant-modal-footer button').nth(0).click()
        page.wait_for_timeout(1000)

        page.locator('.toolbar--students button').nth(1).click()
        page.wait_for_timeout(1000)
        quick_modal = page.locator('.ant-modal-content').last
        quick_modal.locator('input').nth(0).fill(student_no)
        quick_modal.locator('input').nth(1).fill(student_name)
        quick_modal.locator('.ant-modal-footer button').nth(1).click()
        page.wait_for_timeout(3500)

        modal_text = page.locator('body').inner_text()
        report['quickCreateSuccess'] = ('学员创建成功' in modal_text) or (student_name in modal_text)
        report['studentVisibleInClassModal'] = page.locator('.ant-modal-content').filter(has_text=student_name).count() > 0

        student_record, student_lookup_payload = find_student_by_keyword(token, student_no)
        report['studentLookupAfterCreate'] = {
            'found': student_record is not None,
            'message': student_lookup_payload.get('message')
        }
        if student_record:
            created_student_id = student_record.get('id')

        # Navigate away directly instead of closing the stacked modal to avoid
        # ant-modal overlay pointer interception during headless audit runs.
        page.goto(f'{WEB_BASE_URL}/admin/student-management', wait_until='domcontentloaded', timeout=45000)
        page.wait_for_timeout(3000)
        page.locator('.table-operation-bar input').first.fill(student_no)
        page.keyboard.press('Enter')
        page.wait_for_timeout(3000)

        search_rows = page.locator('.ant-table-tbody tr').filter(has_text=student_no)
        report['studentSearchFound'] = search_rows.count() > 0
        if report['studentSearchFound']:
            search_row = search_rows.first
            report['studentClassVisible'] = report['className'] in search_row.inner_text()
            search_row.locator('button').last.click()
            page.wait_for_timeout(1000)
            confirm_modal = page.locator('.ant-modal-confirm').last
            report['deleteConfirmOpened'] = confirm_modal.count() > 0
            confirm_buttons = confirm_modal.locator('.ant-modal-confirm-btns button')
            if confirm_buttons.count() > 0:
                confirm_buttons.last.click()
                page.wait_for_timeout(3000)
                page.locator('.table-operation-bar input').first.fill(student_no)
                page.keyboard.press('Enter')
                page.wait_for_timeout(2500)
                report['studentDeletedViaUi'] = page.locator('.ant-table-tbody tr').filter(has_text=student_no).count() == 0
            else:
                report['studentDeletedViaUi'] = False
        else:
            report['studentClassVisible'] = False
            report['deleteConfirmOpened'] = False
            report['studentDeletedViaUi'] = False

        browser.close()

    if created_student_id and not report.get('studentDeletedViaUi'):
        cleanup_status, cleanup_payload = delete_student_if_exists(token, created_student_id)
        report['cleanupDeleteFallback'] = {
            'status': cleanup_status,
            'success': bool(cleanup_payload and cleanup_payload.get('success'))
        }
    else:
        report['cleanupDeleteFallback'] = None

    filtered_issues = [
        issue for issue in issues
        if 'favicon.ico' not in issue.get('url', '')
    ]
    report['issues'] = filtered_issues[:100]
    return report


def main():
    if len(sys.argv) < 3:
        raise SystemExit('Usage: python scripts/agent/playwright-class-student-audit.py <username> <password>')

    username = sys.argv[1]
    password = sys.argv[2]
    report = audit_account(username, password)
    sys.stdout.buffer.write(json.dumps(report, ensure_ascii=False, indent=2).encode('utf-8'))
    sys.stdout.buffer.write(b'\n')


if __name__ == '__main__':
    main()
