const { app, BrowserWindow, nativeTheme } = require('electron');
const path = require('path');
const { setupIpcHandlers } = require('./ipc-handlers');
const store = require('./store');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  const theme = store.get('settings.theme') || 'dark';
  nativeTheme.themeSource = theme;

  mainWindow = new BrowserWindow({
    width: 800,
    height: 620,
    minWidth: 720,
    minHeight: 520,
    title: 'ElectDW',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0B0E14',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  setupIpcHandlers(mainWindow);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
