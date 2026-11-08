import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import Metronome from '../../src/Metronome.js';

it('shows elapsed time only inside the stop button and resets on restart', async () => {
  vi.useFakeTimers();
  const view = render(React.createElement(Metronome)); await act(async () => {});
  expect(view.queryByLabelText('Elapsed time')).toBeNull();
  fireEvent.click(view.getByLabelText('Start metronome'));
  expect(view.getByLabelText('Stop metronome').textContent).toBe('0:00');
  expect(view.getByLabelText('Stop metronome').querySelector('svg[data-icon=stop]')).toBeTruthy();
  act(() => vi.advanceTimersByTime(61250));
  expect(view.getByLabelText('Stop metronome').textContent).toBe('1:01');
  fireEvent.click(view.getByLabelText('Increase tempo by 5 BPM'));
  expect(view.getByLabelText('Stop metronome').textContent).toBe('1:01');
  fireEvent.click(view.getByLabelText('Stop metronome'));
  expect(view.getByLabelText('Start metronome').textContent).toBe('Start');
  act(() => vi.advanceTimersByTime(5000));
  fireEvent.click(view.getByLabelText('Start metronome'));
  expect(view.getByLabelText('Stop metronome').textContent).toBe('0:00');
  expect(view.getByLabelText('Stop metronome').querySelector('svg[data-icon=stop]')).toBeTruthy();
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});

it('keeps keyboard button activation separate from transport shortcuts', async () => {
  const view = render(React.createElement(Metronome)); await act(async () => {});
  const plus = view.getByLabelText('Increase tempo by 5 BPM');
  plus.focus(); fireEvent.keyDown(plus, {key:' '});
  expect(view.getByLabelText('Start metronome')).toBeTruthy();
  fireEvent.keyUp(plus,{key:' '});
  expect(view.getByLabelText('Tempo in beats per minute').value).toBe('125');
  fireEvent.click(plus); expect(view.getByLabelText('Tempo in beats per minute').value).toBe('130');
});

it('traps dialog focus, closes with Escape and restores the invoking control', async () => {
  const view = render(React.createElement(Metronome)); await act(async () => {});
  const trigger = view.getByText('Beats: 4'); trigger.focus(); fireEvent.click(trigger);
  const dialog = view.getByRole('dialog', {name:'Beats'});
  const close = view.getByLabelText('Close'), done = view.getByRole('button',{name:'16',exact:true});
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(close,{key:'Tab',shiftKey:true}); expect(document.activeElement).toBe(done);
  fireEvent.keyDown(done,{key:'Tab'}); expect(document.activeElement).toBe(close);
  fireEvent.keyDown(dialog,{key:'Escape'});
  expect(view.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(trigger);
});

it('shows trainer state beside the checkbox and the cycle count as the last heading item', async () => {
  const view=render(React.createElement(Metronome));await act(async()=>{});
  const controls=view.container.querySelector('.met-controls');
  expect([...controls.children].map(button=>button.textContent)).toEqual(['Start','Tap tempo','Beats: 4','Subdivision: 1']);
  const toggle=view.getByRole('checkbox',{name:'Speed trainer inactive'});
  expect(view.getByLabelText('Repetition in current cycle').hidden).toBe(true);
  fireEvent.click(toggle);
  const heading=view.container.querySelector('.tool-trainer-heading');
  expect([...heading.children].map(node=>node.tagName)).toEqual(['LABEL','OUTPUT']);
  expect(toggle.labels[0].textContent).toBe('Speed trainer active');
  expect(view.getByLabelText('Repetition in current cycle').hidden).toBe(false);
  fireEvent.click(view.getByLabelText('Start metronome'));
  expect(toggle.labels[0].textContent).toBe('Speed trainer active');
  fireEvent.click(view.getByLabelText('Stop metronome'));
  expect(toggle.labels[0].textContent).toBe('Speed trainer active');
  fireEvent.click(toggle);
  expect(toggle.labels[0].textContent).toBe('Speed trainer inactive');
  expect(view.getByLabelText('Repetition in current cycle').hidden).toBe(true);
});
