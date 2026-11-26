// Input keyboard + mouse untuk Senja Terbang.
// Keyboard: atas/bawah pitch, kiri/kanan roll, Shift throttle naik, Ctrl throttle turun,
// Space rem udara, C ganti kamera, P pause, R restart, M mute, L lampu landing, Enter mulai.
const SenjaInput = (function () {
  const keys = {};
  const pressed = {};
  let mouseClicks = [];
  let dragDelta = { x: 0, y: 0 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function isDown(code) { return !!keys[code]; }
  function wasPressed(code) {
    if (pressed[code]) { pressed[code] = false; return true; }
    return false;
  }
  function takeClicks() {
    const c = mouseClicks;
    mouseClicks = [];
    return c;
  }
  function takeDrag() {
    const d = dragDelta;
    dragDelta = { x: 0, y: 0 };
    return d;
  }

  function attach() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!keys[e.code]) pressed[e.code] = true;
      keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    window.addEventListener('blur', () => {
      for (const k in keys) keys[k] = false;
    });
    const canvas = document.getElementById('game');
    if (canvas) {
      canvas.addEventListener('mousedown', (e) => {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
      });
      window.addEventListener('mouseup', (e) => {
        if (dragging) {
          dragging = false;
          mouseClicks.push({ x: e.clientX, y: e.clientY, button: e.button });
        }
      });
      window.addEventListener('mousemove', (e) => {
        if (dragging) {
          dragDelta.x += e.clientX - lastX;
          dragDelta.y += e.clientY - lastY;
          lastX = e.clientX; lastY = e.clientY;
        }
      });
    }
  }

  // Untuk play-test headless: injeksikan tombol secara sintetis.
  function injectKey(code, down) {
    if (down) { if (!keys[code]) pressed[code] = true; keys[code] = true; }
    else keys[code] = false;
  }

  return { attach, isDown, wasPressed, takeClicks, takeDrag, injectKey, keys };
})();
