const assert = require("assert/strict");
const { readFileSync, existsSync } = require("fs");
const { createHash } = require("crypto");

const js = readFileSync("dist/embed/metronome.js", "utf8");
const css = readFileSync("dist/embed/metronome.css", "utf8");
assert.match(js, /mountMetronome/);
assert.match(
  js,
  /import\.meta\.url/,
  "Preserve module-relative CSS resolution"
);
assert.doesNotMatch(
  js,
  /serviceWorker|registerSW|workbox/i,
  "Embed must not include the PWA runtime"
);
assert.match(js, /https:\/\/dave-drums\.github\.io\/metronome\//);
assert.match(js, /GPL-3\.0/);
assert.match(css, /@container/);
assert.doesNotMatch(
  css,
  /\drem\b/,
  "Font sizes must not depend on the host document"
);
const sw = readFileSync("dist/sw.js", "utf8");
const precachedAssets = new Map(
  Array.from(
    sw.matchAll(/\{url:"([^"]+)",revision:(null|"[^"]+")\}/g),
    ([, url, revision]) => [url, JSON.parse(revision)]
  )
);
for (const name of ["click", "sticks", "hi-hat", "kick"]) {
  const asset = `sounds/${name}.mp3`;
  const contents = readFileSync(`dist/${asset}`);
  assert.equal(
    precachedAssets.get(asset),
    createHash("md5").update(contents).digest("hex"),
    `${asset} must be precached with a revision matching the deployed sample`
  );
}
for (const file of [
  "index.html",
  "sw.js",
  "manifest.webmanifest",
  "LICENSE",
  "fonts/InterVariable.woff2",
  "fonts/OFL.txt",
]) {
  assert.ok(existsSync(`dist/${file}`), `Missing deployment file: ${file}`);
}
assert.match(readFileSync("dist/index.html", "utf8"), /\/metronome\/assets\//);
const html = readFileSync("dist/index.html", "utf8");
assert.doesNotMatch(
  html,
  /["']\/src\//,
  "Standalone HTML must use built assets"
);
for (const [, asset] of html.matchAll(
  /(?:src|href)="\/metronome\/([^"?#]+)"/g
)) {
  assert.ok(
    existsSync(`dist/${asset}`),
    `Standalone asset missing from deployment: ${asset}`
  );
}
const manifest = JSON.parse(readFileSync("dist/manifest.webmanifest", "utf8"));
assert.equal(manifest.start_url, "/metronome/");
assert.equal(manifest.scope, "/metronome/");
console.log(
  "Production artifacts verified: standalone PWA, isolated embed, absolute asset base, precached audio, font and licences."
);
