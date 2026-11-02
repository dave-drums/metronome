import React from 'react';

export default function Header({ assetBase }) {
  return React.createElement('header', { className: 'hero' },
    React.createElement('div', { className: 'hero-banner', 'data-bg': 'home', style: {
      backgroundImage: `url("${new URL('assets/pv-home.webp', assetBase)}")`
    } }),
    React.createElement('div', { className: 'hero-content' },
      React.createElement('h1', { className: 'hero-title' }, 'Metronome')
    )
  );
}
