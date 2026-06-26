const { app, BrowserWindow, globalShortcut, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let registeredShortcuts = [];
let shortcutConfig = {};

function getPlatformModifier() {
  return process.platform === 'darwin' ? 'Command' : 'Ctrl';
}

function getConfigPath() {
  return path.join(app.getPath('userData'), 'shortcut-config.json');
}

function getDefaultShortcuts() {
  const modifier = getPlatformModifier();
  return {
    'show-window': {
      accelerator: `${modifier}+Shift+L`,
      description: '显示/打开主窗口'
    },
    'quit-app': {
      accelerator: `${modifier}+Shift+Q`,
      description: '退出应用'
    }
  };
}

function loadShortcutConfig() {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      shortcutConfig = JSON.parse(data);
      console.log('已加载快捷键配置:', shortcutConfig);
    } else {
      shortcutConfig = getDefaultShortcuts();
      saveShortcutConfig();
    }
  } catch (error) {
    console.error('加载快捷键配置失败，使用默认配置:', error);
    shortcutConfig = getDefaultShortcuts();
  }
  return shortcutConfig;
}

function saveShortcutConfig() {
  const configPath = getConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(shortcutConfig, null, 2), 'utf-8');
    console.log('已保存快捷键配置到:', configPath);
    return true;
  } catch (error) {
    console.error('保存快捷键配置失败:', error);
    dialog.showErrorBox('保存失败', '无法保存快捷键配置：' + error.message);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getShortcutCallback(id) {
  const callbacks = {
    'show-window': () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
        mainWindow.focus();
      } else {
        createWindow();
      }
    },
    'quit-app': () => {
      app.quit();
    }
  };
  return callbacks[id] || null;
}

function registerGlobalShortcuts() {
  unregisterGlobalShortcuts();
  registeredShortcuts = [];
  const failedShortcuts = [];

  for (const [id, config] of Object.entries(shortcutConfig)) {
    const callback = getShortcutCallback(id);
    if (!callback) {
      console.warn(`未找到快捷键 ${id} 的回调函数，跳过注册`);
      continue;
    }

    const accelerator = config.accelerator;
    const isRegistered = globalShortcut.isRegistered(accelerator);
    
    if (isRegistered) {
      failedShortcuts.push({
        id,
        accelerator,
        error: '已被其他应用占用'
      });
      continue;
    }

    const success = globalShortcut.register(accelerator, callback);
    
    if (success) {
      registeredShortcuts.push({
        id,
        accelerator
      });
      console.log(`快捷键 ${accelerator} (${id}) 注册成功`);
    } else {
      failedShortcuts.push({
        id,
        accelerator,
        error: '注册失败，可能已被其他应用占用'
      });
    }
  }

  if (failedShortcuts.length > 0) {
    const errorMessages = failedShortcuts
      .map(s => `${s.accelerator}: ${s.error}`)
      .join('\n');
    dialog.showErrorBox(
      '部分快捷键注册失败',
      `以下快捷键注册失败：\n\n${errorMessages}\n\n请在设置中更换快捷键。`
    );
  }

  return {
    registered: registeredShortcuts,
    failed: failedShortcuts
  };
}

function updateShortcut(id, newAccelerator) {
  if (!shortcutConfig[id]) {
    return { success: false, error: `未找到快捷键配置: ${id}` };
  }

  const oldAccelerator = shortcutConfig[id].accelerator;

  if (newAccelerator === oldAccelerator) {
    return { success: true, message: '快捷键未变化' };
  }

  for (const [otherId, config] of Object.entries(shortcutConfig)) {
    if (otherId !== id && config.accelerator === newAccelerator) {
      return {
        success: false,
        error: `快捷键 ${newAccelerator} 已被 "${config.description}" 使用`
      };
    }
  }

  if (globalShortcut.isRegistered(newAccelerator)) {
    return {
      success: false,
      error: `快捷键 ${newAccelerator} 已被其他应用占用`
    };
  }

  shortcutConfig[id].accelerator = newAccelerator;
  
  if (!saveShortcutConfig()) {
    shortcutConfig[id].accelerator = oldAccelerator;
    return { success: false, error: '保存配置失败' };
  }

  const result = registerGlobalShortcuts();
  
  if (result.failed.some(f => f.id === id)) {
    return {
      success: false,
      error: `注册新快捷键 ${newAccelerator} 失败，已恢复原快捷键`
    };
  }

  return {
    success: true,
    message: `快捷键已更新为 ${newAccelerator}`,
    oldAccelerator,
    newAccelerator
  };
}

function resetShortcuts() {
  shortcutConfig = getDefaultShortcuts();
  saveShortcutConfig();
  return registerGlobalShortcuts();
}

function unregisterGlobalShortcuts() {
  for (const shortcut of registeredShortcuts) {
    if (globalShortcut.isRegistered(shortcut.accelerator)) {
      globalShortcut.unregister(shortcut.accelerator);
      console.log(`已注销快捷键 ${shortcut.accelerator}`);
    }
  }
  registeredShortcuts = [];
  globalShortcut.unregisterAll();
  console.log('已注销所有全局快捷键');
}

app.whenReady().then(() => {
  loadShortcutConfig();
  createWindow();
  registerGlobalShortcuts();

  ipcMain.handle('get-shortcuts', () => {
    return {
      config: shortcutConfig,
      registered: registeredShortcuts,
      platform: process.platform,
      modifier: getPlatformModifier(),
      configPath: getConfigPath()
    };
  });

  ipcMain.handle('update-shortcut', (event, id, newAccelerator) => {
    return updateShortcut(id, newAccelerator);
  });

  ipcMain.handle('reset-shortcuts', () => {
    return resetShortcuts();
  });

  ipcMain.handle('validate-accelerator', (event, accelerator, excludeId) => {
    if (globalShortcut.isRegistered(accelerator)) {
      return { valid: false, error: '已被其他应用占用' };
    }
    for (const [id, config] of Object.entries(shortcutConfig)) {
      if (id !== excludeId && config.accelerator === accelerator) {
        return { valid: false, error: `已被 "${config.description}" 使用` };
      }
    }
    return { valid: true };
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
    if (registeredShortcuts.length === 0) {
      registerGlobalShortcuts();
    }
  });

  app.on('will-quit', (event) => {
    unregisterGlobalShortcuts();
  });

  app.on('before-quit', (event) => {
    unregisterGlobalShortcuts();
  });

  app.on('quit', (event, exitCode) => {
    unregisterGlobalShortcuts();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    unregisterGlobalShortcuts();
    app.quit();
  } else {
    unregisterGlobalShortcuts();
  }
});

process.on('SIGINT', () => {
  unregisterGlobalShortcuts();
  app.quit();
});

process.on('SIGTERM', () => {
  unregisterGlobalShortcuts();
  app.quit();
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  unregisterGlobalShortcuts();
  app.quit();
});
