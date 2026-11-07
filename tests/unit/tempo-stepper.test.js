import { it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { bindTempoStepper, TEMPO_STEP, HOLD_DELAY_MS, REPEAT_INTERVAL_MS } from '../../src/tempo-stepper.js';

const down = button => fireEvent(button,new MouseEvent('pointerdown',{bubbles:true,button:0}));
const up = () => fireEvent(document,new MouseEvent('pointerup',{bubbles:true,button:0}));

it('uses the canonical 5 BPM step, one-second delay and 100ms repeat interval', () => {
  expect([TEMPO_STEP,HOLD_DELAY_MS,REPEAT_INTERVAL_MS]).toEqual([5,1000,100]);
});

it('steps once, waits a full second, repeats rapidly and stops on release without a second click step', () => {
  vi.useFakeTimers();
  const button=document.createElement('button');document.body.append(button);
  let count=0;const dispose=bindTempoStepper(button,()=>count++);
  try {
    down(button);expect(count).toBe(1);
    vi.advanceTimersByTime(999);expect(count).toBe(1);
    vi.advanceTimersByTime(1);expect(count).toBe(2);
    vi.advanceTimersByTime(200);expect(count).toBe(4);
    up();fireEvent.click(button,{detail:1});vi.advanceTimersByTime(1000);expect(count).toBe(4);
    fireEvent.click(button,{detail:0});expect(count).toBe(5);
  } finally { dispose();button.remove(); }
});

it('supports keyboard holds, cancellation, disabled controls, cleanup and back-forward reuse', () => {
  vi.useFakeTimers();
  const button=document.createElement('button');document.body.append(button);
  let count=0;const dispose=bindTempoStepper(button,()=>count++);
  try {
    fireEvent.keyDown(button,{key:'Enter'});expect(count).toBe(1);
    fireEvent.keyDown(button,{key:'Enter',repeat:true});expect(count).toBe(1);
    vi.advanceTimersByTime(1000);expect(count).toBe(2);
    fireEvent.keyUp(button,{key:'Enter'});vi.advanceTimersByTime(1000);expect(count).toBe(2);
    down(button);fireEvent(window,new Event('pagehide'));vi.advanceTimersByTime(1000);expect(count).toBe(3);
    fireEvent.click(button);expect(count).toBe(4); // Returning from bfcache retains activation.
    down(button);fireEvent(button,new Event('pointercancel'));vi.advanceTimersByTime(1000);expect(count).toBe(5);
    down(button);button.disabled=true;vi.advanceTimersByTime(1000);expect(count).toBe(6);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(button);expect(count).toBe(6);
    button.disabled=false;down(button);expect(count).toBe(7);
    dispose();vi.advanceTimersByTime(2000);expect(count).toBe(7);
    fireEvent.click(button);expect(count).toBe(7);
  } finally { dispose();button.remove(); }
});
