import { it, expect } from 'vitest';
import { act, fireEvent } from '@testing-library/react';
import { mountApplication } from '../../src/mount.js';
async function mount(host) {
  const pending=mountApplication(host,{cssHref:'https://example.com/metronome.css'});
  host.shadowRoot.querySelector('link').dispatchEvent(new Event('load'));
  let app; await act(async()=>{app=await pending}); return app;
}
it('isolates styles and keyboard, rejects duplicate mounts, and supports remount',async()=>{
  const host=document.createElement('div'); document.body.append(host);
  const instance=await mount(host); const shadow=host.shadowRoot;
  expect(host.querySelector('.metronome-card')).toBeNull(); expect(shadow.querySelector('.metronome-card')).toBeTruthy();
  await expect(mountApplication(host)).rejects.toThrow('already mounted');
  const input=()=>shadow.querySelector('input[type=text]');
  fireEvent.keyDown(window,{key:'ArrowUp'}); expect(input().value).toBe('120');
  fireEvent.keyDown(shadow.querySelector('.metronome-surface'),{key:'ArrowUp'}); expect(input().value).toBe('121');
  act(()=>instance.unmount()); expect(shadow.childNodes.length).toBe(0);
  const next=await mount(host); expect(input().value).toBe('120'); act(()=>instance.unmount()); expect(input()).toBeTruthy(); act(()=>next.unmount()); host.remove();
});
it('reports missing containers and stylesheet failures and permits retry',async()=>{
  await expect(mountApplication('#missing')).rejects.toThrow('not found');
  const host=document.createElement('div');document.body.append(host);
  const pending=mountApplication(host,{cssHref:'https://example.com/missing.css'});
  host.shadowRoot.querySelector('link').dispatchEvent(new Event('error'));
  await expect(pending).rejects.toThrow('Unable to load');
  const instance=await mount(host); act(()=>instance.unmount()); host.remove();
});
