import faces from './font-faces.json';

const pending = new Map();
export function loadFonts(assetBase, originalNames = false) {
  if (typeof FontFace === 'undefined' || !document.fonts) return Promise.resolve();
  const key = assetBase + originalNames;
  if (!pending.has(key)) pending.set(key, Promise.all(faces.map(async face => {
    const family = face.family; // Same self-hosted variable faces as the Dave Drums website.
    const font = new FontFace(family, `url("${new URL(`fonts/${face.file}`, assetBase)}")`, {
      weight: face.weight, style: face.style, ...(face.unicodeRange ? { unicodeRange: face.unicodeRange } : {})
    });
    try { document.fonts.add(await font.load()); } catch { /* Original sans-serif fallback remains usable. */ }
  })));
  return pending.get(key);
}
