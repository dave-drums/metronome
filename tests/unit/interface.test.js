import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import Metronome from '../../src/Metronome.js';

it('shows elapsed time only inside the stop button and resets on restart', async () => {
  vi.useFakeTimers();
  const view = render(React.createElement(Metronome)); await act(async () => {});
  expect(view.queryByLabelText('Elapsed time')).toBeNull();
  fireEvent.click(view.getByLabelText('Start metronome'));
  expect(view.getByLabelText('Stop metronome').textContent).toBe('\u23f9 0:00');
  act(() => vi.advanceTimersByTime(61250));
  expect(view.getByLabelText('Stop metronome').textContent).toBe('\u23f9 1:01');
  fireEvent.click(view.getByLabelText('Increase tempo by 5 BPM'));
  expect(view.getByLabelText('Stop metronome').textContent).toBe('\u23f9 1:01');
  fireEvent.click(view.getByLabelText('Stop metronome'));
  expect(view.getByLabelText('Start metronome').textContent).toBe('Start');
  act(() => vi.advanceTimersByTime(5000));
  fireEvent.click(view.getByLabelText('Start metronome'));
  expect(view.getByLabelText('Stop metronome').textContent).toBe('\u23f9 0:00');
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

it('keeps the trainer counter between the checkbox and short status and the desktop controls in order', async () => {
  const view=render(React.createElement(Metronome));await act(async()=>{});
  const controls=view.container.querySelector('.met-controls');
  expect([...controls.children].map(button=>button.textContent)).toEqual(['Start','Tap tempo','Beats: 4','Subdivision: 1']);
  fireEvent.click(view.getByRole('checkbox',{name:'Speed trainer'}));
  const heading=view.container.querySelector('.tool-trainer-heading');
  expect([...heading.children].map(node=>node.tagName)).toEqual(['LABEL','OUTPUT','P']);
  expect(heading.querySelector('.tool-trainer-status').textContent).toBe('Speed trainer ready');
  fireEvent.click(view.getByLabelText('Start metronome'));
  expect(heading.querySelector('.tool-trainer-status').textContent).toBe('Speed trainer active');
});
