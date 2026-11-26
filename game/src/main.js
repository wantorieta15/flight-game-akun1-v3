// Senja Terbang — boot, game loop, state menu/terbang/pause/menang/kalah,
// mode screenshot (?shot=cover|cockpit|mission|landing), dan hook play-test.
(function () {
  const DEG = Math.PI / 180;
  const params = new URLSearchParams(window.location.search);
  const shotMode = params.get('shot') || null;
  const seedParam = parseInt(params.get('seed') || '1', 10) || 1;

  let renderer, scene, camera, clock;
  let world, aircraft;
  let camState;
  let plane;
  let state;
  let pickupRing, deliverRing;
  let time = 0;
  let frames = 0;
  let errors = [];
  let startedAt = performance.now();

  window.addEventListener('error', (e) => { errors.push(String(e.message || e.error)); });

  function $(id) { return document.getElementById(id); }

  function newGameState() {
    return Object.assign(SenjaMissions.createMissionState(), {
      phase: shotMode ? 'flying' : 'menu', // mode shot langsung terbang
      score: 0,
      reason: '',
      cameraMode: 'chase',
    });
  }

  function buildScene() {
    const canvas = $('game');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd88a6a, 500, 1800);
    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 4200);
    camera.position.set(0, 12, 90);
    // Cahaya senja: matahari hangat dari barat + ambient ungu.
    const sunLight = new THREE.DirectionalLight(0xffb066, 1.9);
    sunLight.position.set(-800, 220, -600);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x8a6aa8, 1.05));
    const hemi = new THREE.HemisphereLight(0x9a6ab8, 0x1fa8a0, 0.5);
    scene.add(hemi);
    world = SenjaTerrain.buildWorld(scene);
    aircraft = SenjaAircraft.buildAircraft();
    scene.add(aircraft.group);
    camState = SenjaCamera.createCameraState();
    // Ring target misi (dipindah tiap misi aktif).
    pickupRing = SenjaTerrain.makeTargetRing(0x39e75f);
    deliverRing = SenjaTerrain.makeTargetRing(0xffc861);
    scene.add(pickupRing);
    scene.add(deliverRing);
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function placeRings() {
    const m = SenjaMissions.currentMission(state);
    if (!m) { pickupRing.visible = false; deliverRing.visible = false; return; }
    const from = SenjaMissions.islandById(m.from);
    const to = SenjaMissions.islandById(m.to);
    pickupRing.visible = !state.pickedUp;
    pickupRing.position.set(from.x, 55, from.z);
    pickupRing.rotation.y = time * 0.4;
    deliverRing.visible = !!state.pickedUp;
    deliverRing.position.set(to.x, 55, to.z);
    deliverRing.rotation.y = -time * 0.4;
    // Ring berdenyut.
    const s = 1 + Math.sin(time * 3) * 0.06;
    pickupRing.scale.set(s, s, s);
    deliverRing.scale.set(s, s, s);
  }

  function handleEvents(events) {
    for (const ev of events) {
      if (ev.type === 'takeoff') SenjaHud.showMessage('🛫 Lepas landas! Terbang lewat RING HIJAU untuk ambil paket.');
      if (ev.type === 'turnback') SenjaHud.showMessage('🧭 Ujung peta — pesawat berbalik otomatis.');
      if (ev.type === 'missionStart') {
        const m = ev.mission;
        const to = SenjaMissions.islandById(m.to);
        SenjaHud.showMessage('📦 MISI: ' + m.name + ' — ' + m.cargo + ' → ' + to.name);
      }
      if (ev.type === 'pickup') {
        SenjaAudio.playPickup();
        SenjaHud.showMessage('📦 Paket "' + ev.mission.name + '" dimuat! Antar ke ' +
          SenjaMissions.islandById(ev.mission.to).name + ' — cari RING KUNING / runway berlampu.');
      }
      if (ev.type === 'deliver') {
        SenjaAudio.playDeliver();
        state.score += 0; // skor sudah ditambah di missions.js
        SenjaHud.showMessage('✅ Terkirim! +' + ev.gained + ' poin' + (ev.landed ? ' (mendarat mulus!)' : ' (drop lewat ring)'));
      }
      if (ev.type === 'shake') SenjaHud.showMessage('⚠ Guncangan! Kaca patri retak — ' + ev.count + '/2. Terbang halus!');
      if (ev.type === 'fragileBroken') {
        SenjaHud.showMessage('💔 Kaca patri PECAH — penalti 150 poin.');
        SenjaAudio.playCrash();
      }
      if (ev.type === 'land') SenjaHud.showMessage('🛬 Mendarat mulus. Fuel terisi di pulau ini.');
      if (ev.type === 'ditch') SenjaHud.showMessage('🌊 Pendaratan darurat — pesawat rusak 20-25%.');
      if (ev.type === 'crash') {
        SenjaAudio.playCrash();
        SenjaHud.showMessage('💥 Tabrakan! Kerusakan ' + Math.round(plane.damage) + '%.');
      }
      if (ev.type === 'win') {
        state.phase = 'won';
        SenjaAudio.playWin();
        SenjaAudio.stopLowFuelAlarm();
        showEnd(true, '');
      }
      if (ev.type === 'lose') {
        state.phase = 'lost';
        SenjaAudio.playCrash();
        SenjaAudio.stopLowFuelAlarm();
        state.reason = ev.reason;
        showEnd(false, ev.reason);
      }
    }
  }

  function showEnd(won, reason) {
    const overlay = $('end-screen');
    $('end-title').textContent = won ? '🎉 SEMUA PAKET TERKIRIM!' : '💥 PENERBANGAN BERAKHIR';
    $('end-score').textContent = 'Skor akhir: ' + state.score.toLocaleString('en-US') +
      ' • Terkirim ' + state.delivered + '/3 paket';
    $('end-reason').textContent = won
      ? 'Kurir senja terbaik Kepulauan! Semua paket sampai sebelum gelap.'
      : reason;
    overlay.classList.remove('hidden');
    window.__senjaEnd = { won, score: state.score, delivered: state.delivered };
  }

  function startFlying() {
    state.phase = 'flying';
    $('menu-screen').classList.add('hidden');
    $('end-screen').classList.add('hidden');
    SenjaAudio.ensureContext();
    SenjaAudio.playClick();
    SenjaMissions.startMission(state, []);
    SenjaHud.showMessage('📦 MISI 1: Surat Kilat — lepas landas (tahan Shift), terbang lewat RING HIJAU di Pulau Senja.');
  }

  // Bingkai panel kokpit (dashboard + pilar kanopi) hanya di mode kokpit.
  function syncCockpitFrame() {
    const frame = $('cockpit-frame');
    if (frame) frame.classList.toggle('hidden', camState.mode !== 'cockpit');
  }

  function resetGame() {
    plane = SenjaFlight.createPlane();
    state = newGameState();
    window.__senjaEnd = null;
    camState = SenjaCamera.createCameraState();
    $('menu-screen').classList.remove('hidden');
    $('end-screen').classList.add('hidden');
    syncCockpitFrame();
    if (shotMode) applyShot(shotMode);
  }

  // Mode screenshot: atur pesawat & misi ke momen yang sudah ditentukan.
  function applyShot(mode) {
    state.phase = 'flying';
    $('menu-screen').classList.add('hidden');
    const m1 = SENJA_CONFIG.missions[0];
    const m2 = SENJA_CONFIG.missions[1];
    if (mode === 'cover') {
      // Chase view: pesawat besar tengah-bawah, Pulau Karang + runway berlampu + ring di depan.
      plane.x = -820; plane.y = 70; plane.z = -560;
      plane.heading = 321; plane.pitch = -3; plane.roll = -5;
      plane.speed = 62; plane.throttle = 0.72; plane.airborne = true; plane.onGround = false;
      plane.fuel = 62; state.sunsetLeft = 312;
      state.missionIndex = 0; state.pickedUp = true; state.carrying = m1;
      state.missionTimeLeft = 96; state.score = 0;
      camState.mode = 'chase';
    } else if (mode === 'cockpit') {
      // Kokpit (revisi v3-rev1): kamera di dalam kanopi — hidung cream +
      // baling-baling berputar di depan, dashboard + pilar kanopi di tepi
      // frame; Pulau Mercusuar + mercusuar di depan.
      plane.x = 320; plane.y = 120; plane.z = 720;
      plane.heading = 166; plane.pitch = -2; plane.roll = 6;
      plane.speed = 58; plane.throttle = 0.66; plane.airborne = true; plane.onGround = false;
      plane.fuel = 74; state.sunsetLeft = 388;
      state.missionIndex = 0; state.pickedUp = true; state.carrying = m1;
      state.missionTimeLeft = 118; state.score = 0;
      camState.mode = 'cockpit';
    } else if (mode === 'mission') {
      // Momen ambil paket: pesawat menuju RING HIJAU di atas Pulau Senja dari selatan.
      plane.x = 0; plane.y = 45; plane.z = 330;
      plane.heading = 0; plane.pitch = -4; plane.roll = 3;
      plane.speed = 48; plane.throttle = 0.85; plane.airborne = true; plane.onGround = false;
      plane.fuel = 88; state.sunsetLeft = 421;
      state.missionIndex = 0; state.pickedUp = false; state.carrying = null;
      state.missionTimeLeft = 132; state.score = 0;
      camState.mode = 'chase';
    } else if (mode === 'landing') {
      // Final approach ke runway Pulau Karang: rendah, pelan, lampu runway menyala.
      plane.x = -980; plane.y = 22; plane.z = -420;
      plane.heading = 0; plane.pitch = -4; plane.roll = 0;
      plane.speed = 36; plane.throttle = 0.42; plane.airborne = true; plane.onGround = false;
      plane.fuel = 41; state.sunsetLeft = 168;
      state.missionIndex = 0; state.pickedUp = true; state.carrying = m1;
      state.missionTimeLeft = 44; state.score = 300;
      camState.mode = 'chase';
    }
    state.cameraMode = camState.mode;
    syncCockpitFrame();
    // Snap kamera ke posisi shot supaya frame pertama sudah benar.
    for (let i = 0; i < 40; i++) SenjaCamera.updateCamera(camera, camState, plane, 1 / 60, time);
    window.__shotReady = true;
  }

  function step(dt) {
    time += dt;
    frames += 1;
    if (state.phase === 'flying') {
      // Tombol sekali tekan.
      if (SenjaInput.wasPressed('KeyC')) {
        const mode = SenjaCamera.toggleMode(camState);
        state.cameraMode = mode;
        SenjaHud.showMessage(mode === 'cockpit' ? '👁️ View: KOKPIT' : '✈️ View: CHASE');
        SenjaAudio.playClick();
      }
      if (SenjaInput.wasPressed('KeyP')) {
        state.phase = 'paused';
        $('pause-screen').classList.remove('hidden');
        return;
      }
      if (SenjaInput.wasPressed('KeyM')) {
        const muted = SenjaAudio.toggleMute();
        SenjaHud.showMessage(muted ? '🔇 Suara mati' : '🔊 Suara hidup');
      }
      if (SenjaInput.wasPressed('KeyL')) {
        SenjaHud.showMessage('💡 Lampu landing menyala.');
        SenjaAudio.playClick();
      }
      if (SenjaInput.wasPressed('KeyR')) { resetGame(); startFlying(); return; }
      const events = [];
      SenjaFlight.updateFlight(plane, SenjaInput, SenjaMissions.currentMission(state), dt, events);
      SenjaMissions.updateMissions(state, plane, dt, time, events);
      handleEvents(events);
      if (state.phase !== 'flying') return;
      if (plane.fuel < 20 && plane.fuel > 0) SenjaAudio.startLowFuelAlarm();
      else SenjaAudio.stopLowFuelAlarm();
      SenjaAudio.updateEngine(plane.throttle, SenjaFlight.speedKnots(plane), plane.airborne);
      // Drag mouse: orbit kamera sedikit (chase).
      const drag = SenjaInput.takeDrag();
      if (drag.x || drag.y) {
        camState.orbitX = Math.max(-120, Math.min(120, camState.orbitX + drag.x * 0.4));
        camState.orbitY = Math.max(-80, Math.min(80, camState.orbitY + drag.y * 0.4));
      } else {
        camState.orbitX *= 0.95;
        camState.orbitY *= 0.95;
      }
    } else if (state.phase === 'paused') {
      if (SenjaInput.wasPressed('KeyP') || SenjaInput.wasPressed('Enter')) {
        state.phase = 'flying';
        $('pause-screen').classList.add('hidden');
      }
      if (SenjaInput.wasPressed('KeyR')) { $('pause-screen').classList.add('hidden'); resetGame(); startFlying(); }
    } else if (state.phase === 'menu') {
      // Kamera menu: orbit pelan mengelilingi pesawat di runway.
      const a = time * 0.08;
      camera.position.set(Math.sin(a) * 42, 14, Math.cos(a) * 42);
      camera.lookAt(0, 4, 0);
      plane.propAngle += dt * 2;
      if (SenjaInput.wasPressed('Enter')) startFlying();
    }
    // Klik tombol menu / akhir.
    for (const click of SenjaInput.takeClicks()) {
      const el = document.elementFromPoint(click.x, click.y);
      if (!el) continue;
      if (el.id === 'btn-start' || el.closest('#btn-start')) startFlying();
      if (el.id === 'btn-restart' || el.closest('#btn-restart')) { resetGame(); startFlying(); }
      if (el.id === 'btn-menu' || el.closest('#btn-menu')) { resetGame(); }
      if (el.id === 'btn-resume' || el.closest('#btn-resume')) {
        state.phase = 'flying';
        $('pause-screen').classList.add('hidden');
      }
    }
    if (state.phase === 'flying' || state.phase === 'paused') {
      SenjaCamera.updateCamera(camera, camState, plane, dt, time);
      syncCockpitFrame();
    }
    // Revisi v3-rev1: baling-baling selalu terlihat, termasuk dari kokpit;
    // kanopi kaca disembunyikan di mode kokpit (transparan dari dalam).
    SenjaAircraft.updateAircraft(aircraft, plane, dt, time, false, camState.mode === 'cockpit');
    if (world.lighthouse) world.lighthouse.beam.rotation.y = time * 0.7;
    placeRings();
    SenjaHud.updateHud(state, plane);
  }

  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    step(dt);
    renderer.render(scene, camera);
  }

  function boot() {
    clock = new THREE.Clock();
    plane = SenjaFlight.createPlane();
    state = newGameState();
    buildScene();
    SenjaHud.init();
    SenjaInput.attach();
    $('btn-start').addEventListener('click', startFlying);
    $('btn-restart').addEventListener('click', () => { resetGame(); startFlying(); });
    $('btn-menu').addEventListener('click', resetGame);
    $('btn-resume').addEventListener('click', () => {
      state.phase = 'flying';
      $('pause-screen').classList.add('hidden');
    });
    if (shotMode) {
      applyShot(shotMode);
      SenjaMissions.startMission(state, []);
      // Bekukan timer misi di shot landing/cover supaya HUD stabil saat screenshot.
      if (shotMode === 'landing' || shotMode === 'cover') state._frozen = true;
    }
    // Hook play-test: state game bisa dibaca & dikendalikan dari luar.
    window.SENJA = {
      get state() { return state; },
      get plane() { return plane; },
      get errors() { return errors; },
      get frames() { return frames; },
      get phase() { return state.phase; },
      get mission() { return SenjaMissions.currentMission(state); },
      start: startFlying,
      reset: resetGame,
      input: SenjaInput,
      // Hook play-test headless: majukan simulasi N detik tanpa menunggu render
      // (renderer software di VM lambat; logika game yang diuji sama persis).
      stepSeconds(sec) {
        const n = Math.max(1, Math.round(sec * 60));
        for (let i = 0; i < n; i++) step(1 / 60);
        return { frames, phase: state.phase, speed: plane.speed, alt: plane.y };
      },
      camPos: () => [camera.position.x, camera.position.y, camera.position.z].map((v) => Math.round(v)),
      planePos: () => [Math.round(plane.x), Math.round(plane.y), Math.round(plane.z)],
      camMode: () => camState.mode,
      version: 'senja-terbang-v3-akun1',
      shotMode,
    };
    loop();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
