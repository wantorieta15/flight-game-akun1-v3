// Senja Terbang: Kepulauan Courier — konfigurasi dunia & misi (Akun 1, walta-exchange).
// Semua angka dunia dalam "meter game": 1 unit = 1 m. Tampilan HUD memakai kaki & knot.
const SENJA_CONFIG = {
  title: 'SENJA TERBANG',
  subtitle: 'Kepulauan Courier — antar paket sebelum senja habis',
  worldSize: 4200,
  seaLevel: 0,
  sunsetSeconds: 480,
  stallKnots: 55,
  maxKnots: 190,
  fuelCapacity: 100,
  fuelBurnPerSecond: 0.55,
  fuelBurnThrottleExtra: 0.9,
  damageCrash: 100,
  // Pulau-pulau: x, z, radius, tinggi bukit, nama, warna pasir.
  islands: [
    { id: 'home', name: 'Pulau Senja', x: 0, z: 0, radius: 260, hill: 26, runway: true, fuel: true, lighthouse: false },
    { id: 'karang', name: 'Pulau Karang', x: -980, z: -760, radius: 210, hill: 34, runway: true, fuel: false, lighthouse: false },
    { id: 'merapi', name: 'Pulau Merapi', x: 1150, z: -620, radius: 240, hill: 58, runway: true, fuel: false, lighthouse: false },
    { id: 'mercusuar', name: 'Pulau Mercusuar', x: 420, z: 1180, radius: 200, hill: 30, runway: true, fuel: false, lighthouse: true },
    { id: 'transit', name: 'Pulau Transit', x: 760, z: 700, radius: 150, hill: 18, runway: false, fuel: true, lighthouse: false },
  ],
  // Tiga misi paket, berurutan: cepat, berat, rapuh.
  missions: [
    {
      id: 'kilat', kind: 'cepat', name: 'Surat Kilat',
      cargo: 'Surat & dokumen mendesak', weight: '12 kg — ringan',
      from: 'home', to: 'karang', timeLimit: 150,
      baseScore: 300, hint: 'Ringan & cepat — kejar bonus waktu!',
    },
    {
      id: 'kopi', kind: 'berat', name: 'Kargo Kopi',
      cargo: 'Karung kopi robusta', weight: '420 kg — BERAT',
      from: 'karang', to: 'merapi', timeLimit: 210,
      baseScore: 400, hint: 'Berat: handling lambat, boros bahan bakar.',
    },
    {
      id: 'kaca', kind: 'rapuh', name: 'Kaca Patri',
      cargo: 'Kaca patri untuk kapel', weight: '90 kg — RAPUH',
      from: 'merapi', to: 'mercusuar', timeLimit: 240,
      baseScore: 500, hint: 'Rapuh: jangan manuver kasar! Max 2 guncangan.',
    },
  ],
  palette: {
    skyTop: 0x3a2a63, skyMid: 0x8a4a7d, skyLow: 0xff8c42,
    sea: 0x1fa8a0, seaDeep: 0x0d6e7a, sand: 0xf2d8a0,
    grass: 0x4da64d, hill: 0x2f7a3d, volcano: 0x6b4a3a,
    planeOrange: 0xff7a1a, planeCream: 0xfff2d9, planeDark: 0x33302e,
    runway: 0x2b2b33, lampWarm: 0xffc861, lampGreen: 0x39e75f,
  },
};
