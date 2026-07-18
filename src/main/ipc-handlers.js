// ============================================================
// ipc-handlers.js — Penangan Komunikasi IPC (Main Process)
// ============================================================
// File ini mendaftarkan semua handler IPC yang memungkinkan
// proses renderer (UI) berkomunikasi dengan proses utama.
// Setiap handler menangani tugas spesifik seperti deteksi link,
// pengambilan format video, manajemen download, dan penyimpanan.
// ============================================================

const { ipcMain, dialog, shell, app, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');
const { detectPlatform, getFormatList, DownloadManager } = require('./downloader');

// Inisialisasi manajer download dan referensi jendela
const downloadManager = new DownloadManager();
let currentWindow = null;

// ------------------------------------------------------------
// setWindow — Menyimpan referensi jendela utama
// ------------------------------------------------------------
function setWindow(win) {
  currentWindow = win;
}

// ------------------------------------------------------------
// setupIpcHandlers — Mendaftarkan semua handler IPC
// ------------------------------------------------------------
function setupIpcHandlers() {

  // ---------- DETEKSI LINK ----------
  // Memeriksa apakah URL berasal dari platform yang didukung
  ipcMain.handle('detect-link', async (event, url) => {
    const platform = detectPlatform(url);
    return { platform, valid: platform !== null };
  });

  // ---------- AMBIL FORMAT VIDEO ----------
  // Mendapatkan daftar resolusi dan metadata dari URL video
  ipcMain.handle('fetch-formats', async (event, url) => {
    try {
      const data = await getFormatList(url);

      let formats = [];
      if (data && data.formats) {
        const seenHeights = new Set();

        // Filter format yang valid (punya video, bukan audio saja)
        formats = data.formats
          .filter(f => {
            if (!f || !f.format_id) return false;
            if (f.vcodec === 'none' && f.acodec === 'none') return false;
            if (f.vcodec === 'none') return false;
            const height = parseInt(f.height) || 0;
            if (height === 0 && !f.format_note) return false;
            return true;
          })
          .map(f => {
            const height = parseInt(f.height) || 0;
            let resLabel;
            if (height > 0) {
              resLabel = `${height}p`;
            } else if (f.format_note) {
              const noteMatch = f.format_note.match(/(\d+)p/);
              resLabel = noteMatch ? `${noteMatch[1]}p` : f.format_note;
            } else {
              resLabel = 'unknown';
            }
            return {
              formatId: f.format_id,
              resolution: resLabel,
              height,
              ext: f.ext || 'mp4',
              filesize: f.filesize || f.filesize_approx || 0,
              vcodec: f.vcodec || 'unknown',
              acodec: f.acodec || 'unknown',
              hasVideo: f.vcodec !== 'none',
              hasAudio: f.acodec !== 'none',
              tbr: f.tbr || 0
            };
          })
          .sort((a, b) => b.height - a.height || a.tbr - b.tbr);

        // Hanya ambil resolusi unik (resolusi tertinggi untuk setiap label)
        const uniqueResolutions = new Map();
        for (const f of formats) {
          const key = f.resolution;
          if (!uniqueResolutions.has(key)) {
            uniqueResolutions.set(key, f);
          }
        }

        formats = Array.from(uniqueResolutions.values());
      }

      // Fallback: jika tidak ada format, buat format default
      if (formats.length === 0) {
        const height = data.height || 0;
        const resLabel = height > 0 ? `${height}p` : 'unknown';
        formats = [{
          formatId: 'best',
          resolution: resLabel,
          height,
          ext: data.ext || 'mp4',
          filesize: data.filesize || data.filesize_approx || 0,
          vcodec: data.vcodec || 'unknown',
          acodec: data.acodec || 'unknown',
          hasVideo: true,
          hasAudio: true,
          tbr: data.tbr || 0
        }];
      }

      // Kembalikan metadata video beserta daftar format
      return {
        title: data.title || 'Unknown Title',
        thumbnail: data.thumbnail || '',
        duration: data.duration || 0,
        uploader: data.uploader || '',
        formats
      };
    } catch (error) {
      throw new Error(`Gagal mengambil format: ${error.message}`);
    }
  });

  // ---------- MULAI DOWNLOAD ----------
  // Memulai proses download video dengan format yang dipilih
  ipcMain.handle('start-download', async (event, { url, resolution, outputPath }) => {
    const defaultPath = store.get('settings.downloadPath') || path.join(app.getPath('downloads'), 'ElectDW');

    const savePath = outputPath || defaultPath;

    // Buat direktori tujuan jika belum ada
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }

    const formatSelector = resolution || 'best';

    // Jalankan download melalui DownloadManager
    const downloadId = downloadManager.startDownload(
      url,
      formatSelector,
      savePath,
      // Callback progres — kirim ke renderer
      (progress) => {
        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.webContents.send('download-progress', progress);
        }
      },
      // Callback selesai — simpan ke riwayat
      (result) => {
        const history = store.get('history');
        history.unshift({
          id: Date.now().toString(36),
          timestamp: new Date().toISOString(),
          url,
          platform: detectPlatform(url),
          resolution,
          filePath: savePath,
          status: 'completed'
        });
        // Batasi riwayat maksimal 100 entri
        if (history.length > 100) history.length = 100;
        store.set('history', history);

        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.webContents.send('download-complete', { filePath: savePath });
        }
      },
      // Callback error — kirim pesan error ke renderer
      (error) => {
        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.webContents.send('download-error', { error: error.message });
        }
      }
    );

    return { downloadId };
  });

  // ---------- BATALKAN DOWNLOAD ----------
  // Membatalkan download yang sedang berjalan berdasarkan ID
  ipcMain.handle('cancel-download', async (event, downloadId) => {
    return downloadManager.cancelDownload(downloadId);
  });

  // ---------- PILIH FOLDER ----------
  // Membuka dialog pemilihan folder untuk menyimpan download
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: store.get('settings.downloadPath') || path.join(app.getPath('downloads'), 'ElectDW')
    });

    if (!result.canceled && result.filePaths.length > 0) {
      store.set('settings.downloadPath', result.filePaths[0]);
      return { folderPath: result.filePaths[0] };
    }
    return { folderPath: null };
  });

  // ---------- BUKA FOLDER ----------
  // Membuka folder tertentu di file manager sistem
  ipcMain.handle('open-folder', async (event, folderPath) => {
    if (folderPath && fs.existsSync(folderPath)) {
      shell.openPath(folderPath);
    }
  });

  // ---------- RIWAYAT DOWNLOAD ----------
  // Mengambil daftar riwayat download
  ipcMain.handle('get-history', async () => {
    return store.get('history');
  });

  // ---------- TAMBAH RIWAYAT ----------
  // Menambahkan entri baru ke riwayat download
  ipcMain.handle('add-history', async (event, entry) => {
    const history = store.get('history');
    history.unshift({
      id: Date.now().toString(36),
      timestamp: new Date().toISOString(),
      ...entry
    });

    // Batasi riwayat maksimal 100 entri
    if (history.length > 100) {
      history.length = 100;
    }

    store.set('history', history);
    return history;
  });

  // ---------- HAPUS RIWAYAT ----------
  // Menghapus seluruh riwayat download
  ipcMain.handle('clear-history', async () => {
    store.set('history', []);
    return [];
  });

  // ---------- PENGATURAN ----------
  // Mengambil pengaturan yang tersimpan
  ipcMain.handle('get-settings', async () => {
    return store.get('settings');
  });

  // ---------- SIMPAN PENGATURAN ----------
  // Menyimpan perubahan pengaturan
  ipcMain.handle('save-settings', async (event, settings) => {
    store.set('settings', settings);
    if (settings.theme && currentWindow) {
      nativeTheme.themeSource = settings.theme;
    }
    return true;
  });

  // ---------- BUKA LINK EKSTERNAL ----------
  // Membuka URL di browser default sistem
  ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
  });

  // ---------- VERSI YT-DLP ----------
  // Mendapatkan versi yt-dlp yang terinstall
  ipcMain.handle('get-ytdlp-version', async () => {
    try {
      const ytDlpPath = require('./downloader').getYtDlpPath
        ? require('./downloader').getYtDlpPath()
        : 'yt-dlp';
      const { execFileSync } = require('child_process');
      const version = execFileSync(ytDlpPath, ['--version'], { timeout: 5000 }).toString().trim();
      return version;
    } catch {
      return 'unknown';
    }
  });
}

module.exports = { setupIpcHandlers, setWindow };
