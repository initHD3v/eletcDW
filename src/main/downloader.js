// ============================================================
// downloader.js — Mesin Download Video (Main Process)
// ============================================================
// File ini menangani seluruh proses download menggunakan yt-dlp.
// Termasuk deteksi platform, pengambilan daftar format video,
// parsing progres download, dan manajemen download aktif.
// ============================================================

const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

// ------------------------------------------------------------
// getYtDlpPath — Mendapatkan path binary yt-dlp
// ------------------------------------------------------------
// Di dev: cari di folder resources lokal, fallback ke system yt-dlp
// Di produksi: gunakan extraResource yang dibundel
// ------------------------------------------------------------
function getYtDlpPath() {
  if (isDev) {
    const localPath = path.join(__dirname, '..', 'resources', 'yt-dlp');
    if (fs.existsSync(localPath)) return localPath;
    return 'yt-dlp';
  }
  const resourcePath = path.join(process.resourcesPath, 'yt-dlp');
  if (fs.existsSync(resourcePath)) return resourcePath;
  return 'yt-dlp';
}

// ------------------------------------------------------------
// PLATFORM_PATTERNS — Daftar pola URL untuk setiap platform
// ------------------------------------------------------------
// Digunakan untuk mendeteksi asal URL video dan menampilkan
// badge platform yang sesuai di antarmuka pengguna.
// ------------------------------------------------------------
const PLATFORM_PATTERNS = [
  { platform: 'youtube', patterns: ['youtube.com', 'youtu.be', 'm.youtube.com'] },
  { platform: 'facebook', patterns: ['facebook.com', 'fb.watch', 'fb.com'] },
  { platform: 'instagram', patterns: ['instagram.com', 'instagr.am'] },
  { platform: 'twitter', patterns: ['twitter.com', 'x.com'] },
  { platform: 'tiktok', patterns: ['tiktok.com', 'vm.tiktok.com'] },
  { platform: 'vimeo', patterns: ['vimeo.com'] },
  { platform: 'dailymotion', patterns: ['dailymotion.com', 'dai.ly'] },
  { platform: 'twitch', patterns: ['twitch.tv', 'clips.twitch.tv'] },
  { platform: 'linkedin', patterns: ['linkedin.com'] },
  { platform: 'reddit', patterns: ['reddit.com', 'v.redd.it'] },
  { platform: 'pinterest', patterns: ['pinterest.com', 'pin.it'] },
];

// ------------------------------------------------------------
// detectPlatform — Mendeteksi platform dari URL
// ------------------------------------------------------------
// Mengembalikan nama platform (string) atau null jika tidak dikenal.
// ------------------------------------------------------------
function detectPlatform(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    for (const p of PLATFORM_PATTERNS) {
      for (const pattern of p.patterns) {
        if (hostname === pattern || hostname.endsWith('.' + pattern)) {
          return p.platform;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// getFormatList — Mengambil daftar format video dari yt-dlp
// ------------------------------------------------------------
// Menggunakan spawn untuk streaming output JSON (menghindari
// batas maxBuffer dari execFile). Menambahkan --playlist-items 1
// untuk mencegah overflow JSON pada URL playlist.
// ------------------------------------------------------------
function getFormatList(url) {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    const args = [
      '--dump-json',
      '--no-warnings',
      '--playlist-items', '1',
      url
    ];

    const proc = spawn(ytDlpPath, args, {
      timeout: 60000,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        let errMsg = stderr || `Proses keluar dengan kode ${code}`;
        if (errMsg.includes('Video unavailable')) {
          return reject(new Error('Video tidak tersedia atau bersifat pribadi'));
        }
        if (errMsg.includes('HTTP Error')) {
          return reject(new Error('Kesalahan jaringan. Periksa koneksi Anda.'));
        }
        return reject(new Error(errMsg.split('\n').filter(l => l.includes('ERROR'))[0] || errMsg));
      }
      try {
        const lines = stdout.trim().split('\n');
        const data = JSON.parse(lines[0]);
        resolve(data);
      } catch (e) {
        reject(new Error('Gagal memparse metadata video'));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(err.message));
    });
  });
}

// ------------------------------------------------------------
// parseFormatId — Mengubah label resolusi ke format selector yt-dlp
// ------------------------------------------------------------
// Contoh: "1080p" → "bestvideo[height<=1080][ext=mp4]+bestaudio..."
// "best" → format terbaik yang tersedia
// ------------------------------------------------------------
function parseFormatId(formatString) {
  if (!formatString || formatString === 'best') {
    return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
  }

  const heightMatch = formatString.match(/^(\d+)p?$/);
  if (heightMatch) {
    const height = heightMatch[1];
    return `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best`;
  }

  return formatString;
}

// ------------------------------------------------------------
// DownloadManager — Manajer Download Aktif
// ------------------------------------------------------------
// Mengelola proses download yang sedang berjalan, termasuk
// spawn proses yt-dlp, parsing progres, dan pembatalan.
// ------------------------------------------------------------
class DownloadManager {
  constructor() {
    // Map untuk menyimpan proses download aktif (key: downloadId)
    this.activeDownloads = new Map();
  }

  // ----------------------------------------------------------
  // startDownload — Memulai proses download baru
  // ----------------------------------------------------------
  // Parameter:
  //   - url: URL video yang akan didownload
  //   - formatId: label resolusi (contoh: "1080p", "best")
  //   - outputPath: direktori tujuan penyimpanan
  //   - onProgress: callback untuk update progres
  //   - onComplete: callback saat download selesai
  //   - onError: callback saat terjadi error
  // ----------------------------------------------------------
  startDownload(url, formatId, outputPath, onProgress, onComplete, onError) {
    const ytDlpPath = getYtDlpPath();
    const downloadId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const outputTemplate = path.join(outputPath, '%(title)s.%(ext)s');

    const args = [
      '--newline',
      '--no-warnings',
      // Template progres: [downloaded_bytes/total_bytes/speed/eta]
      '--progress-template',
      'download:[%(progress.downloaded_bytes)s/%(progress.total_bytes)s/%(progress.speed)s/%(progress.eta)s]',
      '-f', parseFormatId(formatId),
      '--merge-output-format', 'mp4',  // Gabung video+audio ke MP4
      '-o', outputTemplate,
      '--no-playlist',                  // Hanya video tunggal, bukan playlist
      url
    ];

    const proc = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 0  // Tidak ada batas waktu untuk download besar
    });

    // Simpan proses ke daftar download aktif
    this.activeDownloads.set(downloadId, proc);

    let buffer = '';
    let hasError = false;
    let stderrBuf = '';

    // ---------- PARSING PROGRES ----------
    // Baca output stdout baris per baris, parse template progres
    // Format: [downloaded/total/speed/eta]
    proc.stdout.on('data', (data) => {
      const chunk = data.toString();
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('[')) continue;
        const match = trimmed.match(/^\[([^\]]+)\]/);
        if (!match) continue;
        const parts = match[1].split('/');
        if (parts.length < 4) continue;

        const downloaded = parseFloat(parts[0]);
        const total = parseFloat(parts[1]);
        const speed = parseFloat(parts[2]);
        const eta = parseFloat(parts[3]);

        let percent = 0;
        if (total > 0 && downloaded > 0) {
          percent = Math.min(100, Math.round((downloaded / total) * 100));
        }

        onProgress({ percent, downloaded, total, speed, eta, status: 'downloading' });
      }
    });

    // Tangkap error dari stderr
    proc.stderr.on('data', (data) => {
      stderrBuf += data.toString();
      if (hasError) return;
      const msg = data.toString();
      if (msg.includes('ERROR:')) {
        hasError = true;
        onError(new Error(msg.replace(/^.*ERROR:\s*/, '').trim()));
      }
    });

    // ---------- SELESAI ----------
    proc.on('close', (code) => {
      this.activeDownloads.delete(downloadId);
      if (code === 0) {
        onComplete({ filePath: outputPath });
      } else if (code === null) {
        onError(new Error('Download dibatalkan'));
      } else {
        const stderr = stderrBuf.replace(/^.*ERROR:\s*/gm, '').trim();
        onError(new Error(stderr || `yt-dlp keluar dengan kode ${code}`));
      }
    });

    proc.on('error', (err) => {
      this.activeDownloads.delete(downloadId);
      onError(err);
    });

    return downloadId;
  }

  // ----------------------------------------------------------
  // cancelDownload — Membatalkan download berdasarkan ID
  // ----------------------------------------------------------
  cancelDownload(downloadId) {
    const proc = this.activeDownloads.get(downloadId);
    if (proc) {
      proc.kill('SIGTERM');
      // Force kill jika tidak berhenti dalam 3 detik
      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
      }, 3000);
      this.activeDownloads.delete(downloadId);
      return true;
    }
    return false;
  }
}

// Ekspor semua fungsi dan kelas untuk digunakan di file lain
module.exports = {
  detectPlatform,
  parseFormatId,
  getFormatList,
  getYtDlpPath,
  DownloadManager
};
