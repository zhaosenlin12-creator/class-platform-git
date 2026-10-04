const { spawn } = require('child_process');
const path = require('path');

const webRoot = path.resolve(__dirname, '..', '..', 'web');
const cliService = path.resolve(webRoot, 'node_modules', '@vue', 'cli-service', 'bin', 'vue-cli-service.js');

const child = spawn('node', [cliService, 'serve', '--host', '0.0.0.0'], {
  cwd: webRoot,
  stdio: 'ignore',
  detached: true
});

child.unref();

console.log('✅ Vue dev server 启动中（日志输出被忽略）。');



