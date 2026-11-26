// Misi Senja Terbang: ambil paket di pulau asal, antar ke runway pulau tujuan.
// Ambil = terbang lewat ring di atas pulau asal (atau lepas landas dari sana setelah
// misi dimulai). Antar = mendarat di runway tujuan ATAU terbang pelan-rendah lewat
// ring di atas runway tujuan. Menang: 3 paket terkirim sebelum senja habis.
// Kalah: fuel habis, kerusakan 100%, atau timer senja habis.
const SenjaMissions = (function () {
  function createMissionState() {
    return {
      missionIndex: 0,
      delivered: 0,
      score: 0,
      carrying: null,      // misi yang sedang dibawa
      pickedUp: false,
      missionTimeLeft: 0,
      shakes: 0,           // guncangan paket rapuh
      lastShakeAt: -10,
      sunsetLeft: SENJA_CONFIG.sunsetSeconds,
    };
  }

  function currentMission(state) {
    return SENJA_CONFIG.missions[state.missionIndex] || null;
  }

  function islandById(id) {
    return SENJA_CONFIG.islands.find((i) => i.id === id);
  }

  function startMission(state, events) {
    const m = currentMission(state);
    if (!m) return;
    state.carrying = null;
    state.pickedUp = false;
    state.missionTimeLeft = m.timeLimit;
    state.shakes = 0;
    events.push({ type: 'missionStart', mission: m });
  }

  function distance2D(ax, az, bx, bz) {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  }

  // Dipanggil tiap frame saat terbang: cek ambil/antar, timer, guncangan, fuel, tabrakan.
  function updateMissions(state, plane, dt, time, events) {
    const m = currentMission(state);
    state.sunsetLeft -= dt;
    if (state.sunsetLeft <= 0) {
      events.push({ type: 'lose', reason: 'Senja habis — langit gelap sebelum semua paket terkirim.' });
      return;
    }
    if (!m) return;
    state.missionTimeLeft -= dt;
    if (state.missionTimeLeft <= 0) {
      events.push({ type: 'lose', reason: 'Waktu misi "' + m.name + '" habis.' });
      return;
    }
    const fromIsl = islandById(m.from);
    const toIsl = islandById(m.to);

    // AMBIL: ring di atas pulau asal (alt < 120 m, radius 90 m) atau sedang di runway asal.
    if (!state.pickedUp) {
      const dFrom = distance2D(plane.x, plane.z, fromIsl.x, fromIsl.z);
      const atHomeRunway = SenjaFlight.nearRunway(plane, m.from) && plane.y < 12;
      if ((dFrom < 90 && plane.y < 120 && plane.y > 8) || atHomeRunway) {
        state.pickedUp = true;
        state.carrying = m;
        events.push({ type: 'pickup', mission: m });
      }
    } else {
      // ANTAR: mendarat di runway tujuan (pelan, rendah) atau lewat ring rendah-pelan.
      const dTo = distance2D(plane.x, plane.z, toIsl.x, toIsl.z);
      const landed = SenjaFlight.nearRunway(plane, m.to) && plane.y < 8 &&
        SenjaFlight.speedKnots(plane) < 95 && Math.abs(plane.verticalSpeed) < 6;
      const ringDrop = dTo < 80 && plane.y > 8 && plane.y < 90 &&
        SenjaFlight.speedKnots(plane) < 130;
      if (landed || ringDrop) {
        const timeBonus = Math.round(state.missionTimeLeft * 1.5);
        const smoothBonus = state.shakes === 0 && m.kind === 'rapuh' ? 120 : 0;
        const gained = m.baseScore + timeBonus + smoothBonus;
        state.score += gained;
        state.delivered += 1;
        events.push({ type: 'deliver', mission: m, gained, landed });
        state.missionIndex += 1;
        if (state.missionIndex >= SENJA_CONFIG.missions.length) {
          events.push({ type: 'win' });
        } else {
          startMission(state, events);
        }
        return;
      }
    }

    // Guncangan paket rapuh: g-force tinggi = 1 guncangan (maks 1 per 2 detik).
    if (state.pickedUp && m.kind === 'rapuh' && plane.gForce > 2.1 && time - state.lastShakeAt > 2) {
      state.lastShakeAt = time;
      state.shakes += 1;
      events.push({ type: 'shake', count: state.shakes });
      if (state.shakes >= 3) {
        state.score = Math.max(0, state.score - 150);
        events.push({ type: 'fragileBroken' });
        state.shakes = 0;
      }
    }

    // Isi ulang fuel: diam di runway pulau ber-fuel pad (home / transit).
    const fuelIsl = SENJA_CONFIG.islands.find((i) => i.fuel);
    const nearFuel = SENJA_CONFIG.islands.some((i) => i.fuel &&
      distance2D(plane.x, plane.z, i.x + (i.id === 'transit' ? 60 : 0), i.z + (i.id === 'transit' ? 90 : 0)) < 60);
    if (nearFuel && plane.y < 10 && SenjaFlight.speedKnots(plane) < 25) {
      plane.fuel = Math.min(SENJA_CONFIG.fuelCapacity, plane.fuel + 26 * dt);
    }

    // Fuel habis di udara = jatuh.
    if (plane.fuel <= 0 && plane.y > 4) {
      events.push({ type: 'lose', reason: 'Bahan bakar habis di udara.' });
      return;
    }

    // Tabrakan terrain / laut.
    const ground = SenjaFlight.terrainHeightAt(plane.x, plane.z);
    if (plane.y <= ground + 1.5 && !plane.onGround) {
      const hard = Math.abs(plane.verticalSpeed) > 7 || SenjaFlight.speedKnots(plane) > 120;
      const overRunway = SENJA_CONFIG.islands.some((i) => i.runway && SenjaFlight.nearRunway(plane, i.id));
      if (overRunway && Math.abs(plane.verticalSpeed) < 6 && SenjaFlight.speedKnots(plane) < 95) {
        // Pendaratan mulus di runway.
        plane.onGround = true;
        plane.airborne = false;
        plane.y = ground + 1.5;
        if (hard) plane.damage += 8;
        events.push({ type: 'land', island: overRunway });
      } else if (plane.y <= 1.6 && ground <= 1 && SenjaFlight.speedKnots(plane) < 60) {
        // Mendarat darurat di laut dangkal / pantai — selamat tapi rusak.
        plane.onGround = true;
        plane.airborne = false;
        plane.damage += 25;
        events.push({ type: 'ditch' });
      } else {
        plane.damage += hard ? 55 : 30;
        events.push({ type: 'crash', damage: plane.damage });
        if (plane.damage >= 100) {
          events.push({ type: 'lose', reason: 'Pesawat hancur menabrak terrain.' });
          return;
        }
        // Pantulkan pesawat ke atas supaya bisa lanjut (arcade).
        plane.y = ground + 26;
        plane.verticalSpeed = 0;
        plane.speed *= 0.55;
      }
    }
    // Mendarat di laut saat fuel masih ada tapi kecepatan rendah = ditch.
    if (plane.y <= 1.2 && ground <= 1 && !plane.onGround && SenjaFlight.speedKnots(plane) < 40) {
      plane.onGround = true;
      plane.airborne = false;
      plane.damage += 20;
      events.push({ type: 'ditch' });
    }
  }

  return { createMissionState, currentMission, startMission, updateMissions, distance2D, islandById };
})();
