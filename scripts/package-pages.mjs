import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('dist/licenses', { recursive: true });
for (const file of ['LICENSE', 'NOTICE.md']) copyFileSync(file, `dist/${file}`);
for (const name of ['react', 'react-dom', 'workbox-window']) {
  copyFileSync(`node_modules/${name}/LICENSE`, `dist/licenses/${name}.txt`);
}
