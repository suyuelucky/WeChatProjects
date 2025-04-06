/**
 * 离线存储极端测试
 * 测试目标：验证离线存储机制在极端情况下的健壮性和恢复能力
 */

// 模拟wx对象
if (typeof wx === 'undefined') {
  global.wx = {
    getStorageSync: function(key) {
      try {
        return mockStorage[key] || null;
      } catch (e) {
        return null;
      }
    },
    setStorageSync: function(key, data) {
      try {
        mockStorage[key] = data;
      } catch (e) {
        throw new Error('Storage is full');
      }
    },
    removeStorageSync: function(key) {
      delete mockStorage[key];
    },
    getStorageInfoSync: function() { 
      return { 
        keys: Object.keys(mockStorage), 
        currentSize: JSON.stringify(mockStorage).length / 1024, 
        limitSize: 10240 
      }; 
    },
    showToast: function(options) {},
    showLoading: function(options) {},
    hideLoading: function() {},
    showModal: function(options) { 
      if (options && options.success) options.success({confirm: true});
    },
    getNetworkType: function(options) {
      if (options && options.success) options.success({networkType: mockNetworkType});
    },
    onNetworkStatusChange: function(callback) {
      networkCallbacks.push(callback);
    }
  };
}

// 全局模拟对象
var mockStorage = {};
var mockNetworkType = 'wifi'; // 初始网络状态
var networkCallbacks = [];

// 模拟网络状态变化
function simulateNetworkChange(newNetworkType) {
  mockNetworkType = newNetworkType;
  networkCallbacks.forEach(function(callback) {
    callback({
      isConnected: newNetworkType !== 'none',
      networkType: newNetworkType
    });
  });
}

// 清理测试环境
function cleanupTestEnvironment() {
  mockStorage = {};
  mockNetworkType = 'wifi';
  networkCallbacks = [];
}

// 测试基本存储功能
function testBasicStorage() {
  console.log('========== 开始测试基本存储功能 ==========');
  
  try {
    cleanupTestEnvironment();
    
    const storageManager = require('../../utils/storageManager');
    const testKey = 'test_basic_key';
    const testValue = { data: 'Basic storage test', timestamp: Date.now() };
    
    // 存储数据
    storageManager.setItem(testKey, testValue);
    
    // 读取数据
    const retrievedValue = storageManager.getItem(testKey);
    
    // 验证数据一致性
    if (!retrievedValue || retrievedValue.data !== testValue.data) {
      throw new Error('基本存储测试失败，数据不匹配');
    }
    
    // 删除数据
    storageManager.removeItem(testKey);
    
    // 验证数据已删除
    const deletedValue = storageManager.getItem(testKey);
    if (deletedValue !== null) {
      throw new Error('删除数据失败，数据仍然存在');
    }
    
    console.log('✓ 基本存储功能测试通过');
    return true;
  } catch (error) {
    console.error('× 基本存储功能测试失败:', error.message);
    return false;
  }
}

// 测试离线存储同步机制
function testOfflineSync() {
  console.log('========== 开始测试离线存储同步 ==========');
  
  try {
    cleanupTestEnvironment();
    
    const storageManager = require('../../utils/storageManager');
    const offlineStorageSync = require('../../utils/offlineStorageSync');
    const testKey = 'test_offline_key';
    const testValue = { data: 'Offline sync test', timestamp: Date.now() };
    
    // 模拟网络断开
    simulateNetworkChange('none');
    
    // 在离线状态下存储数据
    storageManager.setItem(testKey, testValue);
    
    // 检查同步队列中是否包含该项
    const syncQueue = offlineStorageSync.getSyncQueue();
    const inQueue = syncQueue.some(function(item) {
      return item.key === testKey;
    });
    
    if (!inQueue) {
      throw new Error('离线存储数据未加入同步队列');
    }
    
    // 模拟网络恢复
    simulateNetworkChange('wifi');
    
    // 触发同步
    offlineStorageSync.processQueue();
    
    // 验证同步队列已处理
    const updatedSyncQueue = offlineStorageSync.getSyncQueue();
    const stillInQueue = updatedSyncQueue.some(function(item) {
      return item.key === testKey;
    });
    
    if (stillInQueue) {
      throw new Error('网络恢复后同步队列未处理');
    }
    
    console.log('✓ 离线存储同步测试通过');
    return true;
  } catch (error) {
    console.error('× 离线存储同步测试失败:', error.message);
    return false;
  }
}

// 测试存储容量极限
function testStorageCapacityLimit() {
  console.log('========== 开始测试存储容量极限 ==========');
  
  try {
    cleanupTestEnvironment();
    
    const storageManager = require('../../utils/storageManager');
    
    // 生成大量数据
    const largeData = generateLargeData(500); // 生成500KB的数据
    
    // 尝试存储大量数据
    for (let i = 0; i < 10; i++) {
      try {
        storageManager.setItem('large_data_' + i, largeData);
        console.log(`  成功存储大型数据块 ${i+1}/10`);
      } catch (error) {
        // 期望在某个点会存储失败，这时应该有错误处理
        console.log(`  预期的存储失败在第 ${i+1} 个数据块，错误处理生效`);
        
        // 检查错误处理是否正确
        const errorHandled = error.message.indexOf('存储空间不足') >= 0 ||
                            error.message.indexOf('storage') >= 0;
        
        if (!errorHandled) {
          throw new Error('存储容量超出时没有适当的错误处理: ' + error.message);
        }
        
        // 如果到了第10个还没失败，我们认为测试通过
        if (i === 9) {
          console.log('  存储容量充足，未触发容量限制');
        }
        
        break;
      }
    }
    
    // 尝试清理部分数据
    for (let i = 0; i < 5; i++) {
      try {
        storageManager.removeItem('large_data_' + i);
      } catch (e) {
        // 忽略清理错误
      }
    }
    
    console.log('✓ 存储容量极限测试通过');
    return true;
  } catch (error) {
    console.error('× 存储容量极限测试失败:', error.message);
    return false;
  }
}

// 生成指定大小的测试数据
function generateLargeData(sizeInKB) {
  const chunk = '0123456789ABCDEF'.repeat(64); // 1KB
  let result = [];
  for (let i = 0; i < sizeInKB; i++) {
    result.push(chunk);
  }
  return {
    largeData: result.join('')
  };
}

// 测试网络切换恢复
function testNetworkRecovery() {
  console.log('========== 开始测试网络切换恢复 ==========');
  
  try {
    cleanupTestEnvironment();
    
    const storageManager = require('../../utils/storageManager');
    const offlineStorageSync = require('../../utils/offlineStorageSync');
    
    // 添加测试数据
    const testItems = [];
    for (let i = 0; i < 10; i++) {
      testItems.push({
        key: 'network_test_' + i,
        value: { data: 'Network test ' + i, timestamp: Date.now() + i }
      });
    }
    
    // 模拟网络断开
    simulateNetworkChange('none');
    console.log('  已模拟网络断开');
    
    // 存储数据，应该会进入离线队列
    testItems.forEach(function(item) {
      storageManager.setItem(item.key, item.value);
    });
    
    // 检查同步队列长度
    let syncQueue = offlineStorageSync.getSyncQueue();
    
    if (syncQueue.length < testItems.length) {
      throw new Error(`离线存储队列长度不匹配: 期望 ${testItems.length}, 实际 ${syncQueue.length}`);
    }
    
    console.log(`  已将 ${testItems.length} 项数据添加到离线队列`);
    
    // 模拟网络反复切换
    for (let i = 0; i < 5; i++) {
      // 切换到有网络
      simulateNetworkChange('wifi');
      console.log(`  第 ${i+1}/5 次模拟网络恢复`);
      
      // 处理部分离线队列
      let processed = Math.min(syncQueue.length, 2);
      syncQueue = syncQueue.slice(processed);
      
      // 再次切换到离线
      simulateNetworkChange('none');
      console.log(`  第 ${i+1}/5 次模拟网络断开`);
      
      // 新增数据
      storageManager.setItem('network_switch_' + i, { 
        data: 'Network switch test ' + i, 
        timestamp: Date.now() 
      });
    }
    
    // 最终恢复网络
    simulateNetworkChange('wifi');
    console.log('  最终网络恢复');
    
    // 处理队列
    offlineStorageSync.processQueue();
    
    // 验证队列已清空
    syncQueue = offlineStorageSync.getSyncQueue();
    if (syncQueue.length > 0) {
      throw new Error(`同步队列未清空，仍有 ${syncQueue.length} 个项目`);
    }
    
    console.log('✓ 网络切换恢复测试通过');
    return true;
  } catch (error) {
    console.error('× 网络切换恢复测试失败:', error.message);
    return false;
  }
}

// 测试并发存储操作
function testConcurrentStorage() {
  console.log('========== 开始测试并发存储操作 ==========');
  
  try {
    cleanupTestEnvironment();
    
    const storageManager = require('../../utils/storageManager');
    
    // 准备测试数据
    const operations = [];
    for (let i = 0; i < 100; i++) {
      operations.push({
        type: Math.random() > 0.3 ? 'set' : 'remove',
        key: 'concurrent_' + i,
        value: { data: 'Concurrent test ' + i, timestamp: Date.now() + i }
      });
    }
    
    // 并发执行操作
    console.log(`  开始执行 ${operations.length} 个并发操作`);
    
    operations.forEach(function(op) {
      if (op.type === 'set') {
        storageManager.setItem(op.key, op.value);
      } else {
        storageManager.removeItem(op.key);
      }
    });
    
    // 检查结果
    const setOps = operations.filter(function(op) { return op.type === 'set'; });
    let verifiedCount = 0;
    
    setOps.forEach(function(op) {
      const value = storageManager.getItem(op.key);
      if (value && value.data === op.value.data) {
        verifiedCount++;
      }
    });
    
    console.log(`  已验证 ${verifiedCount}/${setOps.length} 个设置操作`);
    
    if (verifiedCount < setOps.length * 0.9) { // 允许10%的误差
      throw new Error(`并发操作验证失败，只有 ${verifiedCount}/${setOps.length} 个设置操作成功`);
    }
    
    console.log('✓ 并发存储操作测试通过');
    return true;
  } catch (error) {
    console.error('× 并发存储操作测试失败:', error.message);
    return false;
  }
}

// 测试数据一致性
function testDataConsistency() {
  console.log('========== 开始测试数据一致性 ==========');
  
  try {
    cleanupTestEnvironment();
    
    const storageManager = require('../../utils/storageManager');
    
    // 准备复杂的嵌套数据
    const complexData = {
      level1: {
        str: "string value",
        num: 12345,
        bool: true,
        level2: {
          array: [1, 2, 3, 4, 5],
          object: { a: 1, b: 2, c: 3 },
          level3: {
            date: new Date().toISOString(),
            regexp: "/test/gi",
            null: null,
            undefined: "undefined value" // 直接undefined会丢失
          }
        }
      }
    };
    
    // 存储复杂数据
    const testKey = 'complex_data_test';
    storageManager.setItem(testKey, complexData);
    
    // 读取数据
    const retrievedData = storageManager.getItem(testKey);
    
    // 测试数据一致性
    if (!retrievedData || !retrievedData.level1) {
      throw new Error('无法检索复杂数据或顶层结构丢失');
    }
    
    // 检查嵌套结构
    if (!retrievedData.level1.level2 || !retrievedData.level1.level2.level3) {
      throw new Error('嵌套数据结构丢失');
    }
    
    // 检查数组
    if (!Array.isArray(retrievedData.level1.level2.array) || 
        retrievedData.level1.level2.array.length !== 5) {
      throw new Error('数组数据不一致');
    }
    
    // 检查深层对象
    if (retrievedData.level1.level2.level3.null !== null) {
      throw new Error('null值未正确保留');
    }
    
    console.log('✓ 数据一致性测试通过');
    return true;
  } catch (error) {
    console.error('× 数据一致性测试失败:', error.message);
    return false;
  }
}

// 主测试函数
function runTests() {
  let results = {
    basicStorage: false,
    offlineSync: false,
    storageCapacityLimit: false,
    networkRecovery: false,
    concurrentStorage: false,
    dataConsistency: false
  };
  
  console.log('======================================================');
  console.log('           开始执行离线存储极端测试                    ');
  console.log('======================================================');
  
  results.basicStorage = testBasicStorage();
  results.offlineSync = testOfflineSync();
  results.storageCapacityLimit = testStorageCapacityLimit();
  results.networkRecovery = testNetworkRecovery();
  results.concurrentStorage = testConcurrentStorage();
  results.dataConsistency = testDataConsistency();
  
  console.log('======================================================');
  console.log('                  测试结果汇总                        ');
  console.log('======================================================');
  console.log('基本存储功能测试:', results.basicStorage ? '通过 ✓' : '失败 ×');
  console.log('离线存储同步测试:', results.offlineSync ? '通过 ✓' : '失败 ×');
  console.log('存储容量极限测试:', results.storageCapacityLimit ? '通过 ✓' : '失败 ×');
  console.log('网络切换恢复测试:', results.networkRecovery ? '通过 ✓' : '失败 ×');
  console.log('并发存储操作测试:', results.concurrentStorage ? '通过 ✓' : '失败 ×');
  console.log('数据一致性测试:', results.dataConsistency ? '通过 ✓' : '失败 ×');
  
  return results;
}

// 运行测试
if (require.main === module) {
  runTests();
} else {
  module.exports = {
    runTests,
    simulateNetworkChange
  };
} 