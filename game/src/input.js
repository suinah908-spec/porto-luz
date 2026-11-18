// PORTO LUZ v2.1 — keyboard and mouse: every key the game uses, in one map.
// Keyboard and mouse: WASD to move/drive, mouse drag to orbit the camera, wheel
// to zoom. Every key the game uses is listed here, so the help screen and the HUD
// never drift apart.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_INTERACT = 'interact';
export const ACTION_ENTER_CAR = 'enterCar';
export const ACTION_PUNCH = 'punch';
export const ACTION_SHOOT = 'shoot';
export const ACTION_HORN = 'horn';
export const ACTION_RADIO = 'radio';
export const ACTION_SPRINT = 'sprint';
export const ACTION_BRAKE = 'brake';

const KEY_BINDINGS = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  Space: 'brake',
  KeyE: 'interact',
  KeyF: 'punch',
  KeyH: 'horn',
  KeyR: 'radio',
  KeyM: 'mission',
  KeyN: 'mute',
  KeyP: 'pause', Escape: 'pause',
  Enter: 'confirm',
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let orbitDX = 0;
  let orbitDY = 0;
  let wheel = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let mouseDown = false;
  let mouseClicked = false;

  function onKeyDown(event) {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    if (event.code === 'Space') event.preventDefault();
    if (!keys.has(action)) pressed.add(action);
    keys.add(action);
  }
  function onKeyUp(event) {
    const action = KEY_BINDINGS[event.code];
    if (action) keys.delete(action);
  }
  function onMouseDown(event) {
    dragging = true; mouseDown = true; mouseClicked = true;
    lastX = event.clientX; lastY = event.clientY;
  }
  function onMouseMove(event) {
    if (!dragging) return;
    orbitDX += event.clientX - lastX;
    orbitDY += event.clientY - lastY;
    lastX = event.clientX; lastY = event.clientY;
  }
  function onMouseUp() { dragging = false; mouseDown = false; }
  function onWheel(event) { wheel += event.deltaY; }
  function onBlur() { keys.clear(); }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('blur', onBlur);

  return {
    /** True while the action's key is held. */
    held(action) { return keys.has(action); },
    /** True once, on the frame the action's key went down. Call once per frame. */
    wasPressed(action) {
      if (pressed.has(action)) { pressed.delete(action); return true; }
      return false;
    },
    /** Mouse drag since the last call, in pixels, and resets it. */
    takeOrbit() {
      const dx = orbitDX; const dy = orbitDY;
      orbitDX = 0; orbitDY = 0;
      return { dx, dy };
    },
    /** Wheel scroll since the last call, in pixels, and resets it. */
    takeWheel() { const w = wheel; wheel = 0; return w; },
    /** True while the mouse button is held on the canvas. */
    mouseHeld() { return mouseDown; },
    /** True once, on the frame the mouse was clicked. Call once per frame. */
    mouseClicked() {
      if (mouseClicked) { mouseClicked = false; return true; }
      return false;
    },
    /** Clear one-frame presses at the end of a frame. */
    endFrame() { pressed.clear(); mouseClicked = false; },
  };
}
