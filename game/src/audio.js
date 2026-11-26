// Audio sintetis WebAudio (tanpa file): dengung baling-baling, angin, bunyi misi & alarm.
// Semua suara dibuat dari oscillator/noise — tidak ada network, tidak ada aset eksternal.
const SenjaAudio = (function () {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windGain = null;
  let windSrc = null;
  let muted = false;
  let alarmTimer = null;

  function ensureContext() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Mesin: dua oscillator detuned, frekuensi ikut throttle.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 62;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 31;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0.0;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      engineOsc2.start();
      // Angin: noise buffer loop lewat bandpass.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      windSrc = ctx.createBufferSource();
      windSrc.buffer = buf;
      windSrc.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0.0;
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSrc.start();
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function beep(freq, dur, type, vol, when) {
    const c = ensureContext();
    if (!c || muted) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function updateEngine(throttle, speedKnots, airborne) {
    const c = ensureContext();
    if (!c || !engineOsc) return;
    if (c.state === 'suspended') c.resume();
    const target = muted ? 0 : (airborne ? 0.05 + throttle * 0.11 : 0.03 + throttle * 0.06);
    engineGain.gain.setTargetAtTime(target, c.currentTime, 0.15);
    engineOsc.frequency.setTargetAtTime(58 + throttle * 68, c.currentTime, 0.2);
    engineOsc2.frequency.setTargetAtTime(29 + throttle * 34, c.currentTime, 0.2);
    windGain.gain.setTargetAtTime(muted ? 0 : Math.min(0.12, speedKnots / 1600), c.currentTime, 0.3);
  }

  function playPickup() { beep(660, 0.12, 'sine', 0.22); beep(990, 0.18, 'sine', 0.22, 0.1); }
  function playDeliver() {
    beep(523, 0.14, 'triangle', 0.24);
    beep(659, 0.14, 'triangle', 0.24, 0.12);
    beep(784, 0.28, 'triangle', 0.26, 0.24);
  }
  function playCrash() { beep(160, 0.5, 'sawtooth', 0.25); beep(90, 0.7, 'sawtooth', 0.25, 0.15); }
  function playClick() { beep(880, 0.05, 'square', 0.08); }
  function playWin() {
    [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.3, 'triangle', 0.22, i * 0.16));
  }

  function startLowFuelAlarm() {
    if (alarmTimer || muted) return;
    alarmTimer = setInterval(() => { beep(1180, 0.09, 'square', 0.07); }, 900);
  }
  function stopLowFuelAlarm() {
    if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }
  }
  function toggleMute() {
    muted = !muted;
    if (muted) stopLowFuelAlarm();
    return muted;
  }

  return {
    ensureContext, updateEngine, playPickup, playDeliver, playCrash,
    playClick, playWin, startLowFuelAlarm, stopLowFuelAlarm, toggleMute,
  };
})();
