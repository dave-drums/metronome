import './styles.css';
import { mountApplication } from './mount.js';

const moduleUrl = import.meta.url;
export function mountMetronome(target = '#metronome-app') {
  return mountApplication(target, { cssHref: new URL('./metronome.css', moduleUrl).href });
}
