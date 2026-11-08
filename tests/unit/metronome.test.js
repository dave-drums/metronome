import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import Metronome from '../../src/Metronome.js';
import { MockAudioContext } from '../setup.js';
async function app(props) { const view = render(React.createElement(Metronome, props)); await act(async () => {}); return view; }
const bpm = view => view.getByLabelText('Tempo in beats per minute');
const press = element => fireEvent(element,new MouseEvent('pointerdown',{bubbles:true,button:0}));
const release = () => fireEvent(document,new MouseEvent('pointerup',{bubbles:true,button:0}));
const hold = (view,label) => { press(view.getByLabelText(label)); release(); };

describe('Vault metronome behaviour', () => {
  it('resets on remount without touching stored preferences', async () => {
    localStorage.setItem('vuex', 'legacy settings'); const write = vi.spyOn(Storage.prototype, 'setItem');
    let view = await app(); expect(bpm(view).value).toBe('120');
    fireEvent.change(bpm(view), {target:{value:'155'}}); view.unmount();
    view = await app(); expect(bpm(view).value).toBe('120'); expect(view.getByText('Beats: 4')).toBeTruthy();
    expect(localStorage.getItem('vuex')).toBe('legacy settings'); expect(write).not.toHaveBeenCalled(); write.mockRestore();
  });
  it('clamps tempo and waits one second before rapid hold-to-repeat', async () => {
    vi.useFakeTimers(); const view = await app();
    fireEvent.change(bpm(view), {target:{value:'999'}}); expect(bpm(view).value).toBe('300');
    fireEvent.change(bpm(view), {target:{value:'0'}}); expect(bpm(view).value).toBe('1');
    fireEvent.change(view.getByLabelText('Tempo slider'), {target:{value:'120'}});
    press(view.getByLabelText('Increase tempo by 5 BPM'));
    expect(bpm(view).value).toBe('125');
    act(() => vi.advanceTimersByTime(999)); expect(bpm(view).value).toBe('125');
    act(() => vi.advanceTimersByTime(1)); expect(bpm(view).value).toBe('130');
    act(() => vi.advanceTimersByTime(200)); release(); expect(bpm(view).value).toBe('140');
    act(() => vi.advanceTimersByTime(500)); expect(bpm(view).value).toBe('140');
    hold(view, 'Decrease tempo by 5 BPM'); expect(bpm(view).value).toBe('135');
  });
  it('supports all 16 beat counts and all eight subdivisions', async () => {
    const view = await app();
    for (let count=1; count<=16; count++) {
      fireEvent.click(view.getByText(/^Beats:/)); fireEvent.click(view.getByRole('button',{name:String(count),exact:true}));
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
  it('uses the inline trainer, counts complete bars and clamps to a non-divisible target', async () => {
    vi.useFakeTimers(); vi.setSystemTime(10000); const view=await app();
    fireEvent.click(view.getByText(/^Beats:/)); fireEvent.click(view.getByRole('button',{name:'1',exact:true}));
    fireEvent.click(view.getByRole('checkbox',{name:/^Speed trainer /}));
    for(const [name,value] of [['Starting BPM','120'],['Target BPM','132'],['Increase by','5']]) fireEvent.change(view.getByLabelText(name),{target:{value}});
    const cycle=()=>view.getByLabelText('Repetition in current cycle').textContent;
    expect(cycle()).toBe('Repetition 0 of 4');
    fireEvent.click(view.getByLabelText('Start metronome')); act(()=>vi.advanceTimersByTime(1));
    expect(cycle()).toBe('Repetition 1 of 4');
    for(const n of [2,3,4]) { act(()=>vi.advanceTimersByTime(500)); expect(cycle()).toBe(`Repetition ${n} of 4`); expect(bpm(view).value).toBe('120'); }
    act(()=>vi.advanceTimersByTime(500)); expect(cycle()).toBe('Repetition 1 of 4'); expect(bpm(view).value).toBe('125');
    const times=MockAudioContext.instances.at(-1).sources.slice(0,5).map(source=>source.start.mock.calls[0][0]);
    for(const [i,time] of [10,10.5,11,11.5,12].entries()) expect(times[i]).toBeCloseTo(time,8);
    act(()=>vi.advanceTimersByTime(500));
    expect(MockAudioContext.instances.at(-1).sources[5].start.mock.calls[0][0]).toBeCloseTo(12.48,8);
    expect(bpm(view).disabled).toBe(true);
    expect(view.getAllByRole('spinbutton').every(input=>input.disabled)).toBe(true);
    act(()=>vi.advanceTimersByTime(10000)); expect(bpm(view).value).toBe('132');
    fireEvent.click(view.getByLabelText('Stop metronome')); expect(cycle()).toBe('Repetition 0 of 4');
    act(()=>vi.advanceTimersByTime(1000)); expect(cycle()).toBe('Repetition 0 of 4');
    expect(bpm(view).disabled).toBe(false);
    fireEvent.click(view.getByLabelText('Start metronome')); act(()=>vi.advanceTimersByTime(1));
    expect(cycle()).toBe('Repetition 1 of 4'); expect(bpm(view).value).toBe('120');
  });
  it('validates inline trainer settings and keeps editing available after errors', async () => {
    const view=await app();fireEvent.click(view.getByRole('checkbox',{name:/^Speed trainer /}));
    fireEvent.change(view.getByLabelText('Starting BPM'),{target:{value:'140'}});
    fireEvent.change(view.getByLabelText('Target BPM'),{target:{value:'100'}});
    fireEvent.click(view.getByLabelText('Start metronome'));
    expect(view.getByRole('alert').textContent).toContain('Target BPM');expect(document.activeElement).toBe(view.getByLabelText('Target BPM'));
    fireEvent.change(view.getByLabelText('Starting BPM'),{target:{value:''}});
    fireEvent.click(view.getByLabelText('Start metronome'));expect(view.getByLabelText('Start metronome')).toBeTruthy();
  });
  it('aligns the repetition counter with output latency and cancels pending updates on Stop', async () => {
    vi.useFakeTimers(); vi.setSystemTime(10000); const view=await app();
    MockAudioContext.instances.at(-1).outputLatency=0.08;
    fireEvent.click(view.getByRole('checkbox',{name:/^Speed trainer /}));
    fireEvent.click(view.getByLabelText('Start metronome'));
    act(()=>vi.advanceTimersByTime(79));
    expect(view.getByLabelText('Repetition in current cycle').textContent).toBe('Repetition 0 of 4');
    act(()=>vi.advanceTimersByTime(2));
    expect(view.getByLabelText('Repetition in current cycle').textContent).toBe('Repetition 1 of 4');
    fireEvent.click(view.getByLabelText('Stop metronome'));
    act(()=>vi.advanceTimersByTime(500));
    expect(view.getByLabelText('Repetition in current cycle').textContent).toBe('Repetition 0 of 4');
  });
  it('retains the original beat rows and balanced subdivision groups without duplicate dots', async () => {
    vi.useFakeTimers();const view=await app();
    const expected=[[1],[2],[3],[4],[5],[6],[7],[8],[5,4],[5,5],[6,5],[6,6],[7,6],[7,7],[8,7],[8,8]];
    for(let count=1;count<=16;count++) {
      fireEvent.click(view.getByText(/^Beats:/));fireEvent.click(view.getByRole('button',{name:String(count),exact:true}));
      expect([...view.container.querySelectorAll('.met-beat-row')].map(row=>row.children.length)).toEqual(expected[count-1]);
    }
    for(const [i,name] of ['Quarter','Eighth','8th Triplet','16th','Fivelet','16th Triplet','Sevenlet','32nd'].entries()) {
      fireEvent.click(view.getByText(/^Subdivision:/));fireEvent.click(view.getByText(name));
      fireEvent.click(view.getByLabelText('Start metronome'));act(()=>vi.advanceTimersByTime(1));
      const rows=[...view.container.querySelectorAll('.met-subdivision-row')];
      expect(rows.map(row=>row.children.length)).toEqual(i===0?[]:i<4?[i+1]:[Math.ceil((i+1)/2),Math.floor((i+1)/2)]);
      expect([...view.container.querySelectorAll('.subdivision-dot')].map(dot=>Number(dot.dataset.subdivision))).toEqual(i===0?[]:Array.from({length:i+1},(_,n)=>n));
      fireEvent.click(view.getByLabelText('Stop metronome'));
    }
  });
  it('cleans up playback, repeat buttons, audio and delayed callbacks on unmount', async () => {
    vi.useFakeTimers(); const view=await app(); const context=MockAudioContext.instances.at(-1);
    fireEvent.click(view.getByLabelText('Start metronome')); press(view.getByLabelText('Increase tempo by 5 BPM')); fireEvent.click(view.getByLabelText('Tap tempo'));
    view.unmount(); expect(context.close).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
    expect(context.sources.every(source=>source.stop.mock.calls.length===1)).toBe(true);
  });
});
