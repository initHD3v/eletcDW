const { ipcMain, dialog, shell, app } = require('electron');
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
        formats = data.formats
          .filter(f => f.vcodec !== 'none' || f.acodec !== 'none')
          .filter(f => f.height || f.format_note)
          .map(f => ({
            formatId: f.format_id,
            resolution: f.height ? `${f.height}p` : (f.format_note || 'unknown'),
            ext: f.ext || 'mp4',
            filesize: f.filesize || f.filesize_approx || 0,
            vcodec: f.vcodec || 'unknown',
            acodec: f.acodec || 'unknown',
            hasVideo: f.vcodec !== 'none',
            hasAudio: f.acodec !== 'none'
          }))
          .sort((a, b) => {
            const aRes = parseInt(a.resolution) || 0;
            const bRes = parseInt(b.resolution) || 0;
            return bRes - aRes;
          });
      }

      const uniqueResolutions = new Map();
      for (const f of formats) {
        const key = f.resolution;
        if (!uniqueResolutions.has(key) || f.filesize > uniqueResolutions.get(key).filesize) {
          uniqueResolutions.set(key, f);
        }
      }

      return {
        title: data.title || 'Unknown Title',
        thumbnail: data.thumbnail || '',
        duration: data.duration || 0,
        uploader: data.uploader || '',
        formats: Array.from(uniqueResolutions.values())
      };
    } catch (error) {
      throw new Error(`Failed to fetch formats: ${error.message}`);
    }
  });

  ipcMain.handle('start-download', async (event, { url, formatId, outputPath }) => {
    const defaultPath = store.get('settings.downloadPath') || path.join(app.getPath('downloads'), 'ElectDW');

    const savePath = outputPath || defaultPath;

    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const downloadId = downloadManager.startDownload(
        url,
        formatId,
        savePath,
        (progress) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', progress);
          }
        },
        (result) => {
          resolve({ success: true, ...result });
        },
        (error) => {
          reject(error);
        }
      );
      resolve({ downloadId });
    });
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
    return true;
  });

  ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
  });
}

module.exports = { setupIpcHandlers };
