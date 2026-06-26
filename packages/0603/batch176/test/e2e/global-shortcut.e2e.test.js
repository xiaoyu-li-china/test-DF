const { Application } = require('spectron');
const { expect } = require('chai');
const path = require('path');

describe('全局快捷键 E2E 测试', function() {
  this.timeout(30000);
  
  let app;

  before(async function() {
    app = new Application({
      path: require('electron'),
      args: [path.join(__dirname, '..', 'test-app-main.js')],
      startTimeout: 15000,
      waitTimeout: 10000
    });
    
    await app.start();
    await app.browserWindow.isVisible();
    await app.client.waitUntilTextExists('#status', 'test-ready', 10000);
  });

  after(async function() {
    if (app && app.isRunning()) {
      await app.stop();
    }
  });

  describe('快捷键注册测试', function() {
    it('应该成功注册快捷键', async function() {
      const result = await app.electron.ipcRenderer.invoke(
        'register-shortcut',
        'test-shortcut-1',
        'Ctrl+Shift+Alt+T'
      );
      
      expect(result.success).to.be.true;
      expect(result.isRegistered).to.be.true;
    });

    it('应该检测已注册的快捷键', async function() {
      const result = await app.electron.ipcRenderer.invoke(
        'is-shortcut-registered',
        'Ctrl+Shift+Alt+T'
      );
      
      expect(result.registered).to.be.true;
    });

    it('应该成功注销快捷键', async function() {
      const result = await app.electron.ipcRenderer.invoke(
        'unregister-shortcut',
        'Ctrl+Shift+Alt+T'
      );
      
      expect(result.success).to.be.true;
      expect(result.isRegistered).to.be.false;
    });

    it('注销后快捷键应该未被注册', async function() {
      const result = await app.electron.ipcRenderer.invoke(
        'is-shortcut-registered',
        'Ctrl+Shift+Alt+T'
      );
      
      expect(result.registered).to.be.false;
    });
  });

  describe('快捷键回调触发测试', function() {
    it('注册快捷键后触发回调应该能被记录', async function() {
      await app.electron.ipcRenderer.invoke('reset-callback-counts');
      
      await app.electron.ipcRenderer.invoke(
        'register-shortcut',
        'callback-test',
        'Ctrl+Shift+Alt+C'
      );

      await app.electron.ipcRenderer.invoke(
        'trigger-shortcut-callback',
        'callback-test'
      );

      const count = await app.electron.ipcRenderer.invoke(
        'get-callback-count',
        'callback-test'
      );
      
      expect(count.count).to.equal(1);
    });

    it('多次触发回调应该正确计数', async function() {
      await app.electron.ipcRenderer.invoke('reset-callback-counts');
      
      await app.electron.ipcRenderer.invoke(
        'register-shortcut',
        'multi-trigger-test',
        'Ctrl+Shift+Alt+M'
      );

      for (let i = 0; i < 3; i++) {
        await app.electron.ipcRenderer.invoke(
          'trigger-shortcut-callback',
          'multi-trigger-test'
        );
      }

      const count = await app.electron.ipcRenderer.invoke(
        'get-callback-count',
        'multi-trigger-test'
      );
      
      expect(count.count).to.equal(3);
    });

    it('不同快捷键的回调应该独立计数', async function() {
      await app.electron.ipcRenderer.invoke('reset-callback-counts');
      
      await app.electron.ipcRenderer.invoke(
        'register-shortcut',
        'shortcut-a',
        'Ctrl+Shift+Alt+A'
      );
      
      await app.electron.ipcRenderer.invoke(
        'register-shortcut',
        'shortcut-b',
        'Ctrl+Shift+Alt+B'
      );

      await app.electron.ipcRenderer.invoke('trigger-shortcut-callback', 'shortcut-a');
      await app.electron.ipcRenderer.invoke('trigger-shortcut-callback', 'shortcut-a');
      await app.electron.ipcRenderer.invoke('trigger-shortcut-callback', 'shortcut-b');

      const countA = await app.electron.ipcRenderer.invoke('get-callback-count', 'shortcut-a');
      const countB = await app.electron.ipcRenderer.invoke('get-callback-count', 'shortcut-b');
      
      expect(countA.count).to.equal(2);
      expect(countB.count).to.equal(1);
    });
  });

  describe('快捷键注销后回调测试', function() {
    it('注销快捷键后，通过 API 触发仍能工作（回调函数仍然存在）', async function() {
      await app.electron.ipcRenderer.invoke('reset-callback-counts');
      
      await app.electron.ipcRenderer.invoke(
        'register-shortcut',
        'unregister-test',
        'Ctrl+Shift+Alt+U'
      );

      await app.electron.ipcRenderer.invoke('unregister-shortcut', 'Ctrl+Shift+Alt+U');

      const isRegistered = await app.electron.ipcRenderer.invoke(
        'is-shortcut-registered',
        'Ctrl+Shift+Alt+U'
      );
      expect(isRegistered.registered).to.be.false;

      await app.electron.ipcRenderer.invoke('trigger-shortcut-callback', 'unregister-test');
      const count = await app.electron.ipcRenderer.invoke('get-callback-count', 'unregister-test');
      
      expect(count.count).to.equal(1);
    });

    it('批量注销所有快捷键', async function() {
      await app.electron.ipcRenderer.invoke(
        'register-shortcut',
        'batch-1',
        'Ctrl+Shift+Alt+1'
      );
      await app.electron.ipcRenderer.invoke(
        'register-shortcut',
        'batch-2',
        'Ctrl+Shift+Alt+2'
      );
      await app.electron.ipcRenderer.invoke(
        'register-shortcut',
        'batch-3',
        'Ctrl+Shift+Alt+3'
      );

      const result = await app.electron.ipcRenderer.invoke('unregister-all-shortcuts');
      expect(result.success).to.be.true;

      const reg1 = await app.electron.ipcRenderer.invoke('is-shortcut-registered', 'Ctrl+Shift+Alt+1');
      const reg2 = await app.electron.ipcRenderer.invoke('is-shortcut-registered', 'Ctrl+Shift+Alt+2');
      const reg3 = await app.electron.ipcRenderer.invoke('is-shortcut-registered', 'Ctrl+Shift+Alt+3');
      
      expect(reg1.registered).to.be.false;
      expect(reg2.registered).to.be.false;
      expect(reg3.registered).to.be.false;
    });
  });

  describe('平台兼容性测试', function() {
    it('应该返回正确的平台信息', async function() {
      const info = await app.electron.ipcRenderer.invoke('get-platform-info');
      
      expect(info).to.have.property('platform');
      expect(info).to.have.property('modifier');
      expect(['darwin', 'win32', 'linux']).to.include(info.platform);
      expect(['Command', 'Ctrl']).to.include(info.modifier);
    });
  });
});
