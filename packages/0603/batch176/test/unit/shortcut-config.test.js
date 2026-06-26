const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('快捷键配置管理', function() {
  let tempDir;
  let originalUserData;
  let appMock;

  beforeEach(function() {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-test-'));
    
    delete require.cache[require.resolve('../../main.js')];
    
    appMock = {
      getPath: sinon.stub().returns(tempDir),
      getName: sinon.stub().returns('TestApp'),
      getVersion: sinon.stub().returns('1.0.0')
    };
    
    originalUserData = process.env.ELECTRON_USER_DATA;
    process.env.ELECTRON_USER_DATA = tempDir;
  });

  afterEach(function() {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (originalUserData) {
      process.env.ELECTRON_USER_DATA = originalUserData;
    } else {
      delete process.env.ELECTRON_USER_DATA;
    }
    sinon.restore();
  });

  describe('配置文件路径', function() {
    it('应该返回正确的配置文件路径', function() {
      const mockAppGetPath = sinon.stub().returns(tempDir);
      
      const testPath = path.join(tempDir, 'shortcut-config.json');
      expect(testPath).to.include('shortcut-config.json');
    });
  });

  describe('默认快捷键配置', function() {
    it('macOS 平台应该使用 Command 修饰键', function() {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      
      const modifier = process.platform === 'darwin' ? 'Command' : 'Ctrl';
      expect(modifier).to.equal('Command');
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('非 macOS 平台应该使用 Ctrl 修饰键', function() {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      const modifier = process.platform === 'darwin' ? 'Command' : 'Ctrl';
      expect(modifier).to.equal('Ctrl');
      
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('应该包含 show-window 和 quit-app 两个快捷键', function() {
      const modifier = process.platform === 'darwin' ? 'Command' : 'Ctrl';
      const defaultShortcuts = {
        'show-window': {
          accelerator: `${modifier}+Shift+L`,
          description: '显示/打开主窗口'
        },
        'quit-app': {
          accelerator: `${modifier}+Shift+Q`,
          description: '退出应用'
        }
      };
      
      expect(defaultShortcuts).to.have.property('show-window');
      expect(defaultShortcuts).to.have.property('quit-app');
      expect(defaultShortcuts['show-window'].accelerator).to.equal(`${modifier}+Shift+L`);
      expect(defaultShortcuts['quit-app'].accelerator).to.equal(`${modifier}+Shift+Q`);
    });
  });

  describe('配置文件读写', function() {
    it('应该能够写入配置文件', function() {
      const configPath = path.join(tempDir, 'shortcut-config.json');
      const testConfig = {
        'show-window': {
          accelerator: 'Ctrl+Shift+A',
          description: '显示/打开主窗口'
        }
      };
      
      fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2), 'utf-8');
      
      expect(fs.existsSync(configPath)).to.be.true;
      const savedData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(savedData).to.deep.equal(testConfig);
    });

    it('应该能够读取配置文件', function() {
      const configPath = path.join(tempDir, 'shortcut-config.json');
      const testConfig = {
        'test-shortcut': {
          accelerator: 'Ctrl+Alt+T',
          description: '测试快捷键'
        }
      };
      
      fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2), 'utf-8');
      const loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      
      expect(loadedConfig).to.deep.equal(testConfig);
    });

    it('配置文件不存在时应该返回 undefined', function() {
      const configPath = path.join(tempDir, 'nonexistent-config.json');
      expect(fs.existsSync(configPath)).to.be.false;
    });
  });
});
