import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const types = {'.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.mp3':'audio/mpeg', '.ttf':'font/ttf', '.woff2':'font/woff2', '.webp':'image/webp', '.ico':'image/x-icon', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json'};
http.createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Cache-Control', 'no-store');
  if (path === '/host') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html color-scheme="host"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{font-size:24px}body{margin:0}button{background:red!important;border-radius:0!important}h3{font-size:100px!important}</style></head><body><button id="outside">Host button</button><div id="metronome-app"></div></body></html>'); return;
  }
  const reference = path.startsWith('/reference/');
  const root = resolve(reference ? '.tools/reference' : 'dist');
  const relative = reference ? path.slice(11) : path.startsWith('/metronome/') ? path.slice(11) : path.startsWith('/assets/') ? path.slice(1) : null;
  if (relative === null) { response.writeHead(404); response.end(); return; }
  const file = resolve(root, relative || 'index.html');
  if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
  response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  try { response.end(readFileSync(file)); } catch { response.writeHead(404); response.end(); }
}).listen(4191, '127.0.0.1', () => console.log('Metronome production test server: http://127.0.0.1:4191/metronome/'));
