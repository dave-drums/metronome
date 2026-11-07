// Shared tempo stepping for mouse, touch, keyboard and assistive activation.
export const TEMPO_STEP = 5;
export const HOLD_DELAY_MS = 1000;
export const REPEAT_INTERVAL_MS = 100;
export function bindTempoStepper(button, step) {
  const doc = button.ownerDocument || document;
  const view = doc.defaultView || window;
  let delay;
  let repeat;
  let holding = false;
  const disabled = () => button.disabled || button.matches?.(':disabled');
  function stop() {
    holding = false;
    clearTimeout(delay);
    clearInterval(repeat);
  }
  function tick() {
    if (disabled()) { stop(); return; }
    step();
  }
  function begin() {
    stop();
    if (disabled()) return;
    holding = true;
    tick();
    delay = setTimeout(() => {
      if (!holding) return;
      tick();
      if (holding) repeat = setInterval(tick, REPEAT_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }
  function pointerDown(event) {
    if (event.button !== 0 || event.isPrimary === false) return;
    begin();
  }
  function click(event) {
    if ((event?.detail || 0) === 0 && !disabled()) step();
  }
  function keyDown(event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    if (!event.repeat) begin();
  }
  function keyUp(event) {
    if (event.key !== ' ' && event.key !== 'Enter') return;
    event.preventDefault();
    stop();
  }
  const preventMenu = event => event.preventDefault();
  const hide = () => { if (doc.hidden) stop(); };
  const listeners = [
    [button,'pointerdown',pointerDown], [button,'click',click],
    [button,'pointerleave',stop], [button,'pointercancel',stop],
    [button,'blur',stop], [button,'keydown',keyDown], [button,'keyup',keyUp],
    [button,'contextmenu',preventMenu], [doc,'pointerup',stop],
    [doc,'pointercancel',stop], [doc,'visibilitychange',hide], [view,'blur',stop], [view,'pagehide',stop],
  ];
  listeners.forEach(([target,type,handler]) => target.addEventListener(type,handler));
  return () => {
    stop();
    listeners.forEach(([target,type,handler]) => target.removeEventListener?.(type,handler));
  };
}
