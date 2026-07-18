# PRD: ElectDW — Desktop Video Downloader

**Version:** 1.0  
**Date:** 2026-07-18  
**Platform Target:** Apple Silicon (macOS, arm64)  
**Tech Stack:** Node.js + Electron

---

## 1. Ringkasan Produk

ElectDW adalah desktop application berbasis Electron yang berfungsi sebagai video downloader untuk berbagai platform sosial media. User cukup menempelkan (*paste*) tautan video, lalu aplikasi secara otomatis mendeteksi asal platform, menampilkan opsi resolusi, dan mengunduh video ke penyimpanan lokal.

---

## 2. Target Platform & Arsitektur

| Aspek | Detail |
|---|---|
| OS Target | macOS (Apple Silicon native, arm64) |
| Runtime | Node.js 20 LTS+ |
| UI Framework | Electron 30+ |
| Backend Engine | `yt-dlp` (CLI wrapper via Node.js child_process) |
| Arch打包 | electron-builder dengan target `dmg` + `zip` |
| Native Build | Pastikan `yt-dlp` binary dibundel sebagai resource |

**Rekomendasi:** Gunakan `@electron/rebuild` untuk native addons jika diperlukan, dan pastikan binary `yt-dlp` untuk arm64 Mac di-bundle di dalam `extraResources`.

---

## 3. Fitur Utama (MVP)

### 3.1 Paste & Auto-Detect Link
- User menempelkan URL video ke input field.
- App langsung mengekstrak platform asal (YouTube, Facebook, Instagram, X/Twitter, TikTok, dll.).
- Validasi format URL; tampilkan error jika tidak dikenali.

### 3.2 Fetch Metadata & Resolusi
- Setelah link terdeteksi, app memanggil `yt-dlp` untuk mengambil metadata: judul, durasi, daftar resolusi/format yang tersedia.
- Tampilkan judul video beserta thumbnail (jika ada).

### 3.3 Pilihan Resolusi
- Dropdown/radio button berisi daftar resolusi yang tersedia.
- Default pilih resolusi tertinggi (best video + best audio).
- Tampilkan informasi tambahan: format file, bitrate, file size (estimated).

### 3.4 Download & Progress
- Tombol download memicu proses unduh via `yt-dlp`.
- Tampilkan progress bar (persentase, speed, ETA) menggunakan output `--progress-template` dari yt-dlp.
- Cancellation: user bisa membatalkan download yang sedang berlangsung.

### 3.5 Save Location
- Opsi memilih folder penyimpanan (default: `~/Downloads/ElectDW`).
- Prompt "Save As" dialog sebelum download dimulai.
- Buka folder setelah download selesai (opsional, via checkbox).

### 3.6 Daftar Riwayat Download
- Tabel/sidebar berisi riwayat download (judul, platform, resolusi, tanggal, status).
- Persistent menggunakan `electron-store` atau SQLite lokal.
- Filter/cari riwayat.

---

## 4. Platform Sosial Media yang Didukung

| Platform | Status | Catatan |
|---|---|---|
| YouTube | ✅ Supported | Video, Shorts, playlists (single) |
| Facebook | ✅ Supported | Video publik |
| Instagram | ✅ Supported | Reels, posts, stories (publik) |
| X / Twitter | ✅ Supported | Video dalam tweet |
| TikTok | ✅ Supported | Video tanpa watermark |
| LinkedIn | ⚠️ Partial | Video publik tertentu |
| Pinterest | ⚠️ Partial | Video pins |
| Reddit | ⚠️ Partial | v.redd.it |
| Vimeo | ✅ Supported | Video publik |
| Dailymotion | ✅ Supported | Video publik |
| Twitch | ✅ Supported | Clips, VODs |

**Catatan:** Dukungan platform bergantung pada `yt-dlp` extractors. Update `yt-dlp` secara berkala.

---

## 5. User Flow

```
[Paste Link] --> [Auto-Detect Platform] --> [Fetch Metadata] --> [Tampilkan Opsi Resolusi]
                                                                    |
                                                                    v
                                             [Pilih Folder Simpan] <-- [Pilih Resolusi]
                                                                    |
                                                                    v
                                                          [Download + Progress Bar]
                                                                    |
                                                                    v
                                                          [Selesai + Buka Folder?]
```

---

## 6. Spesifikasi Teknis

### 6.1 Tech Stack Detail

| Layer | Teknologi |
|---|---|
| Desktop Shell | Electron 30+ |
| Frontend | HTML + CSS + Vanilla JS (atau React/Vue jika ingin lebih rapi) |
| Backend Engine | `yt-dlp` (Python) via `child_process.execFile` / `spawn` |
| State Management | IPC antara Main Process ↔ Renderer |
| Persistent Storage | `electron-store` untuk settings & riwayat |
| Bundler | electron-builder |
| Icons | macOS .icns (template) |

### 6.2 Komunikasi IPC Channels

```
renderer → main:
  'detect-link'        → { url } → { platform, valid }
  'fetch-formats'      → { url } → { title, thumbnail, formats[] }
  'start-download'     → { url, formatId, outputPath } → { progress }
  'cancel-download'    → { processId }
  'select-folder'      → {} → { folderPath }
  'open-folder'        → { folderPath }
  'get-history'        → {} → { history[] }
  'clear-history'      → {}

main → renderer:
  'download-progress'  → { percent, speed, eta, status }
  'download-complete'  → { filePath }
  'download-error'     → { error }
```

### 6.3 Struktur Direktori Aplikasi

```
eletcDW/
├── package.json
├── electron-builder.yml
├── src/
│   ├── main/               # Electron Main Process
│   │   ├── index.js
│   │   ├── ipc-handlers.js
│   │   ├── downloader.js   # yt-dlp wrapper
│   │   └── store.js        # electron-store config
│   ├── renderer/            # Renderer Process (UI)
│   │   ├── index.html
│   │   ├── styles.css
│   │   ├── app.js
│   │   └── preload.js
│   └── resources/
│       └── yt-dlp           # arm64 binary (extraResource)
├── Docs/
│   └── PRD.md
└── README.md
```

---

## 7. Rancangan Desain UI

### 7.1 Filosofi Desain — "Electra"

ElectDW mengusung tema **"Electra"** — perpaduan antara kesan *electric* (cepat, bertenaga, digital) dan *clean* (minimal, fokus, modern). Identitas visual dibangun di atas tiga pilar:

| Pilar | Makna | Implementasi |
|---|---|---|
| **Current** (Arus) | Kecepatan, energi, aliran data | Gradien biru elektrik sebagai aksen, garis dinamis pada animasi |
| **Conduit** (Saluran) | Media perantara, koneksi antar-platform | Layout vertikal terpusat, seolah "menyalurkan" link ke output |
| **Crystal** (Kristal) | Bening, jernih, presisi | Glassmorphism tipis, ruang negatif luas, typography tajam |

### 7.2 Color Palette

```
🎨 Palette Utama

  --bg-primary:        #0B0E14    (deep navy — latar utama)
  --bg-secondary:      #131821    (slightly lighter — card/surface)
  --bg-tertiary:       #1A2233    (untuk hover/active state)
  --surface-glass:     rgba(19, 24, 33, 0.72) — backdrop-blur

  --accent-electric:   #00D4FF    (cyan terang — primary CTA, link aktif)
  --accent-neon:       #7C3AED    (violet — secondary accent, badge platform)
  --accent-glow:       #0066FF    (biru tua untuk glow effect)

  --text-primary:      #F0F4FF    (putih kebiruan)
  --text-secondary:    #8892B0    (abu kebiruan — label, caption)
  --text-muted:        #4A5568    (reduced emphasis)

  --status-success:    #34D399    (hijau — download selesai)
  --status-error:      #EF4444    (merah — error)
  --status-warning:    #F59E0B    (kuning — warning)
  --status-progress:   #00D4FF    (cyan — sedang download)

🎨 Platform Badge Colors (untuk label sumber video)

  YouTube:    #FF0000
  Facebook:   #1877F2
  Instagram:  #E4405F
  X/Twitter:  #1DA1F2
  TikTok:     #000000 (light mode) / #FFFFFF (dark mode)
  Vimeo:      #1AB7EA
  Twitch:     #9146FF
```

### 7.3 Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| App Title / Logo | **JetBrains Mono** (monospace) | Bold | 20px |
| Heading | **Inter** | SemiBold (600) | 16–18px |
| Body / Label | **Inter** | Regular (400) | 13–14px |
| Caption / Metadata | **Inter** | Medium (500) | 11–12px |
| Monospace (URL, log) | **JetBrains Mono** | Regular | 12px |

- Base line-height: 1.5
- Gunakan sistem font macOS fallback: `-apple-system, BlinkMacSystemFont`
- Font di-bundle sebagai asset (TTF/WOFF2) agar konsisten di semua sistem

### 7.4 Layout & Struktur Antar Muka

#### 7.4.1 Window Geometry

- **Default size:** 800×620px (compact, tidak fullscreen)
- **Min size:** 720×520px
- **Titlebar styling:** `titleBarStyle: 'hiddenInset'` (macOS native traffic light, konten mepet ke atas)
- **Resizable:** Ya, dengan konten tetap terpusat (max-width: 1040px)

#### 7.4.2 Wireframe Layout

```
┌─────────────────────────────────────────────────────┐
│  ● ● ●                                      ⚙️ 🔍  │  ← Titlebar (traffic light + actions)
├─────────────────────────────────────────────────────┤
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │   ⚡ ElectDW                                 │   │  ← Header dengan logo + tagline
│   │   Video Downloader • 12 Platforms Supported  │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │  🔗  https:// Paste video link here...  📋  │   │  ← Paste Input (hero element)
│   │  [⬇ Paste from Clipboard]                    │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   ┌──────────────────┐  ┌────────────────────────┐ │
│   │  [Thumbnail]     │  │  Judul Video           │ │  ← Video Info Card
│   │   128x72         │  │  📺 YouTube • 12:34     │ │    (muncul setelah detect)
│   │                  │  │  ★ 4K  •  ★ 1080p  • ★ │ │
│   │                  │  │  [▼ Resolusi] [📁 Simpan]│ │
│   │                  │  │  [████████░░] 67% 2MB/s │ │  ← Progress bar
│   │                  │  │  [⬇ Download] [✕ Batal] │ │
│   └──────────────────┘  └────────────────────────┘ │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │  ⏬ Recent Downloads          [View All →]  │   │  ← Riwayat (collapsible)
│   │  ┌──────────────────────────────────────────┐│   │
│   │  │ 🎬 Video A         YouTube  • 1080p  ✅ ││   │
│   │  │ 🎬 Video B       Instagram  • 720p   ⏳ ││   │
│   │  └──────────────────────────────────────────┘│   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   footer: v1.0.0 • yt-dlp 2026.07.18               │
└─────────────────────────────────────────────────────┘
```

#### 7.4.3 Descriptions Per Screen

**a. Home Screen (Default State)**
- Hero paste input di tengah layout, didominasi ruang negatif
- Placeholder text: `🔗 https://` dengan ikon link di kiri, tombol `📋` paste di kanan
- Di bawah input: tombol ghost "⬇ Paste from Clipboard" untuk trigger paste manual
- Header small di atas: logo "⚡ ElectDW" dengan subtitle
- Footer tipis: version + yt-dlp version

**b. Detected State (Setelah paste link)**
- Paste input mengecil dan pindah ke atas (shrink animation)
- Muncul **Video Info Card** dengan layout horizontal 2 kolom:
  - Kiri: thumbnail (rounded corners, subtle shadow)
  - Kanan: judul, badge platform (dengan warna brand masing-masing), durasi
- Di bawah info: **Resolution Selector** (pill-style toggle atau dropdown)
  - Setiap opsi menampilkan: resolusi + format + estimated size
  - Default terpilih: resolusi tertinggi (diberi label "Best Quality" dengan icon crown/star)
- **Folder picker:** button kecil "📁 ~/Downloads/ElectDW" yang bisa diklik untuk ganti
- **Download button:** prominent, full-width, electric cyan gradient, dengan icon ⬇
  - Hover: glow effect

**c. Downloading State**
- Progress bar: custom, dengan gradien cyan-to-violet yang animated
- Informasi real-time: speed (MB/s), ETA, file size (downloaded/total)
- Cancel button: merah, di samping progress bar
- Background: animasi subtle pulse pada card

**d. Completed State**
- Progress bar berubah menjadi hijau solid (success)
- Muncul tombol "📂 Open Folder" dan "▶ Play" (buka video dengan default player)
- Confetti/checkmark animation subtle

**e. History Panel**
- Collapsible di bawah main content
- List items dengan: thumbnail kecil (40x40), judul, icon platform, resolusi, timestamp, status icon
- Empty state: "⏬ Belum ada download. Paste link untuk memulai!"
- Click item → buka folder tempat file disimpan

**f. Empty & Error States**

| State | Visual |
|---|---|
| Invalid URL | Input border merah + message "Link tidak valid atau platform tidak didukung" |
| Fetch Error | Card merah dengan pesan error + "Coba lagi" button |
| No Network | Badge "Offline" di pojok + pesan "Tidak ada koneksi internet" |
| Download Failed | Progress bar merah + error message + "Retry" button |

### 7.5 Component Design System

#### 7.5.1 Paste Input (Hero Component)

```
┌──────────────────────────────────────────────┐
│ 🔗  https://                          [📋]  │  ← default
│                                              │
│ ──────────────── underline gradient ────────  │
└──────────────────────────────────────────────┘

Focused state:
  - border: 1px solid var(--accent-electric)
  - box-shadow: 0 0 20px rgba(0, 212, 255, 0.15)
  - underline gradient bergerak (animated)

With content:
  - muncul icon platform di kiri (contoh: YouTube red icon)
  - tombol [×] clear di kanan
```

#### 7.5.2 Platform Badge

```
┌──────────┐
│ 📺 YouTube │  ← dengan brand color dot di kiri
└──────────┘

  - Pill shape (border-radius: 100px)
  - Background: platform color dengan opacity 0.15
  - Text: platform color solid
  - Icon: emoji atau SVG kecil masing-masing platform
```

#### 7.5.3 Resolution Picker (Pill Toggle)

```
 [📺 2160p 4K ★]  [📺 1080p]  [📺 720p]  [▼ More]
   ^ selected       ^ default    ^ hover

  - Horizontal scrollable pills
  - Selected: solid accent-electric background
  - Unselected: glassmorphism surface
  - ★ icon pada opsi "Best Quality" (default)
  - "More" dropdown untuk resolusi lain
```

#### 7.5.4 Download Button

```
 ╔══════════════════════════════════════╗
 ║        ⬇ Download Video (68 MB)      ║
 ╚══════════════════════════════════════╝

  - Full-width, rounded (12px)
  - Gradient: var(--accent-electric) → var(--accent-neon)
  - Hover: glow intensif + scale(1.01)
  - Active: scale(0.98)
  - Disabled (saat loading): skeleton shimmer
  - Loading: tombol jadi progress bar
```

#### 7.5.5 Progress Bar

```
 [████████░░░░░░░░░░░░]  67%  •  2.4 MB/s  •  ETA 00:34

  - Tinggi: 6px, rounded
  - Foreground: gradient cyan → violet (animated)
  - Background: var(--bg-tertiary)
  - Label di bawah: "67% • 2.4 MB/s • ETA 00:34" (monospace)
  - Complete state: berubah hijau solid + checkmark
```

#### 7.5.6 Video Info Card

```
┌─────────────────────────────────────────┐
│ ┌──────────┐  How to Build a...         │
│ │          │  📺 YouTube • 12:34        │
│ │ Thumbnail│  ─────────────────────     │
│ │ 160x90   │  4K  |  1080p  |  720p     │
│ │          │  MP4 • ~450 MB             │
│ └──────────┘                            │
└─────────────────────────────────────────┘

  - Glassmorphism: bg semi-transparan + backdrop-filter: blur(12px)
  - Border: 1px solid rgba(255,255,255,0.06)
  - Thumbnail: border-radius 8px
  - Hover: subtle lift (translateY(-2px) + shadow)
```

### 7.6 Micro-Interactions & Animations

| Element | Animasi | Durasi | Timing |
|---|---|---|---|
| Paste input → shrink | Scale + translateY | 300ms | ease-out |
| Video card appear | Fade in + slide up | 400ms | ease-out |
| Platform badge muncul | Scale pop (0→1) | 200ms | spring |
| Resolusi switch | Background crossfade | 150ms | ease |
| Progress bar fill | Smooth width transition | ~ | linear |
| Download button glow | Box-shadow pulse | 2s | infinite alternate |
| Error shake | TranslateX oscillation | 300ms | ease-in-out |
| Success checkmark | Draw path (stroke-dashoffset) | 600ms | ease-in-out |

### 7.7 Responsive Behavior

Meskipun target utama desktop, layout harus responsif dalam window:

| Window Width | Behavior |
|---|---|
| >900px | Layout penuh, 2 kolom untuk info card |
| 720–900px | Layout 1 kolom, info card stacked |
| <720px (minimum) | Padding dikurangi, font size turun 1px, side-by-side jadi stack |

### 7.8 Theme Signature — "Ciri Khas ElectDW"

Agar mudah dikenali, ElectDW memiliki signature visual unik:

1. **⚡ Electric Accent Line** — Garis gradien horizontal tipis (1px) yang membagi header dan konten, dengan animasi *current flow* (gradien bergerak perlahan).

2. **Glow Effect pada Primary CTA** — Tombol download memiliki neon glow yang "bernafas" (pulse opacity 0.6→1) — merepresentasikan "arus listrik" yang siap mengalir.

3. **Platform Avatar** — Setiap platform punya representasi visual unik: badge berbentuk pill dengan warna brand-nya, bukan sekadar teks.

4. **Morphing Progress** — Progress bar tidak hanya bergerak horizontal, tapi juga berubah gradien dari cyan → violet seiring progress (0% → 100%).

5. **Glass Surface** — Card dan panel menggunakan efek kaca (backdrop-blur) dengan border tipis tembus pandang, memberi kesan depth tanpa berat.

6. **Monospace Logo** — Logo "ElectDW" menggunakan font monospace (JetBrains Mono) dengan huruf "DW" diberi warna accent-electric, sebagai pengingat bahwa ini adalah *developer-oriented tool* yang presisi.

7. **Sound Design** (opsional) — Suara subtle: click download (spark), complete (chime), error (buzz pendek). Menggunakan sistem sound macOS.

### 7.9 Referensi Visual

| Aspek | Referensi / Inspirasi |
|---|---|
| Layout minimal | CleanShot, Linear |
| Glassmorphism | macOS Big Sur+ (Control Center, Notification Center) |
| Neon glow | Weather Line app, Aurora design system |
| Pill badges | Spark email, Raycast |
| Dark theme | Arc browser, GitHub Dark mode |
| Micro-animations | LottieFiles, Apple HIG |

---

## 8. Saran Pengembangan Lanjutan

### 8.1 Jangka Pendek (Post-MVP)

| Fitur | Deskripsi |
|---|---|
| **Batch Download** | Download beberapa video sekaligus dari daftar link |
| **Playlist Support** | Download seluruh playlist YouTube dengan pilih video tertentu |
| **Audio Only Mode** | Ekstrak audio MP3 / M4A dari video |
| **Subtitle Download** | Opsi download subtitle (jika tersedia) |
| **Dark Mode** | Toggle tema gelap/terang |
| **Keyboard Shortcuts** | Cmd+V untuk paste, Cmd+D untuk download, dll. |
| **Proxy Support** | Pengaturan proxy untuk daerah dengan pembatasan akses |

### 8.2 Jangka Menengah

| Fitur | Deskripsi |
|---|---|
| **Queue Manager** | Antrian download dengan prioritas, pause/resume |
| **Clipboard Monitor** | Auto-detect link saat user copy URL di mana saja (via tray) |
| **Format Converter** | Konversi format video (MP4, MKV, WebM) pasca-download |
| **Thumbnail Preview Grid** | Grid thumbnail untuk riwayat download |
| **Export/Import Riwayat** | Backup riwayat ke JSON/CSV |
| **Auto Update** | Gunakan `electron-updater` untuk update otomatis |

### 8.3 Jangka Panjang

| Fitur | Deskripsi |
|---|---|
| **Built-in Browser** | Mini browser internal untuk browsing & detect link otomatis |
| **Account Integration** | Login ke platform tertentu untuk akses konten privat |
| **Cloud Sync** | Sinkronisasi riwayat & settings via iCloud / Google Drive |
| **Plugins System** | Arsitektur plugin agar komunitas bisa tambah extractor sendiri |
| **Notifications** | macOS native notification saat download selesai |
| **Touch Bar Support** | Progress bar di MacBook Touch Bar |

---

## 9. Pertimbangan Khusus Apple Silicon

1. **Binary yt-dlp** — Gunakan binary `yt-dlp` arm64, bundled sebagai `extraResource` di electron-builder.
2. **Python Runtime** — yt-dlp membutuhkan Python. macOS sudah memiliki Python 3 bawaan, tapi pastikan fallback ke bundled Python jika perlu.
3. **Notarization** — App harus di-notarize oleh Apple untuk didistribusikan di luar Mac App Store.
4. **Hardened Runtime** — Tambahkan entitlement `com.apple.security.cs.disable-library-validation` untuk menjalankan binary eksternal (yt-dlp).
5. **Universal Binary** — Pertimbangkan build universal (x64 + arm64) jika ingin support Intel Mac juga.

### 9.1 electron-builder Config (contoh)

```yaml
appId: com.eletcdw.app
productName: ElectDW
mac:
  target:
    - target: dmg
      arch: arm64
  extraResources:
    - from: resources/yt-dlp
      to: yt-dlp
  hardenedRuntime: true
  entitlements: build/entitlements.mac.plist
```

---

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| yt-dlp ketinggalan update | Auto-check update yt-dlp di latar belakang, notifikasi user |
| Platform berubah API/struktur | yt-dlp extractors komunitas, update rutin |
| DMCA / Legal issues | Gunakan untuk konten publik/pribadi saja, edukasi user |
| Apple Silicon compatibility | Test di Mac M1/M2/M3, bundle arm64 binary |
| File size besar (4K video) | Tampilkan estimasi size sebelum download, limit concurrent download |

---

## 11. Metrik Kesuksesan (KPI)

- **Detection Rate:** >95% link valid terdeteksi platform-nya dengan benar
- **Download Success Rate:** >90% download selesai tanpa error
- **User Retention:** User kembali menggunakan app dalam 7 hari setelah install
- **Crash Rate:** <0.5% crash rate dari total sessions

---

## 12. Referensi

- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [electron-builder macOS Docs](https://www.electron.build/configuration/mac)
