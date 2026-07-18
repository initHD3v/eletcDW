const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isDev = process.env.NODE_ENV === 'development';
const appPath = isDev ? __dirname : process.resourcesPath;

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

function parseFormatId(formatString) {
  if (!formatString || formatString === 'best') {
    return 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
  }
  if (formatString.includes('p')) {
    const height = formatString.replace('p', '');
    return `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best`;
  }
  return formatString;
}

function getFormats(url) {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    const args = [
      '--dump-json',
      '--no-download',
      '--print', '%(title)s|||%(duration)s|||%(thumbnail)s|||%(height)s|||%(ext)s|||%(filesize_approx)s|||%(format_note)s|||%(format_id)s',
      url
    ];

    execFile(ytDlpPath, args, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message));
      }
      resolve(stdout);
    });
  });
}

function getFormatList(url) {
  return new Promise((resolve, reject) => {
    const ytDlpPath = getYtDlpPath();
    const args = [
      '--dump-json',
      '--no-download',
      url
    ];

    execFile(ytDlpPath, args, { timeout: 30000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr || error.message));
      }
      try {
        const data = JSON.parse(stdout);
        resolve(data);
      } catch (e) {
        reject(new Error('Failed to parse video metadata'));
      }
    });
  });
}

class DownloadManager {
  constructor() {
    this.activeDownloads = new Map();
  }

  startDownload(url, formatId, outputPath, onProgress, onComplete, onError) {
    const ytDlpPath = getYtDlpPath();
    const downloadId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const outputTemplate = path.join(outputPath, '%(title)s.%(ext)s');

    const args = [
      '--newline',
      '--progress-template',
      'download:[%(progress.downloaded_bytes)s/%(progress.total_bytes)s/%(progress.speed)s/%(progress.eta)s]',
      '-f', parseFormatId(formatId),
      '-o', outputTemplate,
      url
    ];

    const proc = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 0
    });

    this.activeDownloads.set(downloadId, proc);

    let buffer = '';

    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('download:')) {
          const match = line.match(/\[([^\]]+)\]/g);
          if (match && match.length >= 4) {
            const downloaded = parseFloat(match[0].slice(1, -1));
            const total = parseFloat(match[1].slice(1, -1));
            const speed = parseFloat(match[2].slice(1, -1));
            const eta = parseFloat(match[3].slice(1, -1));

            let percent = 0;
            if (total > 0 && downloaded > 0) {
              percent = Math.min(100, Math.round((downloaded / total) * 100));
            }

            onProgress({
              percent,
              downloaded,
              total,
              speed,
              eta,
              status: 'downloading'
            });
          }
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR:')) {
        onError(new Error(msg.replace('ERROR:', '').trim()));
      }
    });

    proc.on('close', (code) => {
      this.activeDownloads.delete(downloadId);
      if (code === 0) {
        onComplete({ filePath: outputPath });
      } else if (code === null) {
        onError(new Error('Download cancelled'));
      }
    });

    proc.on('error', (err) => {
      this.activeDownloads.delete(downloadId);
      onError(err);
    });

    return downloadId;
  }

  cancelDownload(downloadId) {
    const proc = this.activeDownloads.get(downloadId);
    if (proc) {
      proc.kill('SIGTERM');
      this.activeDownloads.delete(downloadId);
      return true;
    }
    return false;
  }
}

module.exports = {
  detectPlatform,
  parseFormatId,
  getFormats,
  getFormatList,
  DownloadManager
};
