import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
export class MockAudioContext {
  static instances = [];
  constructor() { this.state = 'running'; this.destination = {}; this.sources = []; this.gains = []; MockAudioContext.instances.push(this); }
  get currentTime() { return Date.now() / 1000; }
  decodeAudioData(buffer) { return Promise.resolve({ kind: new Uint8Array(buffer)[0], duration: 0.05 }); }
  createBufferSource() { const source = { connect: vi.fn(), start: vi.fn(), stop: vi.fn() }; this.sources.push(source); return source; }
  createGain() { const node = { gain: { value: 0 }, connect: vi.fn() }; this.gains.push(node); return node; }
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
}
beforeEach(() => {
  localStorage.clear(); MockAudioContext.instances = [];
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal('fetch', vi.fn(async url => ({ ok: true, arrayBuffer: async () => new Uint8Array([String(url).includes('-low') ? 1 : String(url).includes('-high') ? 3 : 2]).buffer })));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
