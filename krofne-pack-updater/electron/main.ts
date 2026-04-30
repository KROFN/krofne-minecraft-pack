import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { app, BrowserWindow, Menu } from 'electron';
import { registerIpcHandlers } from './ipc/registerIpcHandlers';

// ESM-compatible __dirname replacement
const MAIN_FILE = fileURLToPath(import.meta.url);
const DIST_ELECTRON_DIR = path.dirname(MAIN_FILE);
const APP_ICON = path.join(DIST_ELECTRON_DIR, '../resources/icon.ico');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: 'krofnePackUpdater',
    backgroundColor: '#1a1a2e',
    icon: APP_ICON,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // IMPORTANT: latin "c" in preload.cjs
      preload: path.join(DIST_ELECTRON_DIR, 'preload.cjs'),
    },
  });

  // Remove the default Electron menu entirely
  mainWindow.removeMenu();

  // In dev: load from Vite dev server
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://127.0.0.1:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(DIST_ELECTRON_DIR, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Remove application menu globally
  Menu.setApplicationMenu(null);

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
