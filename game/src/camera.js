// Kamera Senja Terbang: chase view (utama) & cockpit view (tombol C).
// Chase: di belakang-bawah pesawat, pesawat besar di tengah-bawah frame, runway
// di depan terlihat. Cockpit: dari dalam kokpit, hidung + sayap + baling-baling.
// Transisi dihaluskan (lerp) supaya kamera tidak melawan pilot.
const SenjaCamera = (function () {
  const DEG = Math.PI / 180;

  function createCameraState() {
    return {
      mode: 'chase', // 'chase' | 'cockpit'
      orbitX: 0, orbitY: 0, // drag orbit di menu
      smoothPos: new THREE.Vector3(0, 10, 90),
      smoothLook: new THREE.Vector3(0, 5, 0),
    };
  }

  function updateCamera(camera, camState, plane, dt, time) {
    const hRad = plane.heading * DEG;
    const backX = -Math.sin(hRad);
    const backZ = Math.cos(hRad);
    let targetPos;
    let targetLook;
    if (camState.mode === 'cockpit') {
      // Mata pilot: di depan kanopi, di atas hidung — hidung + sayap + baling-baling terlihat,
      // terrain di depan bebas.
      const fwdX = Math.sin(hRad);
      const fwdZ = -Math.cos(hRad);
      targetPos = new THREE.Vector3(
        plane.x + fwdX * 5.2, plane.y + 3.6, plane.z + fwdZ * 5.2,
      );
      targetLook = new THREE.Vector3(
        plane.x + fwdX * 220 - Math.sin(hRad + plane.roll * DEG * 0.4) * 8,
        plane.y + 3.6 + Math.tan(plane.pitch * DEG) * 220,
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
      // hanya 4,6 m, lag lerp ~6 m akan membatalkannya).
      camState.smoothPos.copy(targetPos);
      camState.smoothLook.copy(targetLook);
    } else {
      const k = 1 - Math.pow(0.0001, dt);
      camState.smoothPos.lerp(targetPos, k);
      camState.smoothLook.lerp(targetLook, k);
    }
    camera.position.copy(camState.smoothPos);
    camera.lookAt(camState.smoothLook);
    // Roll kamera sedikit mengikuti bank pesawat (chase saja, maks 10 derajat).
    if (camState.mode === 'chase') {
      camera.rotation.z += (-plane.roll * DEG * 0.28);
    }
  }

  function toggleMode(camState) {
    camState.mode = camState.mode === 'chase' ? 'cockpit' : 'chase';
    return camState.mode;
  }

  return { createCameraState, updateCamera, toggleMode };
})();
