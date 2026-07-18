# ElectDW ⚡

**Desktop Video Downloader for Social Media** — built with Electron for Apple Silicon Mac.

Paste a video link from YouTube, Facebook, Instagram, X/Twitter, TikTok, and 13+ platforms. ElectDW auto-detects the source, shows available resolutions, and downloads the video — all in a clean, modern interface.

## Features

- 🔗 **Smart Link Detection** — paste any video URL, app auto-detects the platform
- 📺 **13+ Platforms Supported** — YouTube, Facebook, Instagram, X/Twitter, TikTok, Vimeo, Dailymotion, Twitch, LinkedIn, Reddit, Pinterest, and more
- 🎯 **Resolution Selector** — choose from available qualities (default: highest)
- ⬇ **Fast Downloads** — powered by yt-dlp engine with real-time progress
- 📂 **Custom Save Location** — pick where to save your videos
- ⏬ **Download History** — track all your downloads
- 🎨 **Clean Modern UI** — dark theme with glassmorphism, electric accents, smooth animations
- 💻 **Apple Silicon Native** — optimized for M1/M2/M3/M4 Macs

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Electron 33 |
| Frontend | HTML + CSS (Vanilla) |
| Download Engine | yt-dlp |
| Persistent Storage | electron-store |

## Getting Started

### Prerequisites

- macOS (Apple Silicon)
- Node.js 20+
- Python 3 (required by yt-dlp)

### Installation

```bash
# Clone the repository
git clone https://github.com/initHD3v/eletcDW.git
cd eletcDW

# Install dependencies
npm install

# Download yt-dlp binary
npm run fetch-ytdlp

# Run in development mode
npm run dev
```

### Build for Production

```bash
# Build macOS ARM64 DMG
npm run build:mac
```

## Usage

1. **Launch ElectDW**
2. **Copy a video URL** from a supported platform
3. **Paste** into the input field (or click "Paste from Clipboard")
4. **Select quality** — the highest available is auto-selected
5. **Choose save folder** (optional, defaults to ~/Downloads/ElectDW)
6. **Click Download** — watch the progress bar
7. **Open folder** when complete

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+V` | Paste from clipboard |
| `Cmd+D` | Start download |
| `Esc` | Clear input |

## Project Structure

```
eletcDW/
├── package.json
├── electron-builder.yml
├── src/
│   ├── main/               # Electron Main Process
│   │   ├── index.js        # Window creation, app lifecycle
│   │   ├── ipc-handlers.js # IPC communication channels
│   │   ├── downloader.js   # yt-dlp wrapper & platform detection
│   │   └── store.js        # Persistent settings & history
│   ├── renderer/            # UI Layer
│   │   ├── index.html      # Main window HTML
│   │   ├── styles.css      # Full design system with animations
│   │   ├── app.js          # Renderer logic & state management
│   │   └── preload.js      # Context bridge for IPC
│   └── resources/
│       └── yt-dlp          # yt-dlp binary (arm64)
├── build/
│   └── entitlements.mac.plist
├── Docs/
│   └── PRD.md
└── README.md
```

## License

MIT
