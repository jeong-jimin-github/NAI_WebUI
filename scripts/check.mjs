import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const html = readFileSync(join(publicDir, 'index.html'), 'utf8');

const banned = [
  'osano',
  'recaptcha',
  'novelai.net/icons',
  'official-dom-bridge',
  'official-runtime',
  'ui-fixes.js',
  'cf-fonts',
  'static-adapter',
  'auth-resilience',
  'nai-global.css',
  '__NAI_STATIC_MODE__',
];

const scanTargets = [html];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|css|html|mjs)$/.test(entry.name)) {
      scanTargets.push(readFileSync(full, 'utf8'));
    }
  }
}
walk(join(publicDir, 'js'));
scanTargets.push(readFileSync(join(publicDir, 'styles.css'), 'utf8'));

const hits = banned.filter(token => scanTargets.some(text => text.includes(token)));
if (hits.length) {
  console.error('Forbidden remnants found:', hits.join(', '));
  process.exit(1);
}

const app = readFileSync(join(publicDir, 'js/app.js'), 'utf8');
const usedIds = [...app.matchAll(/\$\('#([A-Za-z0-9_-]+)'/g)].map(m => m[1]);
const missing = [...new Set(usedIds)].filter(id => !html.includes(`id="${id}"`));
if (missing.length) {
  console.error('Required ids missing from index.html:', missing.join(', '));
  process.exit(1);
}

const jsDir = join(publicDir, 'js');
const jsFiles = readdirSync(jsDir).filter(name => name.endsWith('.js')).map(name => join(jsDir, name));
jsFiles.push(join(root, 'scripts/serve.mjs'), join(root, 'scripts/check.mjs'));

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

if (!html.includes('type="module"')) {
  console.error('index.html must load the app as an ES module');
  process.exit(1);
}

console.log(`check passed (${jsFiles.length} files, ${new Set(usedIds).size} ids).`);
