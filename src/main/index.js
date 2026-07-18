// ============================================================
// index.js — Entry Point Proses Utama (Main Process) ElectDW
// ============================================================
// File ini mengatur siklus hidup aplikasi Electron, membuat jendela
// utama, dan menghubungkan IPC handler untuk komunikasi dengan
// proses renderer (UI).
// ============================================================

const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');
const { setupIpcHandlers, setWindow } = require('./ipc-handlers');
const store = require('./store');

// Deteksi mode development dari environment variable
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

// ------------------------------------------------------------
// Fungsi createWindow — Membuat jendela utama aplikasi
// ------------------------------------------------------------
function createWindow() {
  // Ambil preferensi tema dari penyimpanan, default 'dark'
  const theme = store.get('settings.theme') || 'dark';
  nativeTheme.themeSource = theme;

  mainWindow = new BrowserWindow({
    width: 790,
    height: 820,
    resizable: true,              // Jendela bisa diubah ukurannya
    center: true,                 // Muncul di tengah layar
    title: 'ElectDW',
    titleBarStyle: 'hiddenInset', // Titlebar macOS dengan traffic light menyatu
    backgroundColor: '#0B0E14',   // Warna background sebelum konten dimuat
    show: false,                  // Tunggu sampai siap tampil
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,     // Keamanan: pisahkan konteks renderer
      nodeIntegration: false,     // Keamanan: nonaktifkan Node di renderer
      sandbox: false              // Diperlukan untuk akses preload yang aman
    }
  });

  // Muat file HTML sebagai antarmuka pengguna
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Tampilkan jendela setelah konten siap dirender
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Daftarkan referensi jendela ke IPC handler
  setWindow(mainWindow);

  // Buka DevTools otomatis jika dalam mode development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ------------------------------------------------------------
// Siklus Hidup Aplikasi
// ------------------------------------------------------------

// Saat aplikasi siap, daftarkan IPC handler dan buat jendela
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  // macOS: buka ulang jendela saat ikon dock diklik
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Keluar dari aplikasi saat semua jendela ditutup (kecuali macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
