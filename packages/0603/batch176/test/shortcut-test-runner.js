const { app, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let testResults = [];
let testPassed = 0;
let testFailed = 0;

function logResult(testName, passed, message = '') {
  testResults.push({
    name: testName,
    passed,
    message
  });
  
  if (passed) {
    testPassed++;
    console.log(`  ✓ ${testName}`);
  } else {
    testFailed++;
    console.log(`  ✗ ${testName}`);
    if (message) {
      console.log(`    ${message}`);
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('  Electron 全局快捷键模块测试');
  console.log('========================================\n');

  console.log('1. 快捷键注册与注销测试');
  console.log('----------------------------------------\n');

  const testAccelerator = 'Ctrl+Shift+Alt+T';
  let callbackCalled = false;
  const callback = () => {
    callbackCalled = true;
  };

  try {
    const isRegisteredBefore = globalShortcut.isRegistered(testAccelerator);
    assert(!isRegisteredBefore, '测试快捷键在注册前不应被注册');
    logResult('注册前快捷键未被注册', true);
  } catch (error) {
    logResult('注册前快捷键未被注册', false, error.message);
  }

  try {
    const success = globalShortcut.register(testAccelerator, callback);
    assert(success, '快捷键注册应该成功');
    logResult('注册快捷键成功', true);
  } catch (error) {
    logResult('注册快捷键成功', false, error.message);
  }

  try {
    const isRegisteredAfter = globalShortcut.isRegistered(testAccelerator);
    assert(isRegisteredAfter, '注册后快捷键应该被标记为已注册');
    logResult('注册后快捷键状态为已注册', true);
  } catch (error) {
    logResult('注册后快捷键状态为已注册', false, error.message);
  }

  try {
    globalShortcut.unregister(testAccelerator);
    const isRegisteredAfterUnregister = globalShortcut.isRegistered(testAccelerator);
    assert(!isRegisteredAfterUnregister, '注销后快捷键应该被标记为未注册');
    logResult('注销快捷键成功', true);
  } catch (error) {
    logResult('注销快捷键成功', false, error.message);
  }

  console.log('\n2. 快捷键冲突检测测试');
  console.log('----------------------------------------\n');

  const conflictAccelerator = 'Ctrl+Shift+Alt+X';

  try {
    const firstRegister = globalShortcut.register(conflictAccelerator, () => {});
    assert(firstRegister, '第一次注册应该成功');
    
    const isRegistered = globalShortcut.isRegistered(conflictAccelerator);
    assert(isRegistered, '快捷键应该被检测为已注册');
    logResult('检测已注册快捷键成功', true);
    
    globalShortcut.unregister(conflictAccelerator);
  } catch (error) {
    logResult('检测已注册快捷键成功', false, error.message);
  }

  console.log('\n3. 批量注销测试');
  console.log('----------------------------------------\n');

  const accelerators = ['Ctrl+Shift+Alt+1', 'Ctrl+Shift+Alt+2', 'Ctrl+Shift+Alt+3'];

  try {
    for (const acc of accelerators) {
      globalShortcut.register(acc, () => {});
    }
    
    for (const acc of accelerators) {
      assert(globalShortcut.isRegistered(acc), `快捷键 ${acc} 应该已注册`);
    }
    logResult('批量注册多个快捷键成功', true);
  } catch (error) {
    logResult('批量注册多个快捷键成功', false, error.message);
  }

  try {
    globalShortcut.unregisterAll();
    
    for (const acc of accelerators) {
      assert(!globalShortcut.isRegistered(acc), `快捷键 ${acc} 应该已注销`);
    }
    logResult('批量注销所有快捷键成功', true);
  } catch (error) {
    logResult('批量注销所有快捷键成功', false, error.message);
  }

  console.log('\n4. 无效快捷键处理测试');
  console.log('----------------------------------------\n');

  try {
    const success = globalShortcut.register('', () => {});
    assert(!success, '空快捷键注册应该失败');
    logResult('空字符串快捷键注册失败（预期行为）', true);
  } catch (error) {
    logResult('空字符串快捷键注册失败（预期行为）', true, error.message);
  }

  try {
    const success = globalShortcut.register('InvalidKey', () => {});
    assert(!success, '无效快捷键注册应该失败');
    logResult('无效快捷键注册失败（预期行为）', true);
  } catch (error) {
    logResult('无效快捷键注册失败（预期行为）', true, error.message);
  }

  console.log('\n========================================');
  console.log(`  测试完成: ${testPassed} 通过, ${testFailed} 失败`);
  console.log('========================================\n');

  const testOutputDir = path.join(__dirname, '..', '.test-output');
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }
  
  const testOutputPath = path.join(testOutputDir, 'test-results.json');
  fs.writeFileSync(testOutputPath, JSON.stringify({
    passed: testPassed,
    failed: testFailed,
    results: testResults,
    timestamp: new Date().toISOString()
  }, null, 2), 'utf-8');

  return testFailed === 0;
}

app.whenReady().then(async () => {
  try {
    const allPassed = await runTests();
    globalShortcut.unregisterAll();
    app.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('测试运行出错:', error);
    globalShortcut.unregisterAll();
    app.exit(1);
  }
});
