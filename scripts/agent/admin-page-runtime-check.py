import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


TARGETS = [
    '/admin/class-management',
    '/admin/student-management',
    '/admin/course-content-admin',
    '/admin/homework-assignment',
    '/admin/homework-template'
]


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    report = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()

        console_errors = []
        page_errors = []
        response_errors = []

        page.on('console', lambda message: console_errors.append({
            'type': message.type,
            'text': message.text,
            'location': message.location
        }) if message.type == 'error' else None)
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        page.on('response', lambda response: response_errors.append({
            'status': response.status,
            'url': response.url
        }) if response.status >= 400 else None)

        for target in TARGETS:
            console_errors.clear()
            page_errors.clear()
            response_errors.clear()

            page.goto(f'http://localhost:8081{target}', wait_until='domcontentloaded', timeout=60000)
            page.wait_for_timeout(4000)
            report[target] = {
                'title': page.title(),
                'url': page.url,
                'body_sample': page.locator('body').inner_text(timeout=10000)[:1000],
                'console_errors': list(console_errors),
                'page_errors': list(page_errors),
                'response_errors': list(response_errors)
            }

        context.close()
        browser.close()

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
