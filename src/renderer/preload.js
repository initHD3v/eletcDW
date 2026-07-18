// ============================================================
// preload.js — Jembatan Komunikasi (Bridge) Renderer ↔ Main
// ============================================================
// File ini dieksekusi sebelum konten web dimuat. Menggunakan
// contextBridge untuk mengekspos API yang aman dari proses utama
// ke proses renderer tanpa memberikan akses langsung ke Node.js.
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

// Ekspos API ke window.electronAPI di renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // ---------- DETEKSI & FORMAT ----------
  detectLink: (url) => ipcRenderer.invoke('detect-link', url),
  fetchFormats: (url) => ipcRenderer.invoke('fetch-formats', url),

  // ---------- MANAJEMEN DOWNLOAD ----------
  startDownload: (data) => ipcRenderer.invoke('start-download', data),
  cancelDownload: (downloadId) => ipcRenderer.invoke('cancel-download', downloadId),

  // ---------- FOLDER ----------
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // ---------- RIWAYAT ----------
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (entry) => ipcRenderer.invoke('add-history', entry),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // ---------- PENGATURAN ----------
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // ---------- UMUM ----------
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getYtdlpVersion: () => ipcRenderer.invoke('get-ytdlp-version'),

  // ---------- EVENT LISTENER (dari Main → Renderer) ----------
  // Mendengarkan event progres download dari proses utama
  onDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },
  // Mendengarkan event selesai download
  onDownloadComplete: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-complete', handler);
    return () => ipcRenderer.removeListener('download-complete', handler);
  },
  // Mendengarkan event error download
  onDownloadError: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-error', handler);
    return () => ipcRenderer.removeListener('download-error', handler);
  }
});
