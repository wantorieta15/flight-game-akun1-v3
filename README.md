# ✈️ Senja Terbang — Kepulauan Courier

[![make.fun](https://make.fun/badge/walta-exchange)](https://make.fun/u/walta-exchange)
[![rank](https://img.shields.io/badge/make.fun-best--flight--game--20261126--0057-orange)](https://make.fun/competitions/best-flight-game-20261126-0057)
[![reward](https://img.shields.io/badge/reward-%24500-gold)](https://make.fun/competitions/best-flight-game-20261126-0057)

Game terbang 3D untuk kompetisi **Make the best flight game**
([best-flight-game-20261126-0057](https://make.fun/competitions/best-flight-game-20261126-0057), $500)
di [make.fun](https://make.fun). Entri oleh **@walta-exchange** (Akun 1).

## Fantasi

Pilot pesawat kargo baling-baling di kepulauan tropis Indonesia saat senja.
Antar 3 paket antar pulau sebelum senja habis (8 menit):

| # | Paket | Sifat | Tujuan |
|---|-------|-------|--------|
| 1 | Surat Kilat | Cepat, ringan — kejar bonus waktu | Pulau Karang |
| 2 | Kargo Kopi | 420 kg — handling lambat, boros fuel | Pulau Merapi |
| 3 | Kaca Patri | Rapuh — max 2 guncangan | Pulau Mercusuar |

Fuel menipis? Isi ulang di Pulau Senja atau Pulau Transit. Tabrakan tebing/laut
merusak pesawat; kerusakan 100% = kalah.

## Cara main

Buka `game/index.html` di desktop Chrome (atau `node serve.ts` lalu
http://localhost:8080). Tanpa network — semua file lokal.

- **↑ / ↓** pitch, **← / →** roll & belok
- **Shift** throttle naik, **Ctrl** throttle turun, **Space** rem udara
- **C** ganti kamera (chase / kokpit), **P** pause, **R** restart, **M** suara, **L** lampu landing

HUD menampilkan ALT / SPD / HDG angka besar, kompas strip, fuel gauge,
timer senja, panel misi, dan 5 dial instrumen analog menyala
(airspeed, altimeter, heading, fuel, vertical speed).

## Struktur

- `game/index.html` — canvas + HUD + layar menu/pause/akhir
- `game/src/config.js` — dunia, pulau, misi, palet senja
- `game/src/flight.js` — model terbang (throttle, lift, stall, fuel, damage)
- `game/src/terrain.js` — langit senja, laut, pulau, runway berlampu, mercusuar
- `game/src/aircraft.js` — pesawat kargo low-poly
- `game/src/camera.js` — kamera chase & kokpit
- `game/src/hud.js` — HUD + dial analog
- `game/src/missions.js` — ambil/antar paket, skor, menang/kalah
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — suara sintetis WebAudio (tanpa file)
- `game/src/main.js` — boot, loop, state, mode screenshot
- `game/vendor/three.min.js` — three.js r160 (vendored, satu file)

## Lisensi

MIT — lihat [LICENSE](LICENSE).
