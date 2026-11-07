// A monotonic clock keeps the transport display independent of tempo and clock changes.
export function startPlaybackTimer(update) {
  const started = performance.now();
  let previous;
  const tick = () => {
    const seconds = Math.max(0, Math.floor((performance.now() - started) / 1000));
    if (seconds === previous) return;
    previous = seconds;
    update(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`);
  };
  tick();
  const interval = setInterval(tick, 250);
  return () => clearInterval(interval);
}
