<div align="center">

# ⚡ ElectDW

**Downloader Video Desktop untuk Media Sosial**  
Dibangun dengan Electron, khusus Apple Silicon Mac.

[![Release](https://img.shields.io/github/v/release/initHD3v/eletcDW?style=flat-square)](https://github.com/initHD3v/eletcDW/releases)
[![License](https://img.shields.io/github/license/initHD3v/eletcDW?style=flat-square)](LICENSE)

</div>

---

## Sekilas

Tempel tautan video dari YouTube, Facebook, Instagram, X/Twitter, TikTok, atau platform lainnya. ElectDW otomatis mendeteksi sumbernya, menampilkan resolusi yang tersedia, dan mengunduh videonya.

Ditenagai oleh **yt-dlp** di belakang layar. Tampilannya gelap dengan aksen elektrik—cocok buat yang suka hal-hal teknis.

## Tangkapan Layar

| Beranda | Pengaturan | Riwayat |
|---|---|---|
| ![Beranda](sc/Screenshot%202026-07-21%20at%2015.10.30.png) | ![Pengaturan](sc/Screenshot%202026-07-21%20at%2015.10.37.png) | ![Riwayat](sc/Screenshot%202026-07-21%20at%2015.10.47.png) |

## Fitur

- **Deteksi tautan otomatis** — tempel URL, aplikasi langsung tahu platformnya
- **13+ platform** — YouTube, Facebook, Instagram, X/Twitter, TikTok, Vimeo, Dailymotion, Twitch, LinkedIn, Reddit, Pinterest, dan lainnya
- **Pilih resolusi** — mau 4K atau 720p, terserah kamu (default: yang terbaik)
- **Unduh cepat** — progres real-time, kecepatan, dan perkiraan sisa waktu
- **Folder kustom** — tentukan sendiri tempat penyimpanan
- **Riwayat unduhan** — semua yang pernah diunduh tercatat
- **Tampilan modern** — tema gelap, glassmorphism, animasi halus
- **Khusus Apple Silicon** — dioptimalkan untuk M1, M2, M3, M4

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Desktop | Electron 33 |
| Frontend | HTML + CSS murni (vanilla) |
| Mesin unduh | yt-dlp |
| Penyimpanan | electron-store |

## Persiapan

### Prasyarat

- Mac dengan chip Apple Silicon
- Node.js 20 atau lebih baru
- Python 3 (dibutuhkan yt-dlp)

### Instalasi

```bash
git clone https://github.com/initHD3v/eletcDW.git
cd eletcDW

npm install
npm run fetch-ytdlp
npm run dev
```

### Build untuk Produksi

```bash
npm run build:mac
```

Hasilnya ada di folder `release/`, file `.dmg` siap pakai.

## Cara Pakai

1. Buka ElectDW
2. Salin URL video dari platform mana pun
3. Tempel ke kolom input (atau klik tombol clipboard)
4. Pilih resolusi—yang tertinggi otomatis terpilih
5. Atur folder tujuan (opsional, default `~/Downloads/ElectDW`)
6. Klik **Download**
7. Selesai—buka foldernya langsung dari aplikasi

## Pintasan Keyboard

| Tombol | Fungsi |
|---|---|
| `Cmd+V` | Tempel dari clipboard |
| `Cmd+D` | Mulai unduh |
| `Esc` | Bersihkan input |

## Struktur Proyek

```
eletcDW/
├── package.json
├── electron-builder.yml
├── src/
│   ├── main/               # Proses utama Electron
│   │   ├── index.js        # entry point
│   │   ├── ipc-handlers.js # komunikasi main ↔ renderer
│   │   ├── downloader.js   # wrapper yt-dlp
│   │   └── store.js        # penyimpanan lokal
│   ├── renderer/            # UI
│   │   ├── index.html
│   │   ├── styles.css
│   │   ├── app.js
│   │   └── preload.js      # jembatan IPC yang aman
│   └── resources/
│       └── yt-dlp          # binary (arm64)
├── build/
│   └── entitlements.mac.plist
├── Docs/
│   └── PRD.md
└── README.md
```

## Lisensi

MIT
