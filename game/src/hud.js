// HUD Senja Terbang: angka besar ALT/SPD/HDG, kompas strip, fuel gauge,
// timer senja, panel misi, dan dial instrumen analog MENYALA (canvas 2D:
// altimeter, airspeed, heading, fuel, vertical speed — jarum + lampu).
const SenjaHud = (function () {
  let els = {};
  let dialCtx = null;

  function init() {
    els = {
      alt: document.getElementById('hud-alt'),
      spd: document.getElementById('hud-spd'),
      hdg: document.getElementById('hud-hdg'),
      fuelBar: document.getElementById('fuel-fill'),
      fuelText: document.getElementById('fuel-text'),
      sunBar: document.getElementById('sun-fill'),
      sunText: document.getElementById('sun-text'),
      score: document.getElementById('hud-score'),
      mission: document.getElementById('mission-panel'),
      message: document.getElementById('hud-message'),
      warn: document.getElementById('hud-warn'),
      compass: document.getElementById('compass-strip'),
      throttle: document.getElementById('throttle-fill'),
      speedTape: document.getElementById('speed-tape'),
      altTape: document.getElementById('alt-tape'),
    };
    const dial = document.getElementById('dials');
    if (dial) dialCtx = dial.getContext('2d');
  }

  function fmtTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function drawDial(ctx, cx, cy, r, label, value, min, max, unit, warnAt) {
    // Pelat dial gelap + cincin menyala.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#101018';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = warnAt !== undefined && value <= warnAt ? '#ff5533' : '#ffc861';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,200,97,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Tick.
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      const x1 = cx + Math.cos(a) * (r - 8);
      const y1 = cy + Math.sin(a) * (r - 8);
      const x2 = cx + Math.cos(a) * (r - 15);
      const y2 = cy + Math.sin(a) * (r - 15);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = i % 5 === 0 ? 2.5 : 1.2;
      ctx.stroke();
    }
    // Jarum.
    const frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const a = Math.PI * 0.75 + frac * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * (r - 18), cy + Math.sin(a) * (r - 18));
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffc861';
    ctx.fill();
    // Label + angka: angka di tengah-bawah, label menempel di dalam rim.
    // Revisi v3-rev1: label & angka dibesarkan 1 px + warna label lebih terang
    // supaya terbaca dari screenshot 1280×720.
    ctx.fillStyle = '#ffc861';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy + r - 15);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(unit, cx, cy + 8);
    ctx.restore();
  }

  function drawDials(plane, mission) {
    if (!dialCtx) return;
    const ctx = dialCtx;
    ctx.clearRect(0, 0, 560, 120);
    const spd = SenjaFlight.speedKnots(plane);
    const alt = SenjaFlight.altitudeFeet(plane);
    drawDial(ctx, 62, 60, 46, 'AIRSPEED', spd, 0, 200, Math.round(spd) + ' kt');
    drawDial(ctx, 178, 60, 46, 'ALTIMETER', alt, 0, 6000, Math.round(alt) + ' ft');
    drawDial(ctx, 294, 60, 46, 'HEADING', plane.heading, 0, 360, Math.round(plane.heading) + '°');
    drawDial(ctx, 410, 60, 46, 'FUEL', plane.fuel, 0, 100, Math.round(plane.fuel) + '%', 20);
    drawDial(ctx, 512, 60, 46, 'VERT SPEED', plane.verticalSpeed * 196.85, -2000, 2000, Math.round(plane.verticalSpeed * 196.85) + ' fpm');
    // Lampu status di bawah dial fuel.
    ctx.beginPath();
    ctx.arc(410, 112, 5, 0, Math.PI * 2);
    ctx.fillStyle = plane.fuel < 20 ? (Math.sin(Date.now() / 150) > 0 ? '#ff3333' : '#550000') : '#39e75f';
    ctx.fill();
  }

  function compassStrip(heading) {
    const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    let out = '';
    for (let d = -30; d <= 30; d += 15) {
      const h = (Math.round(heading) + d + 360) % 360;
      const label = h % 45 === 0 ? points[Math.round(h / 45) % 8] : String(h).padStart(3, '0');
      out += '<span style="display:inline-block;width:46px;text-align:center;opacity:' +
        (d === 0 ? '1' : '0.6') + ';color:' + (d === 0 ? '#39e75f' : '#ffe9a8') + '">' + label + '</span>';
    }
    return out;
  }

  function updateHud(state, plane) {
    if (!plane) return;
    const spd = Math.round(SenjaFlight.speedKnots(plane));
    const alt = Math.round(SenjaFlight.altitudeFeet(plane));
    const hdg = Math.round(plane.heading);
    if (els.alt) els.alt.textContent = alt.toLocaleString('en-US');
    if (els.spd) els.spd.textContent = spd;
    if (els.hdg) els.hdg.textContent = String(hdg).padStart(3, '0') + '°';
    if (els.score) els.score.textContent = state.score.toLocaleString('en-US');
    if (els.fuelBar) els.fuelBar.style.width = plane.fuel + '%';
    if (els.fuelBar) els.fuelBar.style.background = plane.fuel < 20 ? '#ff5533' : plane.fuel < 45 ? '#ffc861' : '#39e75f';
    if (els.fuelText) els.fuelText.textContent = 'FUEL ' + Math.round(plane.fuel) + '%';
    const sunLeft = state.sunsetLeft;
    if (els.sunBar) els.sunBar.style.width = (sunLeft / SENJA_CONFIG.sunsetSeconds * 100) + '%';
    if (els.sunText) els.sunText.textContent = 'SENJA ' + fmtTime(sunLeft);
    if (els.compass) els.compass.innerHTML = compassStrip(plane.heading);
    if (els.throttle) els.throttle.style.width = Math.round(plane.throttle * 100) + '%';
    if (els.warn) {
      let w = '';
      if (plane.fuel < 20 && plane.fuel > 0) w = '⚠ LOW FUEL — cari Pulau Transit!';
      if (plane.damage >= 60) w = '⚠ KERUSAKAN PARAH';
      if (state.mission && state.mission.kind === 'rapuh' && state.shakes > 0) w = '⚠ KACA RAPUH: guncangan ' + state.shakes + '/2';
      els.warn.textContent = w;
      els.warn.style.display = w ? 'block' : 'none';
    }
    drawDials(plane, state.mission);
    renderMissions(state);
  }

  function renderMissions(state) {
    if (!els.mission) return;
    let html = '<div class="mission-title">📦 MISI KURIR — 3 PAKET</div>';
    SENJA_CONFIG.missions.forEach((m, i) => {
      const done = i < state.missionIndex;
      const active = i === state.missionIndex && state.phase === 'flying';
      const icon = done ? '✅' : active ? '🛫' : '⏳';
      const to = SENJA_CONFIG.islands.find((x) => x.id === m.to);
      html += '<div class="mission-row' + (active ? ' active' : '') + (done ? ' done' : '') + '">' +
        '<b>' + icon + ' ' + m.name + '</b> — ' + m.cargo +
        '<br><span>' + m.weight + ' → ' + to.name + ' • +' + m.baseScore + ' poin</span>' +
        (active ? '<br><span class="mission-hint">' + m.hint + '</span>' : '') +
        '</div>';
    });
    html += '<div class="mission-foot">Terkirim: ' + state.delivered + '/3 • Landing di runway tujuan = antar!</div>';
    els.mission.innerHTML = html;
  }

  function showMessage(text, ms) {
    if (!els.message) return;
    els.message.textContent = text;
    els.message.style.opacity = '1';
    clearTimeout(showMessage._t);
    showMessage._t = setTimeout(() => { els.message.style.opacity = '0'; }, ms || 2600);
  }

  return { init, updateHud, showMessage, fmtTime };
})();
