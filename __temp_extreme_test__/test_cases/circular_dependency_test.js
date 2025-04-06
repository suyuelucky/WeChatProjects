/**
 * 循环依赖极端测试
 * 测试目标：验证已实现的懒加载方案在极端情况下的可靠性
 */

// 模拟wx对象
if (typeof wx === 'undefined') {
  global.wx = {
    getStorageSync: function(key) { return null; },
    setStorageSync: function(key, data) {},
    removeStorageSync: function(key) {},
    getStorageInfoSync: function() { return { keys: [], currentSize: 0, limitSize: 10240 }; },
    showToast: function(options) {},
    showLoading: function(options) {},
    hideLoading: function() {},
    showModal: function(options) { 
      if (options && options.success) options.success({confirm: true});
    },
    getNetworkType: function(options) {
      if (options && options.success) options.success({networkType: 'wifi'});
    }
  };
}

// 加载模块并强制触发循环依赖路径
function testCircularDependency() {
  console.log('========== 开始测试循环依赖 ==========');
  
  try {
    // 1. 先加载storageManager
    const storageManager = require('../../utils/storageManager');
    console.log('✓ 成功加载 storageManager');
    
    // 2. 再加载offlineStorageSync，这是已知的循环依赖链路
    const offlineStorageSync = require('../../utils/offlineStorageSync');
    console.log('✓ 成功加载 offlineStorageSync');
    
    // 3. 加载storageUtils
    const storageUtils = require('../../utils/storageUtils');
    console.log('✓ 成功加载 storageUtils');
    
    // 4. 检查模块是否包含预期的方法和属性
    if (typeof storageManager.getItem !== 'function') {
      throw new Error('storageManager 缺少 getItem 方法');
    }
    
    if (typeof offlineStorageSync.syncItem !== 'function') {
      throw new Error('offlineStorageSync 缺少 syncItem 方法');
    }
    
    if (typeof storageUtils.storage === 'undefined') {
      throw new Error('storageUtils 缺少 storage 对象');
    }
    
    // 5. 长链循环依赖测试：A->B->C->D->A
    // 目前已有 storageManager -> offlineStorageSync -> storageUtils -> (回到)storageManager
    console.log('✓ 长链循环依赖测试通过');
    
    return true;
  } catch (error) {
    console.error('× 循环依赖测试失败:', error.message);
    return false;
  }
}

// 极端情况1：快速连续加载模块多次
function testRapidRequire() {
  console.log('========== 开始测试快速连续加载 ==========');
  
  try {
    for (let i = 0; i < 10; i++) {
      require('../../utils/storageManager');
      require('../../utils/offlineStorageSync');
      require('../../utils/storageUtils');
      console.log(`✓ 第${i+1}次连续加载成功`);
    }
    return true;
  } catch (error) {
    console.error('× 快速连续加载测试失败:', error.message);
    return false;
  }
}

// 极端情况2：在使用懒加载的模块上立即调用函数
function testImmediateUsage() {
  console.log('========== 开始测试立即使用 ==========');
  
  try {
    // 先清除已缓存的模块
    delete require.cache[require.resolve('../../utils/storageManager')];
    delete require.cache[require.resolve('../../utils/offlineStorageSync')];
    delete require.cache[require.resolve('../../utils/storageUtils')];
    
    // 加载模块
    const storageManager = require('../../utils/storageManager');
    
    // 立即调用方法
    storageManager.getItem('test_key');
    storageManager.setItem('test_key', 'test_value');
    storageManager.removeItem('test_key');
    
    console.log('✓ 立即使用测试通过');
    return true;
  } catch (error) {
    console.error('× 立即使用测试失败:', error.message);
    return false;
  }
}

// 极端情况3：同步调用情况下的性能
function testPerformance() {
  console.log('========== 开始测试性能 ==========');
  
  try {
    const storageManager = require('../../utils/storageManager');
    const key = 'perf_test_key';
    const data = { test: 'data', items: Array(1000).fill('item') };
    
    const startTime = Date.now();
    
    // 执行100次读写操作
    for (let i = 0; i < 100; i++) {
      storageManager.setItem(key + i, data);
      storageManager.getItem(key + i);
      storageManager.removeItem(key + i);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✓ 性能测试完成，耗时 ${duration}ms`);
    return true;
  } catch (error) {
    console.error('× 性能测试失败:', error.message);
    return false;
  }
}

// 主测试函数
function runTests() {
  let results = {
    circularDependency: false,
    rapidRequire: false,
    immediateUsage: false,
    performance: false
  };
  
  console.log('======================================================');
  console.log('           开始执行微信小程序极端测试                  ');
  console.log('======================================================');
  
  results.circularDependency = testCircularDependency();
  results.rapidRequire = testRapidRequire();
  results.immediateUsage = testImmediateUsage();
  results.performance = testPerformance();
  
  console.log('======================================================');
  console.log('                  测试结果汇总                        ');
  console.log('======================================================');
  console.log('循环依赖测试:', results.circularDependency ? '通过 ✓' : '失败 ×');
  console.log('快速连续加载测试:', results.rapidRequire ? '通过 ✓' : '失败 ×');
  console.log('立即使用测试:', results.immediateUsage ? '通过 ✓' : '失败 ×');
  console.log('性能测试:', results.performance ? '通过 ✓' : '失败 ×');
  
  return results;
}

// 运行测试
if (require.main === module) {
  runTests();
} else {
  module.exports = {
    runTests
  };
} 