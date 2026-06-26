const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('testAPI', {
  registerShortcut: (id, accelerator) => ipcRenderer.invoke('register-shortcut', id, accelerator),
  unregisterShortcut: (accelerator) => ipcRenderer.invoke('unregister-shortcut', accelerator),
  unregisterAllShortcuts: () => ipcRenderer.invoke('unregister-all-shortcuts'),
  isShortcutRegistered: (accelerator) => ipcRenderer.invoke('is-shortcut-registered', accelerator),
  getCallbackCount: (id) => ipcRenderer.invoke('get-callback-count', id),
  resetCallbackCounts: () => ipcRenderer.invoke('reset-callback-counts'),
  getPlatformInfo: () => ipcRenderer.invoke('get-platform-info'),
  triggerShortcutCallback: (id) => ipcRenderer.invoke('trigger-shortcut-callback', id),
  onShortcutTriggered: (callback) => {
    ipcRenderer.on('shortcut-triggered', (event, data) => callback(data));
  }
});
