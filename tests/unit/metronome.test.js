import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import Metronome from '../../src/Metronome.js';
import { MockAudioContext } from '../setup.js';
async function app(props) { const view = render(React.createElement(Metronome, props)); await act(async () => {}); return view; }
const bpm = view => view.getByLabelText('Tempo in beats per minute');
const hold = (view, label) => { fireEvent.mouseDown(view.getByLabelText(label)); fireEvent.mouseUp(document); };

describe('Vault metronome behaviour', () => {
  it('resets on remount without touching stored preferences', async () => {
    localStorage.setItem('vuex', 'legacy settings'); const write = vi.spyOn(Storage.prototype, 'setItem');
    let view = await app(); expect(bpm(view).value).toBe('120');
    fireEvent.change(bpm(view), {target:{value:'155'}}); view.unmount();
    view = await app(); expect(bpm(view).value).toBe('120'); expect(view.getByText('Beats per Bar: 4')).toBeTruthy();
    expect(localStorage.getItem('vuex')).toBe('legacy settings'); expect(write).not.toHaveBeenCalled(); write.mockRestore();
  });
  it('clamps tempo and preserves 150ms hold-to-repeat', async () => {
    vi.useFakeTimers(); const view = await app();
    fireEvent.change(bpm(view), {target:{value:'999'}}); expect(bpm(view).value).toBe('300');
    fireEvent.change(bpm(view), {target:{value:'0'}}); expect(bpm(view).value).toBe('1');
    fireEvent.change(view.getByLabelText('Tempo slider'), {target:{value:'120'}});
    fireEvent.mouseDown(view.getByLabelText('Increase tempo by 5 BPM'));
    act(() => vi.advanceTimersByTime(450)); fireEvent.mouseUp(document); expect(bpm(view).value).toBe('140');
    hold(view, 'Decrease tempo by 5 BPM'); expect(bpm(view).value).toBe('135');
  });
  it('supports all 16 beat counts and all eight subdivisions', async () => {
    const view = await app();
    for (let count=1; count<=16; count++) {
      fireEvent.click(view.getByText(/^Beats per Bar:/)); fireEvent.click(view.getByRole('button',{name:String(count),exact:true}));
      expect(view.container.querySelectorAll('.beat-circle')).toHaveLength(count);
    }
    for (const [index,name] of ['Quarter','Eighth','8th Triplet','16th','Fivelet','16th Triplet','Sevenlet','32nd'].entries()) {
      fireEvent.click(view.getByText(/^Subdivision:/)); fireEvent.click(view.getByText(name)); expect(view.getByText(`Subdivision: ${index+1}`)).toBeTruthy();
    }
  });
  it('preserves accent, normal, subdivision and mute sounds and gains', async () => {
    vi.useFakeTimers(); const view = await app(); const context = MockAudioContext.instances.at(-1);
    fireEvent.click(view.getByLabelText('Start metronome'));
    expect(context.sources.at(-1).buffer.kind).toBe(3); expect(context.gains.at(-1).gain.value).toBe(0.4);
    fireEvent.click(view.getByLabelText('Stop metronome')); fireEvent.click(view.getByLabelText('Beat 1: accent'));
    const before = context.sources.length; fireEvent.click(view.getByLabelText('Start metronome')); expect(context.sources.length).toBe(before);
    fireEvent.click(view.getByLabelText('Stop metronome')); fireEvent.click(view.getByLabelText('Beat 1: mute'));
    fireEvent.click(view.getByLabelText('Start metronome')); expect(context.sources.at(-1).buffer.kind).toBe(2); expect(context.gains.at(-1).gain.value).toBe(0.25);
    fireEvent.click(view.getByLabelText('Stop metronome')); fireEvent.click(view.getByText(/^Subdivision:/)); fireEvent.click(view.getByText('Eighth'));
    fireEvent.click(view.getByLabelText('Start metronome')); act(() => vi.advanceTimersByTime(200));
    expect(context.sources.at(-1).buffer.kind).toBe(1); expect(context.gains.at(-1).gain.value).toBe(0.15);
  });
  it('preserves keyboard increments and ignores input editing', async () => {
    const view = await app(); fireEvent.keyDown(window,{key:'ArrowUp'}); expect(bpm(view).value).toBe('121');
    fireEvent.keyDown(window,{key:'ArrowRight'}); expect(bpm(view).value).toBe('126');
    fireEvent.keyDown(window,{key:'ArrowDown'}); fireEvent.keyDown(window,{key:'ArrowLeft'}); expect(bpm(view).value).toBe('120');
    fireEvent.keyDown(bpm(view),{key:'ArrowUp'}); expect(bpm(view).value).toBe('120');
    fireEvent.keyDown(window,{key:' '}); expect(view.getByLabelText('Stop metronome')).toBeTruthy();
    fireEvent.keyDown(window,{key:' '}); expect(view.getByLabelText('Start metronome')).toBeTruthy();
  });
  it('uses the last four taps and resets tap history after three seconds', async () => {
    vi.useFakeTimers(); vi.setSystemTime(10000); const view = await app(); const tap=view.getByLabelText('Tap tempo');
    fireEvent.click(tap); act(() => vi.advanceTimersByTime(500)); fireEvent.click(tap); expect(bpm(view).value).toBe('120');
    act(() => vi.advanceTimersByTime(250)); fireEvent.click(tap); expect(bpm(view).value).toBe('160');
    act(() => vi.advanceTimersByTime(250)); fireEvent.click(tap); expect(bpm(view).value).toBe('180');
    act(() => vi.advanceTimersByTime(7000)); fireEvent.click(tap); expect(bpm(view).value).toBe('180');
  });
  it.each([['Increase',120,140],['Decrease',140,120]])('caps trainer %s tempo without stopping playback', async (mode,start,target) => {
    vi.useFakeTimers(); vi.setSystemTime(10000); const view=await app();
    fireEvent.change(bpm(view),{target:{value:String(start)}});
    fireEvent.click(view.getByText(/^Beats per Bar:/)); fireEvent.click(view.getByRole('button',{name:'1',exact:true}));
    fireEvent.click(view.getByLabelText('Tempo trainer')); fireEvent.click(view.getByText(mode));
    const fields=view.getAllByRole('spinbutton');
    for(const [index,value]of ['5','1',String(target)].entries())fireEvent.change(fields[index],{target:{value}});
    fireEvent.click(view.getByText('Done')); fireEvent.click(view.getByLabelText('Start metronome'));
    for(let i=0;i<10;i++)act(()=>vi.advanceTimersByTime(500));
    expect(bpm(view).value).toBe(String(target)); expect(view.getByLabelText('Stop metronome')).toBeTruthy();
  });
  it('cleans up playback, repeat buttons, audio and delayed callbacks on unmount', async () => {
    vi.useFakeTimers(); const view=await app(); const context=MockAudioContext.instances.at(-1);
    fireEvent.click(view.getByLabelText('Start metronome')); fireEvent.mouseDown(view.getByLabelText('Increase tempo by 5 BPM')); fireEvent.click(view.getByLabelText('Tap tempo'));
    view.unmount(); expect(context.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    expect(context.sources.every(source=>source.stop.mock.calls.length===1)).toBe(true);
  });
});
