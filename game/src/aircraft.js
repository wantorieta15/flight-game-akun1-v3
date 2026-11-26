// Model pesawat kargo baling-baling Senja Terbang — dibangun dari bentuk low-poly:
// badan, sayap, ekor, baling-baling, lampu navigasi, roda, dan kargo di perut.
const SenjaAircraft = (function () {
  const P = SENJA_CONFIG.palette;

  function buildAircraft() {
    const plane = new THREE.Group();
    const orange = new THREE.MeshLambertMaterial({ color: P.planeOrange });
    const cream = new THREE.MeshLambertMaterial({ color: P.planeCream });
    const dark = new THREE.MeshLambertMaterial({ color: P.planeDark });
    const glass = new THREE.MeshLambertMaterial({ color: 0x9fd8e8 });

    // Badan: silinder + hidung kerucut.
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.2, 9, 10), orange);
    body.rotation.x = Math.PI / 2;
    body.position.z = 0.5;
    plane.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 10), cream);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -5.6;
    plane.add(nose);
    // Kanopi kokpit.
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), glass);
    canopy.position.set(0, 1.1, -2.6);
    canopy.scale.set(1, 0.75, 1.6);
    plane.add(canopy);
    // Garis cream di badan.
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.5, 6.4), cream);
    stripe.position.set(0, 0.15, 0.6);
    plane.add(stripe);
    // Sayap utama (sayap atas, lebar) + sayap bawah kecil.
    const wing = new THREE.Mesh(new THREE.BoxGeometry(15, 0.35, 3.2), cream);
    wing.position.set(0, 0.9, -0.6);
    plane.add(wing);
    const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.2), orange);
    wingTipL.position.set(-7.6, 0.9, -0.6);
    plane.add(wingTipL);
    const wingTipR = wingTipL.clone();
    wingTipR.position.x = 7.6;
    plane.add(wingTipR);
    // Ekor: stabilizer horizontal + sirip vertikal.
    const tailH = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 1.8), orange);
    tailH.position.set(0, 0.7, 4.9);
    plane.add(tailH);
    const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 2.4), orange);
    tailV.position.set(0, 1.9, 4.9);
    plane.add(tailV);
    // Baling-baling: hub + 2 bilah, berputar di sumbu Z.
    const prop = new THREE.Group();
    prop.position.set(0, 0, -7.1);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.7, 8), dark);
    hub.rotation.x = Math.PI / 2;
    prop.add(hub);
    const bladeGeo = new THREE.BoxGeometry(0.55, 4.6, 0.18);
    const blade1 = new THREE.Mesh(bladeGeo, dark);
    prop.add(blade1);
    const blade2 = new THREE.Mesh(bladeGeo, dark);
    blade2.rotation.z = Math.PI / 2;
    prop.add(blade2);
    // Cakram blur baling-baling (terlihat saat throttle tinggi).
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
    );
    disc.position.z = -0.15;
    prop.add(disc);
    plane.add(prop);
    // Lampu navigasi: merah kiri, hijau kanan, putih ekor (menyala).
    const navL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    navL.position.set(-7.6, 0.9, -0.6);
    plane.add(navL);
    const navR = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22ff66 }));
    navR.position.set(7.6, 0.9, -0.6);
    plane.add(navR);
    const navT = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    navT.position.set(0, 0.9, 5.6);
    plane.add(navT);
    // Roda pendaratan.
    for (const sx of [-1.4, 1.4]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 6), dark);
      leg.position.set(sx, -1.6, -1.2);
      plane.add(leg);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10), dark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx, -2.4, -1.2);
      plane.add(wheel);
    }
    // Peti kargo di bawah badan (tanda courier).
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.6), new THREE.MeshLambertMaterial({ color: 0xc98f2e }));
    crate.position.set(0, -1.9, 1.6);
    plane.add(crate);
    plane.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    return { group: plane, prop, navL, navR };
  }

  // Sinkronkan mesh pesawat dengan state terbang.
  // hideProp: di mode kokpit, baling-baling disembunyikan — dari kokpit ia hanya
  // blur di depan hidung dan akan menutupi terrain (kamera 2 m di belakangnya).
  function updateAircraft(mesh, plane, dt, time, hideProp) {
    mesh.group.position.set(plane.x, plane.y + 1.2, plane.z);
    mesh.group.rotation.order = 'YXZ';
    // Yaw: hidung model (-Z lokal) harus menunjuk ke arah gerak (sin h, -cos h),
    // jadi rotation.y = -heading (rotY(-h) memetakan -Z ke (sin h, -cos h)).
    mesh.group.rotation.y = (-plane.heading * Math.PI) / 180;
    mesh.group.rotation.x = (plane.pitch * Math.PI) / 180;
    mesh.group.rotation.z = (-plane.roll * Math.PI) / 180;
    mesh.prop.rotation.z = plane.propAngle;
    mesh.prop.visible = !hideProp;
    // Lampu navigasi berkedip.
    const blink = Math.sin(time * 6) > 0;
    mesh.navL.visible = blink;
    mesh.navR.visible = blink;
  }

  return { buildAircraft, updateAircraft };
})();
