const { spawn } = require('child_process');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const serverEntry = path.resolve(backendRoot, 'src', 'server.js');

const child = spawn('node', [serverEntry], {
  cwd: backendRoot,
  stdio: 'ignore',
  detached: true
});

child.unref();

console.log('✅ Backend server 启动中（日志输出被忽略）。');



