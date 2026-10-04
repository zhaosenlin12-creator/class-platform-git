# class-platform 20261004-204700 部署包与更新指令

本包按项目现有服务器方式制作，目标目录固定为 `/www/wwwroot/teaching-platform`。

## 文件

- `class-platform-frontend-dist-20261004-204700.zip`：当前 `web/dist` 的生产静态文件，解压目标为服务器 `web/dist/`。
- `class-platform-backend-docker-20261004-204700.zip`：后端源码、生产 Compose、现有服务器脚本和运行文档。
- `class-platform-release-20261004-204700.zip`：上面两个包和本说明的汇总包。

本次包已在本地重新生成，SHA-256 如下（上传后可在服务器用 `sha256sum` 复核）：

```text
52160AA406BE263CE0CA4D42950504724DB569B01ABAB61CB678FB54F71A46E7  class-platform-frontend-dist-20261004-204700.zip
224BC4A235D567A6CCD52CDBB4CA5068CD57921BF467C13659A0C41D17F324D9  class-platform-backend-docker-20261004-204700.zip
（汇总包的 SHA-256 请以上传后对该文件执行 `sha256sum` 的结果为准。）
```

本地发布核验：前端生产构建成功，运行时 API 地址、首页功能、编辑器回跳、编辑器工作流和首页品牌校验均通过；后端 88 个源码文件语法校验通过。后端依赖审计目前仍报告 16 个漏洞（9 high、6 moderate、1 low），且其中 `xlsx` 暂无修复；本次未擅自升级依赖，正式发布前请按风险接受或另行安排依赖升级。

## 包内安全边界

包内不包含服务器 `backend/.env`、`backend/node_modules`、`backend/uploads`、项目 `uploads`、`logs` 或数据库备份。更新时必须保留服务器现有 `backend/.env`、上传文件、日志和数据库。

## 一、上传前备份（服务器执行）

```bash
cd /www/wwwroot/teaching-platform
RELEASE=$(date +%Y%m%d-%H%M%S)
BACKUP=/www/wwwroot/teaching-platform-backups/$RELEASE
mkdir -p "$BACKUP"
tar -czf "$BACKUP/frontend-dist-before.tar.gz" web/dist
tar -czf "$BACKUP/backend-before.tar.gz" backend docker-compose.prod.yml BACKEND_DOCKER_RUNBOOK.md scripts/server
```

## 二、前端更新

把 `class-platform-frontend-dist-20261004-204700.zip` 上传到服务器（例如 `/tmp/`），然后执行：

```bash
cd /www/wwwroot/teaching-platform
unzip -o /tmp/class-platform-frontend-dist-20261004-204700.zip -d web/dist
test -f web/dist/index.html
nginx -t && nginx -s reload
```

本包的压缩包根目录就是 `dist` 目录中的静态文件，因此不要解压到 `web/`，要解压到 `web/dist`。

## 三、后端更新（推荐：一条命令完成，兼容无 rsync 服务器）

把 `class-platform-backend-docker-20261004-204700.zip` 上传到服务器（例如 `/tmp/`），然后执行：

```bash
cd /www/wwwroot/teaching-platform
bash ./scripts/server/install-backend-package.sh \
  /tmp/class-platform-backend-docker-20261004-204700.zip
```

该脚本会先校验压缩包，再优先使用 `rsync`；服务器没有 `rsync` 时自动使用绕过 `cp -i` 的强制覆盖方式。不会覆盖服务器现有 `backend/.env`、上传文件、日志、数据库备份或 `node_modules`。

如果必须手动执行，所有覆盖命令都要使用 `command cp -a -f` 或 `command cp -f`，不要直接使用可能被服务器别名改成交互模式的 `cp -a`。

如果服务器只有旧版 Compose 命令，最后一行可按现有运行手册改为：

```bash
docker-compose -f docker-compose.prod.yml up -d --build backend
```

不要用 `docker restart` 代替重建；本次有源码和依赖变更，必须 `up -d --build backend`。

## 四、更新后检查

```bash
cd /www/wwwroot/teaching-platform
docker ps --filter name=teaching-backend
docker logs --tail 100 teaching-backend
curl http://127.0.0.1:8081/health
curl -I https://class.codebn.cn/health
```

浏览器强制刷新 `https://class.codebn.cn`，确认教师登录后班级学员页面使用与管理员一致的新页面；验证码应只接受当前图片中的 4 位数字，输入错误应提示“验证码错误或已过期”。

## 五、回滚

出现异常时先停止继续操作，保留本次日志；使用第一步生成的备份恢复 `web/dist` 和后端源码（不要恢复或覆盖 `backend/.env`），再执行同一个 `bash ./scripts/server/update-backend-docker.sh` 重建容器。

