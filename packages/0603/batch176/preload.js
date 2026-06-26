const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('shortcutAPI', {
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  updateShortcut: (id, accelerator) => ipcRenderer.invoke('update-shortcut', id, accelerator),
  resetShortcuts: () => ipcRenderer.invoke('reset-shortcuts'),
  validateAccelerator: (accelerator, excludeId) => ipcRenderer.invoke('validate-accelerator', accelerator, excludeId),
  platform: process.platform,
  modifier: process.platform === 'darwin' ? 'Command' : 'Ctrl'
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('页面加载完成');
});
