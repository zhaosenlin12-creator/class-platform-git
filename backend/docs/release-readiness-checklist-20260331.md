# Release Readiness Checklist - 2026-03-31

This checklist is the current release gate for the stable-upgrade line.

It matches the current deployment method already used on the server:

- frontend: upload and overwrite the built static package
- backend: upload the backend package, then rebuild and recreate the Docker service

## 1. Release artifacts

Prepare these four artifacts before touching the server:

1. Current release frontend package:
   - source: `web/dist/`
   - delivery form: zip or tar package for overwrite deployment
2. Current release backend package:
   - source: `backend/`
   - include: source, `package.json`, `package-lock.json`, migrations, scripts
   - exclude from overwrite on server: `backend/.env`, `backend/node_modules`, `backend/uploads`
3. Previous known-good frontend backup:
   - keep the last deployed `web/dist/` package
4. Previous known-good backend backup:
   - keep the last deployed backend package that matches a successfully running image

## 2. Pre-release local validation

Run these checks from the local repo before packaging:

```bash
cd backend
npm run verify:ci

cd ../web
npm run verify:ci
```

Optional advisory check:

```bash
cd web
npm run audit:prod -- --json > audit-prod.json
```

Current truth:

- backend production audit is expected to pass
- frontend build and smoke validation are expected to pass
- frontend production audit is still advisory because the legacy Vue 2 stack has not been fully modernized yet
- current advisory count is now `7`
- current frontend advisory set has `0` high and `0` critical findings

## 3. Database readiness

If the target database does not already contain the resource taxonomy fields, run this additive migration once before the new backend serves traffic:

- `backend/migrations/20260328_add_resource_taxonomy_fields.sql`

This migration only adds nullable columns and indexes:

- `course_system`
- `course_stage`
- `idx_teaching_resource_course_system`
- `idx_teaching_resource_course_stage`

## 4. Server rollout sequence

### Frontend

1. Back up the current deployed frontend static files.
2. Upload the new frontend package built from `web/dist/`.
3. Extract and overwrite the deployed frontend static directory.
4. Confirm the homepage loads and the new assets are being served.

### Backend

1. Back up the current deployed backend package.
2. Upload the full new backend package.
3. Extract it into `/www/wwwroot/teaching-platform/`.
4. Do not overwrite `backend/.env`.
5. If this is the first rollout that includes class schedule persistence, run the one-time DB field migration:

```bash
cd /www/wwwroot/teaching-platform/backend
npm run migrate:class-schedule
```

6. Re-apply writable directory ownership if needed:

```bash
cd /www/wwwroot/teaching-platform
mkdir -p uploads/classroom logs
chown -R 10001:10001 uploads logs
chmod -R 775 uploads logs
```

7. Rebuild and recreate the backend container:

```bash
cd /www/wwwroot/teaching-platform
docker rm -f teaching-backend 2>/dev/null
docker compose -f docker-compose.prod.yml up -d --build backend
```

If the server uses the legacy binary:

```bash
cd /www/wwwroot/teaching-platform
docker rm -f teaching-backend 2>/dev/null
docker-compose -f docker-compose.prod.yml up -d --build backend
```

## 5. Post-release checks

Run these server-side checks immediately after rollout:

```bash
docker ps | grep teaching-backend
docker logs --tail 100 teaching-backend
curl http://127.0.0.1:8081/health
curl -I https://class.codebn.cn/health
```

Then complete this smoke list:

1. Homepage header entries render correctly:
   - `乐启宠物`
   - `AI互动课堂`
   - `python冒险岛`
2. Teacher login works.
3. Student login works.
4. Course content management loads, filters work, and resource preview/edit still works.
5. AI resource packages can open `AI互动课堂` directly from the course resource center, and the external-link copy prompt works normally.
6. Course unit manager up/down reorder works and refreshes correctly.
7. Homework list, publish/close flow, and statistics page still work.
8. Classroom list loads and classroom create/enter still works.
9. Reopening the classroom manager page does not create duplicate websocket toast events.
10. Student and teacher CSV export flows still work.
11. Legacy compatibility paths no longer return fabricated success payloads:
   - old `/teacher/*` compatibility routes either hit real homework handlers or return explicit `410 retired`
   - no released page shows fake course-assignment rows or fake auto-generated schedules
12. Teacher dashboard, teacher course management, teacher homework review, teacher classroom, and teacher student management all render real data or explicit empty states only:
   - no fabricated counters, fake classrooms, fake course rows, fake homework reviews, or hard-coded student warning counts appear after forcing API failures
   - course statistics modal values come from the backend, not local placeholder defaults
   - student progress/detail/export flows resolve real database-backed payloads and downloads

Supplemental smoke checks for the latest classroom/resource batch:

1. Confirm the homepage header labels are `乐启宠物`, `AI互动课堂`, and `python冒险岛`.
2. Confirm AI resource packages still open the external AI classroom from the resource center.
3. Confirm AI-package classrooms expose the `AI课堂` action in classroom management and it opens the external AI classroom successfully.
4. Confirm backend logs do not show unexpected bursts of `Resource access is using generic authenticated fallback` during classroom-bound preview/download smoke tests.
5. Confirm retired classroom compatibility endpoints no longer return fabricated success payloads and now fail closed with `410 retired` when called directly:
   - `/teaching/classroom/statistics`
   - `/teaching/classroom/online-status`
   - `/teaching/classroom/control/broadcast`
   - `/teaching/classroom/control/screen-lock`
   - `/teaching/classroom/homework-submit/:classroomId`
6. Confirm starting a classroom from the management side causes connected classroom clients to receive the backend-emitted `classroom-started` signal.
7. Confirm a teacher reconnect during an active classroom restores the current projector mode and active broadcast content instead of leaving students on a stale state.
8. Confirm classroom work sharing is no longer a silent no-op: saving a work as `share` should create a visible classroom chat notification for connected members.
9. Confirm legacy-compatible classroom file/chat messages still appear in realtime on the online classroom page and are not only visible after refreshing chat history.
10. Confirm a student help/status event is still visible in the teacher-side student list even if the classroom roster event arrives late or is briefly missed during reconnect.

Supplemental smoke checks for the latest learning-analytics/class-management batch:

1. Confirm `教师端 -> 学情分析` now loads without 404s when switching courses from the teacher page.
2. Confirm the overview tab shows real totals, trend lines, heatmap, ranking, and warnings for a course with data; on an empty course it should show zero/empty state instead of fabricated data.
3. Confirm the learning-path tab loads the real student selector from the teacher student list and returns a real path or a truthful empty state.
4. Confirm `后台 -> 班级管理 -> 详情/学员` can open the real class student list and no longer fails because of the old wrong route shape.
5. Confirm removing a student from class management now hits the real backend route and refreshes both the student list and class counts correctly.
6. Confirm class CSV export in class management succeeds through `/class/list` and no longer depends on the retired `/teaching/class/list` path.

Supplemental smoke checks for the latest student-detail and legacy-menu batch:

1. Confirm `后台 -> 学员管理 -> 详情` now opens real student detail data instead of only echoing the list row.
2. Confirm the student detail modal progress table shows real course progress from `/teaching/student/progress/:studentId`; for students without progress, it should remain empty instead of fabricating rows.
3. Confirm the student detail modal stays usable when one of the detail APIs fails: the modal should still open with the selected row context and show a warning rather than crashing.
4. Confirm any legacy/mock menu payload that still returns `test/HomeworkTest` lands on the real homework template manager instead of the stale `HomeworkManager` page.
5. Confirm any legacy/mock menu payload that still returns `test/StudentTest` lands on the real student management page.

Supplemental smoke checks for the latest production-log cleanup batch:

1. Confirm opening `在线课堂`, `课堂管理`, `课程安排`, and `教学房间` in production no longer floods the browser console with routine trace logs during normal use.
2. Confirm real failures still emit actionable error logs and visible UI feedback; this batch must not swallow actual exceptions.
3. If temporary troubleshooting is needed, confirm setting `window.__TEACHING_PLATFORM_DEBUG__ = true` before page load restores debug logs for investigation.
4. Confirm `课堂管理` statistics cards default to zero/empty state when the classroom list API fails and no longer show a fabricated baseline.
5. Confirm `课程安排` and `课程安排(旧)` side-card statistics default to zero/empty state when statistics data is unavailable and no longer show fabricated `3 / 1 / 45`.

Supplemental smoke checks for the latest classroom real-data cleanup batch:

1. Confirm `教师端 -> 教学界面(/teacher/teaching-room/:id)` now loads the real classroom name, course info, and roster from backend data; when the room has no roster data it should show a truthful empty state instead of demo students.
2. Confirm entering `教学界面` without a valid classroom id no longer creates or connects to a fake `default-room`.
3. Confirm `在线课堂(/classroom/online/:id)` no longer flashes `Scratch编程入门课 / Scratch编程 / 张老师` before the real classroom detail request completes.
4. Confirm `后台 -> 班级管理` course scheduling, attendance entry, and report export actions still route correctly after the dead mock fallback branches were removed.
5. Confirm `后台 -> 学员管理` no longer exposes any demo student/teacher example rows after forcing list/detail API failures; the page should stay on real data or explicit empty/error feedback only.

Supplemental smoke checks for the 2026-04-01 revalidation checkpoint:

1. Re-run `npm run verify:ci` in both `web` and `backend` from the release candidate workspace and archive the command output together with the package timestamp.
2. Confirm `课程安排`, `教学界面`, and `在线课堂` still render after the latest cleanup with no build-time or runtime syntax errors.
3. Confirm the current frontend production build no longer emits the stale `caniuse-lite / Browserslist` warning during `npm run verify:ci`.
4. Use `在线课堂(/classroom/online/:id)` as the authoritative PPT/resource verification path for this release; do not treat the hidden legacy `教学界面` PPT upload stub as production evidence.

Supplemental smoke checks for the classroom-manager UX text normalization batch:

1. Confirm `后台 -> 课堂管理` page title, statistics cards, filters, modal labels, and action menus all render as normal Chinese instead of mojibake/乱码.
2. Confirm classroom create, edit, start, enter, end, and delete flows now show readable Chinese success/error prompts.
3. Confirm the AI-package classroom row still exposes `AI课堂` and `打开AI课堂` actions after the text normalization pass.

Supplemental smoke checks for the 2026-04-01 course-unit and student-management RC hardening batch:

1. Confirm `后台 -> 课程内容管理 -> 课节管理` now shows readable Chinese title, table labels, modal labels, and action prompts.
2. Confirm course-unit reorder still works through the mounted page and refreshing after moving a unit shows the updated order.
3. Confirm opening the course-unit resource selector, choosing a resource, clicking cancel, then reopening does not silently bind the stale prior resource unless the operator reselects it.
4. Confirm reusing the course-unit route with a different `courseId` refreshes the course header and unit list instead of leaving the previous course data on screen.
5. Confirm direct refresh on `/management/student` keeps the operator on the student-management page instead of bouncing to `/admin/dashboard`.
6. Confirm the student list performance column now shows real completion metrics instead of empty placeholders caused by the removed `learningStats` stub.
7. Confirm `后台 -> 学员管理 -> 详情` now shows real completion rate, completed-course count, homework completion rate, and study time from backend data, including truthful zero values where appropriate.
8. Confirm student detail no longer renders blank `班级编号` / `主讲教师` rows unless the backend actually returns those fields.
9. Confirm add/edit student only exposes persisted supplementary notes, and saving notes still lands in the existing backend `remark` field.
10. Confirm hidden legacy handlers no longer show `成绩记录功能开发中` / `模板下载功能开发中` / `数据导出功能开发中`; they should use the real detail/template/export flows if invoked.

Supplemental smoke checks for the 2026-04-01 homework-link hardening / profile-realization batch:

1. Confirm `瀛︾敓 -> 鎴戠殑浣滀笟` submitting an external homework link now rejects invalid/private/localhost-style URLs and only stores validated links.
2. Confirm student submitted attachments with external links now show `打开链接` and `复制链接`; they must not try to preview/download as if they were in-site files.
3. Confirm teacher/admin `查看提交` does the same for external-link attachments and no longer falls back to the old direct tokenized fetch/download path.
4. Confirm completed homework `下载作品` now uses the real attachment list instead of a fake success toast.
5. Confirm `瀛︾敓 -> 个人中心` now loads real profile data, saves edits successfully, and the updated name/avatar cache reflects across the current session after saving.
6. Confirm the teacher dashboard quick-actions area no longer exposes the deferred old exam-management entry on `/teacher/exam-management`; the visible shortcut should now land on homework review.

Supplemental smoke checks for the 2026-04-01 deferred route redirect guard pass:

1. Confirm manually opening `/teacher/exam-management` while logged in no longer lands on the deferred old exam page and instead redirects into `/teacher/homework-review`.
2. Confirm manually opening `/teacher/exam-management-disabled` behaves the same way.
3. Confirm this targeted redirect does not affect normal teacher navigation to `homework-review`, `student-analytics`, `resource-library`, or current admin routes.

## 6. Release stop conditions

Do not continue rollout as successful if any of these fail:

1. `/health` is not healthy.
2. Backend container loops or exits repeatedly.
3. Login cannot complete for teacher or student.
4. Resource list or homework list returns server errors.
5. Classroom entry or classroom socket connection fails broadly.

## 7. Required release evidence

Before calling this release ready, keep these records:

1. Local validation command output
2. Exact package timestamp used for frontend and backend
3. Whether the taxonomy migration was needed
4. Post-update health output
5. Smoke-check result

Supplemental smoke checks for the 2026-04-02 analytics / route-boundary / dependency-audit batch:

1. Confirm `教师端 -> 学情分析` now shows only `概览` and `学习路径`; no `行为分析 / 学习预警 / 学习报告` placeholder tabs remain on the mounted page.
2. Confirm old links or bookmarks to `/teacher/student-analytics?tab=activities` no longer leave the page in an unsupported state and instead normalize back into a supported analytics tab.
3. Confirm `教师工作台 -> 最近活动 -> 查看全部` now lands on the supported teacher analytics page without 404s or empty placeholder tabs.
4. Confirm the dashboard quick-operation entry now shows real `作业批改` source text and still opens `/teacher/homework-review`.
5. Confirm direct unauthenticated access to representative protected routes redirects to `/home` instead of loading protected content:
   - `/teacher/dashboard`
   - `/admin/dashboard`
   - `/student/home`
   - `/management/student`
   - `/classroom/online/<valid-id>`
6. Confirm `/teacher/exam-management` and `/teacher/exam-management-disabled` both redirect into `/teacher/homework-review` when authenticated.
7. Confirm the deferred teacher exam-management menu entry is no longer visible in the current stable release candidate menu.
8. Confirm backend production audit is green again after the `lodash` override refresh:
   - `npm audit --omit=dev`
   - expected result: `0 vulnerabilities`
9. Confirm frontend production audit no longer reports a `lodash` high-severity advisory and now remains at the legacy-stack advisory set only:
   - expected result: `7 vulnerabilities`
   - expected severity split: `0 high`, `0 critical`


Supplemental smoke checks for the 2026-04-02 stable-lane residue cleanup pass:

1. Confirm `作业管理 -> 作业统计分析` no longer flashes sample student/class statistics before real API data loads.
2. Confirm the class filter in `作业统计分析` is populated from real class names returned by the current homework statistics payload rather than a hardcoded two-class list.
3. Confirm `作业统计分析 -> 导出数据` now downloads a CSV file with the currently filtered student rows.
4. Confirm opening `教师评分工作台` without a valid `assignmentId` no longer shows 30 mock students and instead shows the empty-state guidance.
5. Confirm `教师评分工作台 -> 下载作业` can either open a provided submission file URL or download the current inline code file when the submission is code-only.
6. Confirm `教师评分工作台 -> 导出成绩` now downloads a CSV file containing graded submissions.
7. Confirm `学员管理` and `教师管理` downloaded CSV template files no longer contain `student_demo` / `teacher_demo` sample accounts.
Supplemental smoke checks for the 2026-04-02 classroom recovery / residual cleanup pass:

1. Confirm `/classroom/online/:id` loads normally again and no longer throws compile/runtime syntax errors.
2. Confirm a student entering a live classroom is still recorded successfully through the real join endpoint before websocket classroom presence begins updating.
3. Confirm a student leaving the classroom or closing the page triggers the real leave endpoint and does not leave stale online counts after refresh.
4. Confirm classroom access-denied or reconnect failures now show the visible alert with `重新连接` / `返回列表` actions instead of only hidden console or toast feedback.
5. Confirm switching the online classroom language with no previously saved code leaves the editor empty and does not inject `Hello, World!` or other demo code.
6. Confirm loading a saved work with empty code content also leaves the editor empty instead of auto-filling template code.
