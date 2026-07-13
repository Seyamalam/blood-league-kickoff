const { contextBridge } = require('electron');

// Keep the renderer isolated from Node.js. Only immutable, non-privileged
// runtime information is exposed for diagnostics and platform-aware UI hints.
contextBridge.exposeInMainWorld('desktopRuntime', Object.freeze({
  isDesktop: true,
  platform: process.platform,
  versions: Object.freeze({
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  }),
}));

