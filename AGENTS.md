# AGENTS.md — ElectDW

## Project

Electron desktop app for downloading videos from social media (YouTube, TikTok, Instagram, etc.) using yt-dlp. Apple Silicon (arm64) macOS only.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Launch in development (sets `NODE_ENV=development`, opens DevTools detached) |
| `npm start` | Launch without DevTools |
| `npm run build:mac` | Build production DMG for arm64 |
| `npm run fetch-ytdlp` | Download yt-dlp binary to `src/resources/yt-dlp` (required before first dev run) |
| `npm run postinstall` | `electron-builder install-app-deps` (runs automatically on `npm install`) |

After clone: `npm install && npm run fetch-ytdlp && npm run dev`

## Architecture

- **Main process entry:** `src/main/index.js` — creates `BrowserWindow` (790×820, `hiddenInset` titlebar, `contextIsolation: true`, `nodeIntegration: false`)
- **IPC handlers:** `src/main/ipc-handlers.js` — all channels registered via `ipcMain.handle`
- **Renderer:** Vanilla HTML/CSS/JS in `src/renderer/` — no framework
- **Preload bridge:** `src/renderer/preload.js` — exposes `window.electronAPI` via `contextBridge`
- **Download engine:** `src/main/downloader.js` — wraps yt-dlp via `child_process.spawn`, progress parsed from `--progress-template`
- **Persistent store:** `src/main/store.js` — `electron-store` with schema (settings, history)

## Key conventions

- No tests, lint, typecheck, or CI config exists. No formatter.
- All code is plain JS (CommonJS `require`/`module.exports`). No TypeScript, no bundler.
- Locale is Indonesian (UI strings, comments).
- CSP header in `index.html` restricts `default-src 'self'`.
- `NODE_ENV=development` triggers DevTools and local yt-dlp path resolution (see `src/main/downloader.js:22`).
- History is capped at 100 entries (hardcoded in `src/main/ipc-handlers.js:166`).

## yt-dlp binary

- Downloaded to `src/resources/yt-dlp` (gitignored, must be fetched before dev/build).
- In dev: uses local `src/resources/yt-dlp`, fallback to system `yt-dlp`.
- In production: bundled via `electron-builder` `extraResources` → `process.resourcesPath/yt-dlp`.
- Requires Python 3 on the system.
- macOS hardened runtime entitlement in `build/entitlements.mac.plist` allows running unsigned binaries.

## IPC channels (main ↔ renderer)

Renderer invokes via `window.electronAPI.*`:

- `detectLink(url)` → `{ platform, valid }`
- `fetchFormats(url)` → `{ title, thumbnail, duration, uploader, formats[] }`
- `startDownload({ url, resolution, outputPath })` → `{ downloadId }`
- `cancelDownload(downloadId)` → `boolean`
- `selectFolder()` → `{ folderPath }`
- `getHistory()` / `addHistory(entry)` / `clearHistory()`
- `getSettings()` / `saveSettings(settings)`
- `openExternal(url)` / `openFolder(path)`
- `getYtdlpVersion()` → version string

Main → renderer via IPC events: `download-progress`, `download-complete`, `download-error`

## Build output

- Output directory: `release/`
- Artifact: `ElectDW-{version}-arm64.dmg`
- Icon: `build/icon.icns` (not yet in repo)
