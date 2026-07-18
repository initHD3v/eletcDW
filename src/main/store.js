// ============================================================
// store.js — Penyimpanan Data Persisten (Main Process)
// ============================================================
// Menggunakan library electron-store untuk menyimpan pengaturan
// dan riwayat download secara permanen di disk.
// Data disimpan dalam format JSON di direktori data aplikasi.
// ============================================================

const Store = require('electron-store');

// ------------------------------------------------------------
// Schema — Mendefinisikan struktur dan default value data
// ------------------------------------------------------------
const schema = {
  settings: {
    type: 'object',
    properties: {
      downloadPath: { type: 'string', default: '' },           // Path folder download kustom
      autoOpenFolder: { type: 'boolean', default: true },       // Buka folder otomatis setelah selesai
      defaultResolution: { type: 'string', default: 'best' },   // Resolusi default
      theme: { type: 'string', enum: ['dark', 'light'], default: 'dark' },  // Tema aplikasi
      concurrentDownloads: { type: 'number', default: 1 },      // Jumlah download bersamaan
      notifyOnComplete: { type: 'boolean', default: true },      // Notifikasi saat selesai
      proxyUrl: { type: 'string', default: '' },                 // Proxy untuk download
      filenameTemplate: { type: 'string', default: '%(title)s.%(ext)s' }  // Template nama file
    },
    default: {}
  },
  history: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        url: { type: 'string' },
        title: { type: 'string' },
        platform: { type: 'string' },
        resolution: { type: 'string' },
        filePath: { type: 'string' },
        fileSize: { type: 'number' },
        status: { type: 'string', enum: ['completed', 'failed', 'cancelled'] },
        timestamp: { type: 'string' }
      }
    }
  }
};

// Buat instance store dengan schema yang sudah didefinisikan
const store = new Store({ schema });

module.exports = store;
