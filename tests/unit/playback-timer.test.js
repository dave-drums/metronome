import { it, expect, vi } from 'vitest';
import { startPlaybackTimer } from '../../src/playback-timer.js';

it('uses a monotonic clock, formats minutes, avoids redundant updates and cancels cleanly', () => {
  vi.useFakeTimers();
  const update = vi.fn();
  const stop = startPlaybackTimer(update);
  expect(update.mock.calls).toEqual([['0:00']]);
  vi.advanceTimersByTime(750);
  expect(update).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 600000);
  vi.advanceTimersByTime(250);
  expect(update).toHaveBeenLastCalledWith('0:01');
  vi.advanceTimersByTime(60000);
  expect(update).toHaveBeenLastCalledWith('1:01');
  stop();
  const count = update.mock.calls.length;
  vi.advanceTimersByTime(10000);
  expect(update).toHaveBeenCalledTimes(count);
  expect(vi.getTimerCount()).toBe(0);
  const restart = startPlaybackTimer(update);
  expect(update).toHaveBeenLastCalledWith('0:00');
  restart();
});
