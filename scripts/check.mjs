import { readdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

let checked = 0;
async function check_directory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = join(directory, entry.name);
    if (entry.isDirectory()) await check_directory(filename);
    else if (/\.(mjs|js)$/.test(filename)) {
      const result = spawnSync(process.execPath, ['--check', filename], { stdio: 'inherit' });
      if (result.status !== 0) process.exit(result.status || 1);
      checked++;
    }
  }
}
for (const directory of ['web', 'netlify/functions', 'scripts', 'tests']) await check_directory(directory);
for (const file of ['web/public/index.html', 'web/public/styles.css', 'web/public/app.js', 'netlify/database/migrations/20261020000100_create_tasks.sql']) await access(file);
console.log(`Checked ${checked} JavaScript files; static assets and database migration are present.`);
