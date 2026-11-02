import React from 'react';
import { createRoot } from 'react-dom/client';
import typography from './vault/typography.css?raw';
import core from './vault/core.css?raw';
import pageStyles from './vault/page.css?raw';
import { loadFonts } from '../../src/fonts.js';

// Unmodified component from the pinned Vault source, with only its host supplied.
globalThis.React = React;
// Keep raw CSS intact, including browser-tolerated source errors and cascade order.
for (const css of [typography, core, pageStyles]) {
  const style = document.createElement('style'); style.textContent = css; document.head.append(style);
}
await loadFonts(new URL('/metronome/', window.location.origin).href, true);
await import('./vault/metronome.js');
createRoot(document.getElementById('metronome-root')).render(React.createElement(window.Metronome));
