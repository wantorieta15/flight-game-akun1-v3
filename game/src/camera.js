// Kamera Senja Terbang: chase view (utama) & cockpit view (tombol C).
// Chase: di belakang-bawah pesawat, pesawat besar di tengah-bawah frame, runway
// di depan terlihat.
// Cockpit (REVISI v3-rev1): kamera di kursi pilot — mundur 1,0 m di depan
// titik tengah pesawat (z lokal -1,0), 2,6 m di atas sumbu badan, pandangan
// menunduk ~8,7° melewati hidung. Yang terlihat: baji hidung cream di
// tengah-bawah frame, baling-baling + cakram blur di depan hidung, dan
// Pulau Mercusuar + mercusuar + runway di depan TIDAK tertutup hidung.
// Baling-baling TIDAK lagi disembunyikan di mode kokpit (itulah penanda
// "dari dalam" yang paling jelas). FOV kokpit dilebarkan ke 74 supaya
// hidung + baling-baling + horizon masuk satu frame.
// Bingkai panel kokpit (dashboard + pilar kanopi) digambar sebagai overlay DOM
// #cockpit-frame di index.html, ditampilkan hanya di mode kokpit.
// Transisi dihaluskan (lerp) supaya kamera tidak melawan pilot.
const SenjaCamera = (function () {
  const DEG = Math.PI / 180;
  const CHASE_FOV = 62;
  const COCKPIT_FOV = 74;

  function createCameraState() {
    return {
      mode: 'chase', // 'chase' | 'cockpit'
      orbitX: 0, orbitY: 0, // drag orbit di menu
      smoothPos: new THREE.Vector3(0, 10, 90),
      smoothLook: new THREE.Vector3(0, 5, 0),
      fovApplied: CHASE_FOV,
    };
  }

  // Terapkan FOV mode aktif (kokpit lebih lebar) — hanya saat berubah.
  function applyFov(camera, camState) {
    const want = camState.mode === 'cockpit' ? COCKPIT_FOV : CHASE_FOV;
    if (camState.fovApplied !== want) {
      camState.fovApplied = want;
      camera.fov = want;
      camera.updateProjectionMatrix();
    }
  }

  function updateCamera(camera, camState, plane, dt, time) {
    applyFov(camera, camState);
    const hRad = plane.heading * DEG;
    const backX = -Math.sin(hRad);
    const backZ = Math.cos(hRad);
    let targetPos;
    let targetLook;
    if (camState.mode === 'cockpit') {
      // Mata pilot — REVISI v3-rev1 (iterasi 3, setelah uji visual):
      // Iterasi 1 (kamera di atas kanopi, z -2,0, +1,15 m): hidung MEMENUHI
      // frame, pulau di depan tertutup. Iterasi 2 (z -1,0, +2,6 m): pulau +
      // mercusuar + baling-baling terlihat bagus, TAPI hidung cream
      // tersembunyi di balik punuk kanopi kaca (garis pandang ke ujung
      // hidung menyerempet puncak kanopi). Iterasi 3 menaikkan kamera ke
      // +3,0 m di atas sumbu badan (plane.y + 4,2): garis pandang ke ujung
      // hidung kini bersih melewati kanopi (0,23 m di atas kaca), hidung
      // muncul sebagai baji cream di sepertiga bawah frame, kanopi jatuh
      // ke balik dashboard. Kamera 1,04 m di atas kanopi memang di luar
      // gelembung kaca — tapi dengan bingkai panel kokpit DOM + dial, yang
      // terbaca tetap "dari dalam kokpit, menunduk melewati hidung".
      // Sayap (z lokal -0,6) tepat di bawah mata — pangkalnya menyembul di
      // tepi bawah frame; ujung sayap (±7,6 m) tetap di luar FOV, wajar
      // untuk kokpit pesawat sayap-atas.
      const fwdX = Math.sin(hRad);
      const fwdZ = -Math.cos(hRad);
      targetPos = new THREE.Vector3(
        plane.x + fwdX * 1.0, plane.y + 4.2, plane.z + fwdZ * 1.0,
      );
      // Bidik menunduk (~8,7°): hidung jatuh ke sepertiga bawah frame,
      // horizon + pulau tujuan tetap di atasnya.
      targetLook = new THREE.Vector3(
        plane.x + fwdX * 220 - Math.sin(hRad + plane.roll * DEG * 0.4) * 8,
        plane.y - 30 + Math.tan(plane.pitch * DEG) * 220,
        plane.z + fwdZ * 220,
      );
    } else {
      // Chase: 19 m di belakang, 6,5 m di atas; orbit drag menggeser sedikit.
      const dist = 19 + camState.orbitY * 0.05;
      const height = 6.5 + camState.orbitY * 0.02;
      const side = camState.orbitX * 0.06;
      const sideX = Math.cos(hRad);
      const sideZ = Math.sin(hRad);
      targetPos = new THREE.Vector3(
        plane.x + backX * dist + sideX * side,
        plane.y + height,
        plane.z + backZ * dist + sideZ * side,
      );
      const fwdX = Math.sin(hRad);
      const fwdZ = -Math.cos(hRad);
      targetLook = new THREE.Vector3(
        plane.x + fwdX * 90,
        Math.max(2, plane.y - 4),
        plane.z + fwdZ * 90,
      );
    }
    if (camState.mode === 'cockpit') {
      // Kokpit menempel kaku di pesawat (tanpa lag smoothing — offset depan
      // hanya 2,0 m, lag lerp akan membatalkannya).
      camState.smoothPos.copy(targetPos);
      camState.smoothLook.copy(targetLook);
    } else {
      const k = 1 - Math.pow(0.0001, dt);
      camState.smoothPos.lerp(targetPos, k);
      camState.smoothLook.lerp(targetLook, k);
    }
    camera.position.copy(camState.smoothPos);
    camera.lookAt(camState.smoothLook);
    // Roll kamera mengikuti bank pesawat: chase maks ~10 derajat, kokpit
    // lebih terasa (sampai ~22 derajat) supaya horizon miring seperti pilot.
    if (camState.mode === 'chase') {
      camera.rotation.z += (-plane.roll * DEG * 0.28);
    } else {
      camera.rotation.z += (-plane.roll * DEG * 0.35);
    }
  }

  function toggleMode(camState) {
    camState.mode = camState.mode === 'chase' ? 'cockpit' : 'chase';
    return camState.mode;
  }

  return { createCameraState, updateCamera, toggleMode };
})();
