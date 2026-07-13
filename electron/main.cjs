const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEV_URL = process.env.ELECTRON_DEV_URL;
const IS_DEV = Boolean(DEV_URL);
const DIST_PATH = path.join(__dirname, '..', 'dist');
const APP_URL_ROOT = pathToFileURL(`${DIST_PATH}${path.sep}`).href;

// Electron enables hardware acceleration by default. These hints opt into the
// fastest Chromium rendering paths where the installed GPU driver supports it.
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('high-dpi-support', '1');

if (process.platform === 'win32') {
  app.setAppUserModelId('games.bloodleague.kickoff');
}

let mainWindow = null;

function isTrustedDevUrl(url) {
  if (!IS_DEV) return false;

  try {
    const requested = new URL(url);
    const configured = new URL(DEV_URL);
    return requested.origin === configured.origin;
  } catch {
    return false;
  }
}

function isTrustedAppUrl(url) {
  if (IS_DEV) return isTrustedDevUrl(url);
  return url.startsWith(APP_URL_ROOT);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#08070d',
    autoHideMenuBar: true,
    show: false,
    fullscreenable: true,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: IS_DEV,
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedAppUrl(url)) event.preventDefault();
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    if (input.key === 'F11') {
      event.preventDefault();
      mainWindow?.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (IS_DEV) {
    void mainWindow.loadURL(DEV_URL);
  } else {
    void mainWindow.loadFile(path.join(DIST_PATH, 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
