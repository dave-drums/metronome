import './styles.css';
import './standalone.css';
import { registerSW } from 'virtual:pwa-register';
import { mountApplication } from './mount.js';

mountApplication('#metronome-app', { standalone: true }).then(() => {
  registerSW({ immediate: true });
}).catch(error => {
  console.error(error);
  document.getElementById('metronome-app').textContent = 'The metronome could not load. Please try again.';
});
