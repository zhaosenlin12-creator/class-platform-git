const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const sourceRoot = path.resolve(__dirname, '..', 'src');
const extensions = new Set(['.js']);
const ignoredDirs = new Set(['node_modules', 'logs', 'uploads']);

function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        collectFiles(path.join(dir, entry.name), files);
      }
      continue;
    }

    if (extensions.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

function main() {
  const files = collectFiles(sourceRoot).sort();
  const failures = [];

  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
      encoding: 'utf8'
    });

    if (result.status !== 0) {
      failures.push({
        file,
        output: [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
      });
    }
  }

  if (failures.length > 0) {
    console.error(`Syntax check failed for ${failures.length} file(s).`);
    failures.forEach((failure) => {
      console.error(`\n[${failure.file}]`);
      if (failure.output) {
        console.error(failure.output);
      }
    });
    process.exit(1);
  }

  console.log(`Syntax check passed for ${files.length} backend source file(s).`);
}

main();
