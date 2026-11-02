import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const text = path => readFileSync(path, 'utf8');
const originalSamples = {
  low: '72423da31cdda03df5391a3d077013b54a15d59d',
  normal: '99b387f43c905ba13f65ba45306f55dbf20c390c',
  high: '84805287c61d3a05493eca02066830da8e5b24e6'
};
const sw = text('dist/sw.js');
const reference = readFileSync('tests/fixtures/vault/metronome.js');
assert.equal(createHash('sha1').update(`blob ${reference.length}\0`).update(reference).digest('hex'), 'e36d8452331a360bd261728a2015e6aae2104e7d', 'Unmodified Vault reference must match the pinned source');
for (const [name, expected] of Object.entries(originalSamples)) {
  const path = `assets/metronome-${name}.mp3`;
  const buffer = readFileSync(`dist/${path}`);
  assert.equal(createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex'), expected, `${name}: original sample changed`);
  assert.ok(sw.includes(path), `${name}: missing from the standalone precache`);
}
const manifest = JSON.parse(text('dist/manifest.webmanifest'));
assert.equal(manifest.start_url, '/metronome/');
assert.equal(manifest.scope, '/metronome/');
const html = text('dist/index.html');
assert.doesNotMatch(html, /["']\/src\//);
for (const [, path] of html.matchAll(/(?:src|href)="\/metronome\/([^"?#]+)"/g)) assert.ok(existsSync(`dist/${path}`), `Missing ${path}`);
const embed = text('dist/embed/metronome.js');
assert.match(embed, /mountMetronome/);
assert.match(embed, /import\.meta\.url/);
assert.match(embed, /https:\/\/dave-drums\.github\.io\/metronome\//);
assert.doesNotMatch(embed, /firebase|firestore|Babel|\beval\s*\(|serviceWorker|registerSW|workbox|localStorage|sessionStorage/);
assert.ok(text('dist/embed/metronome.css').length > 1000);
assert.deepEqual(readdirSync('dist/embed').sort(), ['metronome.css', 'metronome.js']);
for (const file of readdirSync('dist/fonts')) assert.ok(sw.includes(`fonts/${file}`), `Font not precached: ${file}`);
for (const file of ['LICENSE', 'NOTICE.md', 'licenses/react.txt', 'licenses/react-dom.txt', 'licenses/workbox-window.txt']) assert.ok(existsSync(`dist/${file}`));
console.log('PASS: original audio bytes, standalone assets, scoped manifest, offline precache, bundled React embed, licence files.');
