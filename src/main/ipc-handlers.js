const { ipcMain, dialog, shell, app, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');
const { detectPlatform, getFormatList, DownloadManager } = require('./downloader');

const downloadManager = new DownloadManager();

function setupIpcHandlers(mainWindow) {
  ipcMain.handle('detect-link', async (event, url) => {
    const platform = detectPlatform(url);
    return { platform, valid: platform !== null };
  });

  ipcMain.handle('fetch-formats', async (event, url) => {
    try {
      const data = await getFormatList(url);

      let formats = [];
      if (data && data.formats) {
        const seenHeights = new Set();

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

        const uniqueResolutions = new Map();
        for (const f of formats) {
          const key = f.resolution;
          if (!uniqueResolutions.has(key)) {
            uniqueResolutions.set(key, f);
          }
        }

        formats = Array.from(uniqueResolutions.values());
      }

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

      return {
        title: data.title || 'Unknown Title',
        thumbnail: data.thumbnail || '',
        duration: data.duration || 0,
        uploader: data.uploader || '',
        formats
      };
    } catch (error) {
      throw new Error(`Failed to fetch formats: ${error.message}`);
    }
  });

  ipcMain.handle('start-download', async (event, { url, resolution, outputPath }) => {
    const defaultPath = store.get('settings.downloadPath') || path.join(app.getPath('downloads'), 'ElectDW');

    const savePath = outputPath || defaultPath;

    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }

    const formatSelector = resolution || 'best';

    const downloadId = downloadManager.startDownload(
      url,
      formatSelector,
      savePath,
      (progress) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', progress);
        }
      },
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
        if (history.length > 100) history.length = 100;
        store.set('history', history);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-complete', { filePath: savePath });
        }
      },
      (error) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-error', { error: error.message });
        }
      }
    );

    return { downloadId };
  });

  ipcMain.handle('cancel-download', async (event, downloadId) => {
    return downloadManager.cancelDownload(downloadId);
  });

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

  ipcMain.handle('open-folder', async (event, folderPath) => {
    if (folderPath && fs.existsSync(folderPath)) {
      shell.openPath(folderPath);
    }
  });

  ipcMain.handle('get-history', async () => {
    return store.get('history');
  });

  ipcMain.handle('add-history', async (event, entry) => {
    const history = store.get('history');
    history.unshift({
      id: Date.now().toString(36),
      timestamp: new Date().toISOString(),
      ...entry
    });

    if (history.length > 100) {
      history.length = 100;
    }

    store.set('history', history);
    return history;
  });

  ipcMain.handle('clear-history', async () => {
    store.set('history', []);
    return [];
  });

  ipcMain.handle('get-settings', async () => {
    return store.get('settings');
  });

  ipcMain.handle('save-settings', async (event, settings) => {
    store.set('settings', settings);
    if (settings.theme && mainWindow) {
      nativeTheme.themeSource = settings.theme;
    }
    return true;
  });

  ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
  });

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

module.exports = { setupIpcHandlers };
