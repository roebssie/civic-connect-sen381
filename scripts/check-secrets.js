const fs = require('node:fs');
const path = require('node:path');

const blocked = new Set(['.env', '.env.local', '.env.production']);
const findings = [];

function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'coverage', 'test-results'].includes(entry.name)) continue;
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (blocked.has(entry.name)) findings.push(file);
  }
}

walk(process.cwd());
if (findings.length) {
  console.error(`Blocked environment files found: ${findings.join(', ')}`);
  process.exit(1);
}
console.log('Secret-file check passed.');
