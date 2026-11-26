// Model terbang arcade Senja Terbang: throttle, pitch, roll, lift, drag, fuel, kerusakan.
// Pesawat bergerak di bidang XZ, heading derajat, pitch & roll memengaruhi arah & belokan.
// 1 unit dunia = 1 m; kecepatan tampil knot (1 m/s = 1,944 kt), ketinggian tampil kaki (1 m = 3,28 ft).
const SenjaFlight = (function () {
  const DEG = Math.PI / 180;

  function createPlane() {
    return {
      x: 0, y: 2, z: 60,          // di ujung runway Pulau Senja, siap lepas landas
      heading: 0,                 // 0 = ke utara (-Z), derajat
      pitch: 0,                   // derajat, + = hidung naik
      roll: 0,                    // derajat, + = miring kanan
      speed: 0,                   // m/s
      throttle: 0,
      verticalSpeed: 0,           // m/s
      fuel: SENJA_CONFIG.fuelCapacity,
      damage: 0,
      airborne: false,
      onGround: true,
      gForce: 1,
      propAngle: 0,
      landedAt: null,
      gearDown: true,
    };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Berat misi memengaruhi respons: paket berat = handling lambat & boros.
  function missionModifiers(mission) {
    if (!mission) return { handling: 1, burn: 1, maxSpeed: 1 };
    if (mission.kind === 'berat') return { handling: 0.62, burn: 1.45, maxSpeed: 0.85 };
    if (mission.kind === 'rapuh') return { handling: 0.85, burn: 1.0, maxSpeed: 0.92 };
    return { handling: 1.05, burn: 0.9, maxSpeed: 1.05 };
  }

  function updateFlight(plane, input, mission, dt, events) {
    const mod = missionModifiers(mission);
    // Throttle: Shift naik, Control turun.
    if (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) plane.throttle = clamp(plane.throttle + dt * 0.55, 0, 1);
    if (input.isDown('ControlLeft') || input.isDown('ControlRight')) plane.throttle = clamp(plane.throttle - dt * 0.55, 0, 1);
    const airbrake = input.isDown('Space');

    // Pitch & roll dari panah, respons dilembutkan oleh handling.
    const pitchRate = 26 * mod.handling;
    const rollRate = 55 * mod.handling;
    let pitchInput = 0;
    let rollInput = 0;
    if (input.isDown('ArrowUp')) pitchInput = 1;
    if (input.isDown('ArrowDown')) pitchInput = -1;
    if (input.isDown('ArrowLeft')) rollInput = -1;
    if (input.isDown('ArrowRight')) rollInput = 1;
    // Pitch: panah atas = hidung turun (stick forward), panah bawah = naik.
    plane.pitch = clamp(plane.pitch + pitchInput * pitchRate * dt, -28, 32);
    plane.roll = clamp(plane.roll + rollInput * rollRate * dt, -65, 65);
    // Roll kembali netral perlahan bila tidak ada input; pitch ikut kembali sedikit.
    if (rollInput === 0) plane.roll *= Math.pow(0.35, dt);
    if (pitchInput === 0) plane.pitch *= Math.pow(0.55, dt);

    // Kecepatan target dari throttle; rem udara & drag menguranginya.
    const maxSpeedMs = 97 * mod.maxSpeed; // ~188 kt
    let targetSpeed = plane.throttle * maxSpeedMs;
    if (airbrake) targetSpeed *= 0.55;
    const accel = plane.onGround ? 14 : 9;
    plane.speed += clamp(targetSpeed - plane.speed, -accel * dt, accel * dt);
    if (plane.speed < 0) plane.speed = 0;

    // G-force kasar dari perubahan roll/pitch mendadak (untuk paket rapuh).
    const gNow = 1 + Math.abs(rollInput) * 0.9 + Math.abs(pitchInput) * 0.5 + Math.abs(plane.roll) / 55;
    plane.gForce += (gNow - plane.gForce) * Math.min(1, dt * 4);

    // Belok: heading berubah sebanding roll & kecepatan.
    const turnRate = plane.roll * 0.55 * clamp(plane.speed / 40, 0, 1);
    plane.heading = (plane.heading + turnRate * dt + 360) % 360;

    // Lift: di atas kecepatan stall, pitch menaikkan pesawat; di bawah stall, pesawat tenggelam.
    const stallMs = SENJA_CONFIG.stallKnots / 1.944;
    const liftFactor = clamp((plane.speed - stallMs * 0.6) / 30, -1, 1);
    let climb = 0;
    if (plane.speed > stallMs * 0.55) {
      climb = Math.sin(plane.pitch * DEG) * plane.speed * liftFactor;
    }
    if (plane.speed < stallMs && plane.y > 3) climb -= (stallMs - plane.speed) * 0.35;
    // Di darat: butuh kecepatan lepas landas + hidung naik.
    if (plane.onGround) {
      if (plane.speed > stallMs * 1.05 && plane.pitch > 4) {
        plane.onGround = false;
        plane.airborne = true;
        events.push({ type: 'takeoff' });
      } else {
        climb = 0;
      }
    }
    plane.verticalSpeed = climb;
    plane.y += climb * dt;

    // Maju sesuai heading & pitch.
    const hRad = plane.heading * DEG;
    const forward = Math.cos(plane.pitch * DEG) * plane.speed * dt;
    plane.x += Math.sin(hRad) * forward;
    plane.z -= Math.cos(hRad) * forward;

    // Batas dunia: pantulkan lembut ke dalam.
    const lim = SENJA_CONFIG.worldSize / 2 - 60;
    if (Math.abs(plane.x) > lim || Math.abs(plane.z) > lim) {
      plane.heading = (plane.heading + 180) % 360;
      plane.x = clamp(plane.x, -lim, lim);
      plane.z = clamp(plane.z, -lim, lim);
      events.push({ type: 'turnback' });
    }

    // Bahan bakar: boros di throttle tinggi & misi berat.
    const burn = (SENJA_CONFIG.fuelBurnPerSecond * (0.25 + plane.throttle) +
      SENJA_CONFIG.fuelBurnThrottleExtra * plane.throttle * plane.throttle) * mod.burn;
    plane.fuel = Math.max(0, plane.fuel - burn * dt);

    // Baling-baling berputar mengikuti throttle.
    plane.propAngle += (4 + plane.throttle * 42) * dt;

    return plane;
  }

  function speedKnots(plane) { return plane.speed * 1.944; }
  function altitudeFeet(plane) { return Math.max(0, plane.y * 3.281); }

  // Ketinggian terrain di satu titik (0 laut, bukit pulau, landasan datar).
  function terrainHeightAt(x, z) {
    let h = 0;
    for (const isl of SENJA_CONFIG.islands) {
      // Bukit digeser seperti di buildIsland (sisi pulau, runway bebas).
      const hx = x - (isl.x + isl.radius * 0.45);
      const hz = z - (isl.z - isl.radius * 0.35);
      const d = Math.sqrt(hx * hx + hz * hz);
      if (d < isl.radius * 0.6) {
        const t = 1 - d / (isl.radius * 0.6);
        h = Math.max(h, isl.hill * t * t);
      }
      const dx = x - isl.x;
      const dz = z - isl.z;
      if (isl.runway) {
        // Landasan datar: koridor runway (sumbu Z pulau, lebar 26) rata 2 m.
        const along = Math.abs(dz);
        const across = Math.abs(dx);
        if (along < 150 && across < 14) h = Math.min(h, 2);
        else if (Math.sqrt(dx * dx + dz * dz) < isl.radius) h = Math.max(h, 2);
      } else if (Math.sqrt(dx * dx + dz * dz) < isl.radius) {
        h = Math.max(h, 2);
      }
    }
    return h;
  }

  function nearRunway(plane, islandId) {
    const isl = SENJA_CONFIG.islands.find((i) => i.id === islandId);
    if (!isl || !isl.runway) return false;
    return Math.abs(plane.x - isl.x) < 16 && Math.abs(plane.z - isl.z) < 150;
  }

  return {
    createPlane, updateFlight, speedKnots, altitudeFeet,
    terrainHeightAt, nearRunway, missionModifiers, clamp,
  };
})();
