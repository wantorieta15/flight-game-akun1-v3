// Terrain Senja Terbang: langit senja, laut turquoise, kepulauan tropis,
// runway berlampu, mercusuar, desa, awan, dan ring target misi.
const SenjaTerrain = (function () {
  const P = SENJA_CONFIG.palette;

  function buildSky(scene) {
    // Kubah langit gradasi senja: oranye di horizon barat, ungu di atas.
    const geo = new THREE.SphereGeometry(1900, 24, 16);
    const colors = [];
    const pos = geo.attributes.position;
    const top = new THREE.Color(P.skyTop);
    const mid = new THREE.Color(P.skyMid);
    const low = new THREE.Color(P.skyLow);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 1900;
      const c = y > 0.35 ? top.clone().lerp(mid, 1 - (y - 0.35) / 0.65)
        : mid.clone().lerp(low, 1 - (y + 0.12) / 0.47);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
    const sky = new THREE.Mesh(geo, mat);
    scene.add(sky);
    // Matahari senja: cakram oranye besar rendah di barat + halo.
    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(90, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false }),
    );
    sun.position.set(-1250, 150, -900);
    sun.lookAt(0, 150, 0);
    scene.add(sun);
    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(150, 32),
      new THREE.MeshBasicMaterial({ color: 0xff9a3d, transparent: true, opacity: 0.28, fog: false }),
    );
    halo.position.set(-1260, 150, -910);
    halo.lookAt(0, 150, 0);
    scene.add(halo);
    // Bulan kecil di timur (senja sudah dekat malam).
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(26, 24),
      new THREE.MeshBasicMaterial({ color: 0xf5f0ff, fog: false }),
    );
    moon.position.set(1300, 520, 700);
    moon.lookAt(0, 300, 0);
    scene.add(moon);
    return { sun };
  }

  function buildSea(scene) {
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(SENJA_CONFIG.worldSize, SENJA_CONFIG.worldSize, 1, 1),
      new THREE.MeshLambertMaterial({ color: P.sea }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = 0;
    scene.add(sea);
    // Jalur cahaya matahari di laut (pita oranye).
    const glint = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 1900),
      new THREE.MeshBasicMaterial({ color: 0xffb066, transparent: true, opacity: 0.22 }),
    );
    glint.rotation.x = -Math.PI / 2;
    glint.position.set(-620, 0.4, -450);
    glint.rotation.z = 0.5;
    scene.add(glint);
  }

  function makePalm(height) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.1, height, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a6a45 }),
    );
    trunk.position.y = height / 2;
    trunk.rotation.z = 0.12;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(1.6, 7, 4),
        new THREE.MeshLambertMaterial({ color: 0x2e8b3a }),
      );
      const a = (i / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 2.6, height + 0.6, Math.sin(a) * 2.6);
      leaf.rotation.z = Math.cos(a) * 1.1;
      leaf.rotation.x = -Math.sin(a) * 1.1;
      g.add(leaf);
    }
    return g;
  }

  function makeHouse(color) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(7, 5, 6),
      new THREE.MeshLambertMaterial({ color }),
    );
    base.position.y = 2.5;
    g.add(base);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.6, 3.4, 4),
      new THREE.MeshLambertMaterial({ color: 0xb3541e }),
    );
    roof.position.y = 6.6;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
    );
    win.position.set(0, 2.8, 3.1);
    g.add(win);
    return g;
  }

  function buildIsland(scene, isl, index) {
    const g = new THREE.Group();
    g.position.set(isl.x, 0, isl.z);
    // Pantai pasir: cakram datar.
    const beach = new THREE.Mesh(
      new THREE.CylinderGeometry(isl.radius, isl.radius, 2.4, 28),
      new THREE.MeshLambertMaterial({ color: P.sand }),
    );
    beach.position.y = 1;
    g.add(beach);
    // Bukit hijau vulkanik (kerucut) — digeser ke sisi pulau supaya koridor runway bebas.
    const hillX = isl.radius * 0.45;
    const hillZ = -isl.radius * 0.35;
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(isl.radius * 0.6, isl.hill, 10),
      new THREE.MeshLambertMaterial({ color: isl.id === 'merapi' ? P.volcano : P.hill }),
    );
    hill.position.set(hillX, isl.hill / 2 + 1, hillZ);
    g.add(hill);
    const hillTop = new THREE.Mesh(
      new THREE.ConeGeometry(isl.radius * 0.3, isl.hill * 0.55, 8),
      new THREE.MeshLambertMaterial({ color: P.grass }),
    );
    hillTop.position.set(hillX, isl.hill * 0.72 + 1, hillZ);
    g.add(hillTop);
    // Palem di tepi pantai.
    const palms = 5;
    for (let i = 0; i < palms; i++) {
      const a = (i / palms) * Math.PI * 2 + index;
      const r = isl.radius * 0.86;
      const palm = makePalm(9 + (i % 3) * 2);
      palm.position.set(Math.cos(a) * r, 2, Math.sin(a) * r);
      g.add(palm);
    }
    // Desa kecil: 4 rumah beratap oranye dengan jendela menyala.
    const houseColors = [0xfff2d9, 0xffe0b3, 0xf5d0a9, 0xffffff];
    for (let i = 0; i < 4; i++) {
      const house = makeHouse(houseColors[(i + index) % 4]);
      const a = 0.6 + i * 0.9;
      house.position.set(Math.cos(a) * isl.radius * 0.55, 2, Math.sin(a) * isl.radius * 0.55);
      house.rotation.y = a;
      g.add(house);
    }
    scene.add(g);
    return g;
  }

  function buildRunway(scene, isl) {
    const g = new THREE.Group();
    g.position.set(isl.x, 0, isl.z);
    // Landasan aspal gelap + garis tengah putih.
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(26, 1.2, 300),
      new THREE.MeshLambertMaterial({ color: P.runway }),
    );
    strip.position.y = 2.2;
    g.add(strip);
    for (let z = -130; z <= 130; z += 26) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.3, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      dash.position.set(0, 2.9, z);
      g.add(dash);
    }
    // Lampu tepi runway: bola oranye menyala, kiri-kanan tiap 58 m.
    const lampGeo = new THREE.SphereGeometry(1.6, 8, 8);
    const lampMat = new THREE.MeshBasicMaterial({ color: P.lampWarm });
    const lamps = [];
    for (let z = -145; z <= 145; z += 58) {
      for (const side of [-14.5, 14.5]) {
        const lamp = new THREE.Mesh(lampGeo, lampMat);
        lamp.position.set(side, 3.4, z);
        g.add(lamp);
        lamps.push(lamp);
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 1.6, 6),
          new THREE.MeshLambertMaterial({ color: 0x444444 }),
        );
        pole.position.set(side, 2.4, z);
        g.add(pole);
      }
    }
    // Lampu ambang (threshold) hijau di kedua ujung runway.
    for (const z of [-150, 150]) {
      for (let x = -12; x <= 12; x += 6) {
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(1.4, 8, 8),
          new THREE.MeshBasicMaterial({ color: P.lampGreen }),
        );
        lamp.position.set(x, 3.2, z);
        g.add(lamp);
      }
    }
    // Windsock oranye di samping runway.
    const sockPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 14, 6),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }),
    );
    sockPole.position.set(24, 8, -120);
    g.add(sockPole);
    const sock = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 9, 8),
      new THREE.MeshBasicMaterial({ color: 0xff6a00 }),
    );
    sock.position.set(24, 15, -116);
    sock.rotation.z = -Math.PI / 2;
    g.add(sock);
    // Papan nama pulau mengambang di ujung runway (teks via canvas texture lokal).
    scene.add(g);
    return { group: g, lamps };
  }

  function buildLighthouse(scene, isl) {
    const g = new THREE.Group();
    g.position.set(isl.x + isl.radius * 0.45, 0, isl.z - isl.radius * 0.3);
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 5.5, 34, 10),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    );
    tower.position.y = 19;
    g.add(tower);
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 4.9, 6, 10),
      new THREE.MeshLambertMaterial({ color: 0xd94f30 }),
    );
    band.position.y = 26;
    g.add(band);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff6c9 }),
    );
    lamp.position.y = 37;
    g.add(lamp);
    // Sorot cahaya: kerucut transparan berputar.
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(7, 90, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
    );
    beam.position.y = 37;
    beam.rotation.z = Math.PI / 2;
    beam.position.x = 45;
    g.add(beam);
    scene.add(g);
    return { group: g, beam, lamp };
  }

  function buildFuelPad(scene, isl) {
    const g = new THREE.Group();
    g.position.set(isl.x + 60, 0, isl.z + 90);
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 16, 1.6, 18),
      new THREE.MeshLambertMaterial({ color: 0x2e6f8e }),
    );
    pad.position.y = 2.4;
    g.add(pad);
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 5, 10, 12),
      new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }),
    );
    tank.position.set(-12, 8, -8);
    g.add(tank);
    const tank2 = tank.clone();
    tank2.position.set(12, 8, 8);
    tank2.material = new THREE.MeshLambertMaterial({ color: 0xffc861 });
    g.add(tank2);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(10, 5, 0.6),
      new THREE.MeshBasicMaterial({ color: 0x39e75f }),
    );
    sign.position.set(0, 9, -14);
    g.add(sign);
    scene.add(g);
    return g;
  }

  // Ring target bercahaya (torus + bola penanda) di atas titik misi.
  function makeTargetRing(color) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(26, 2.2, 10, 40),
      new THREE.MeshBasicMaterial({ color }),
    );
    g.add(ring);
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(16, 1.1, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
    );
    g.add(inner);
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 120, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14 }),
    );
    beacon.position.y = 60;
    g.add(beacon);
    return g;
  }

  function buildClouds(scene) {
    const clouds = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0xffd9c2, transparent: true, opacity: 0.92 });
    const mat2 = new THREE.MeshLambertMaterial({ color: 0xc9a0d8, transparent: true, opacity: 0.9 });
    const spots = [
      [-700, 260, -500], [-200, 300, -1100], [500, 240, -900], [900, 320, 300],
      [-1100, 280, 600], [200, 340, 900], [-400, 220, 1100], [1200, 260, -200],
    ];
    spots.forEach(([x, y, z], i) => {
      const c = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(26 + k * 9, 8, 8),
          i % 2 ? mat2 : mat,
        );
        puff.position.set(k * 34 - 50, (k % 2) * 8, (k % 3) * 12);
        puff.scale.y = 0.45;
        c.add(puff);
      }
      c.position.set(x, y, z);
      clouds.add(c);
    });
    scene.add(clouds);
    return clouds;
  }

  function buildWorld(scene) {
    const sky = buildSky(scene);
    buildSea(scene);
    const runways = {};
    let lighthouse = null;
    const fuelPads = {};
    for (let i = 0; i < SENJA_CONFIG.islands.length; i++) {
      const isl = SENJA_CONFIG.islands[i];
      buildIsland(scene, isl, i);
      if (isl.runway) runways[isl.id] = buildRunway(scene, isl);
      if (isl.lighthouse) lighthouse = buildLighthouse(scene, isl);
      if (isl.fuel) fuelPads[isl.id] = buildFuelPad(scene, isl);
    }
    const clouds = buildClouds(scene);
    return { sky, runways, lighthouse, fuelPads, clouds };
  }

  return { buildWorld, makeTargetRing };
})();
