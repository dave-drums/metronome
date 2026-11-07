import React from 'react';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import Migrated from '../../src/Metronome.js';
import { MockAudioContext } from '../setup.js';
let Reference;
beforeAll(async()=>{
  globalThis.React=React;
  await import('../fixtures/vault/metronome.js');
  Reference=window.Metronome;
});

for(const name of ['Vault source','Migrated React']) describe(`${name} shared contract`,()=>{
  async function mount(){const view=render(React.createElement(name==='Vault source'?Reference:Migrated));await act(async()=>{});return view;}
  it('has identical defaults, beat/subdivision choices and per-beat states',async()=>{
    const view=await mount();const tempo=()=>view.container.querySelector('input[type=text]');
    expect(tempo().value).toBe('120');
    fireEvent.change(tempo(),{target:{value:'999'}});expect(tempo().value).toBe('300');
    for(let beats=1;beats<=16;beats++){
      fireEvent.click((view.queryByText(/^Beats:/) || view.getByText(/^Beats per Bar:/)));fireEvent.click(view.getByRole('button',{name:String(beats),exact:true}));
      expect(view.container.querySelectorAll('.beat-circle')).toHaveLength(beats);
    }
    const first=view.container.querySelector('.beat-circle');
    expect(first.querySelector('path').getAttribute('d')).toBe('M8 18L14 10L20 18');
    fireEvent.click(first);expect(first.querySelector('path').getAttribute('d')).not.toBe('M8 18L14 10L20 18');
    fireEvent.click(first);expect(first.querySelector('svg')).toBeNull();fireEvent.click(first);
    expect(first.querySelector('path').getAttribute('d')).toBe('M8 18L14 10L20 18');
    for(const [i,label]of ['Quarter','Eighth','8th Triplet','16th','Fivelet','16th Triplet','Sevenlet','32nd'].entries()){
      fireEvent.click(view.getByText(/^Subdivision:/));fireEvent.click(view.getByText(label));expect(view.getByText(`Subdivision: ${i+1}`)).toBeTruthy();
    }
  });
  it('schedules identical high/normal/low samples and gains on the original clock grid',async()=>{
    vi.useFakeTimers();vi.setSystemTime(10000);const view=await mount();const audio=MockAudioContext.instances.at(-1);
    fireEvent.change(view.container.querySelector('input[type=text]'),{target:{value:'300'}});
    fireEvent.click(view.getByText(/^Subdivision:/));fireEvent.click(view.getByText('Fivelet'));
    fireEvent.click((view.queryByLabelText('Start metronome') || view.getByText('▶ Start')));act(()=>vi.advanceTimersByTime(500));
    expect(audio.sources.length).toBeGreaterThan(10);
    audio.sources.forEach((source,i)=>{
      expect(source.start.mock.calls[0][0]-10).toBeCloseTo(i*0.04,8);
      expect(source.buffer.kind).toBe(i%5!==0?1:i%20===0?3:2);
      expect(audio.gains[i].gain.value).toBe(i%5!==0?0.15:i%20===0?0.4:0.25);
    });
  });
  if(name === 'Vault source') it.each([['Increase',120,140],['Decrease',140,120]])('keeps trainer %s cap semantics',async(mode,start,target)=>{
    vi.useFakeTimers();vi.setSystemTime(10000);const view=await mount();
    const tempo=()=>view.container.querySelector('input[type=text]');fireEvent.change(tempo(),{target:{value:String(start)}});
    fireEvent.click((view.queryByText(/^Beats:/) || view.getByText(/^Beats per Bar:/)));fireEvent.click(view.getByRole('button',{name:'1',exact:true}));
    fireEvent.click((view.queryByLabelText('Speed trainer') || view.container.querySelector('.metronome-card > div:nth-child(3) > button:first-child')));
    fireEvent.click(view.getByText(mode));
    const inputs=view.getAllByRole('spinbutton');['5','1',String(target)].forEach((value,i)=>fireEvent.change(inputs[i],{target:{value}}));
    fireEvent.click(view.getByText('Done'));fireEvent.click((view.queryByLabelText('Start metronome') || view.getByText('▶ Start')));
    for(let i=0;i<10;i++)act(()=>vi.advanceTimersByTime(500));
    expect(tempo().value).toBe(String(target));expect(view.queryByText('▶ Start')).toBeNull();
  });
});
