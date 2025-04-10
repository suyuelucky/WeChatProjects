/**
 * EncryptionManager测试运行脚本
 * 
 * 创建时间: 2025-04-09 12:22:13 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试脚本
 */

// 设置测试环境
global.wx = require('../../mocks/wx.mock');
global.console = {
  log: function(message) {
    process.stdout.write(message + '\n');
  },
  error: function(message) {
    process.stderr.write('ERROR: ' + message + '\n');
  },
  info: function(message) {
    process.stdout.write('INFO: ' + message + '\n');
  },
  warn: function(message) {
    process.stdout.write('WARN: ' + message + '\n');
  }
};

// 测试结果统计
var testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  startTime: Date.now()
};

// 测试辅助函数
global.describe = function(suiteName, testFn) {
  console.log('\n========================================');
  console.log('测试套件: ' + suiteName);
  console.log('========================================');
  
  try {
    testFn();
  } catch (error) {
    console.error('测试套件执行失败: ' + error.message);
    console.error(error.stack);
  }
};

global.test = function(testName, testFn) {
  testStats.total++;
  
  try {
    console.log('\n> 执行测试: ' + testName);
    testFn();
    console.log('✓ 测试通过: ' + testName);
    testStats.passed++;
  } catch (error) {
    console.error('✗ 测试失败: ' + testName);
    console.error('  原因: ' + error.message);
    console.error('  位置: ' + error.stack.split('\n')[1].trim());
    testStats.failed++;
  }
};

// 模拟assert
global.assert = require('../../mocks/assert.mock');

// 运行测试
console.log('开始运行EncryptionManager测试套件...');
console.log('时间: ' + new Date().toLocaleString());
console.log('-------------------------------------------');

// 按顺序运行各测试模块
try {
  require('./encryptionBasic.test.js');
  require('./keyManagement.test.js');
  require('./keyRotation.test.js');
  require('./secureStorage.test.js');
  require('./dataIntegrity.test.js');
} catch (error) {
  console.error('测试加载失败: ' + error.message);
  console.error(error.stack);
}

// 输出测试结果
var duration = (Date.now() - testStats.startTime) / 1000;
console.log('\n========================================');
console.log('测试完成! 结果统计:');
console.log('----------------------------------------');
console.log('总测试数: ' + testStats.total);
console.log('通过: ' + testStats.passed + ' (' + Math.round(testStats.passed / testStats.total * 100) + '%)');
console.log('失败: ' + testStats.failed);
console.log('跳过: ' + testStats.skipped);
console.log('执行时间: ' + duration.toFixed(2) + '秒');
console.log('========================================');

// 如果有测试失败，返回非零退出码
if (testStats.failed > 0) {
  process.exit(1);
} 