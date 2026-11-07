import React from 'react';

export default function Header() {
  return React.createElement('header', { className: 'hero' },
    React.createElement('div', { className: 'hero-content' },
      React.createElement('h1', { className: 'hero-title' }, 'Metronome')
    )
  );
}
