const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let callbackInvocations = {};
let registeredShortcuts = [];

function getPlatformModifier() {
  return process.platform === 'darwin' ? 'Command' : 'Ctrl';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'test-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'test-page.html'));
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createShortcutCallback(id) {
  return () => {
    if (!callbackInvocations[id]) {
      callbackInvocations[id] = 0;
    }
    callbackInvocations[id]++;
    console.log(`[TEST] 快捷键回调被触发: ${id}, 次数: ${callbackInvocations[id]}`);
    
    if (mainWindow) {
      mainWindow.webContents.send('shortcut-triggered', { id, count: callbackInvocations[id] });
    }
  };
}

ipcMain.handle('register-shortcut', (event, id, accelerator) => {
  try {
    const callback = createShortcutCallback(id);
    const success = globalShortcut.register(accelerator, callback);
    
    if (success) {
      registeredShortcuts.push({ id, accelerator });
    }
    
    return {
      success,
      isRegistered: globalShortcut.isRegistered(accelerator)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('unregister-shortcut', (event, accelerator) => {
  try {
    globalShortcut.unregister(accelerator);
    registeredShortcuts = registeredShortcuts.filter(s => s.accelerator !== accelerator);
    
    return {
      success: true,
      isRegistered: globalShortcut.isRegistered(accelerator)
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('unregister-all-shortcuts', () => {
  try {
    globalShortcut.unregisterAll();
    registeredShortcuts = [];
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('is-shortcut-registered', (event, accelerator) => {
  return {
    registered: globalShortcut.isRegistered(accelerator)
  };
});

ipcMain.handle('get-callback-count', (event, id) => {
  return {
    count: callbackInvocations[id] || 0
  };
});

ipcMain.handle('reset-callback-counts', () => {
  callbackInvocations = {};
  return { success: true };
});

ipcMain.handle('get-platform-info', () => {
  return {
    platform: process.platform,
    modifier: getPlatformModifier()
  };
});

ipcMain.handle('trigger-shortcut-callback', (event, id) => {
  const callback = createShortcutCallback(id);
  callback();
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
