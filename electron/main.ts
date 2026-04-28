import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc/registerIpcHandlers";

const MAIN_FILE = fileURLToPath(import.meta.url);
const DIST_ELECTRON_DIR = path.dirname(MAIN_FILE);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: "krofnePackUpdater",
    backgroundColor: "#1a1a2e",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(DIST_ELECTRON_DIR, "preload.cjs"),
    },
  });

  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(DIST_ELECTRON_DIR, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});