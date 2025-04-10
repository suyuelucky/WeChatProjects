/**
 * 数据管理框架性能测试
 * 
 * 创建时间: 2025年04月09日 10:55:36 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

// 导入被测试组件
var LocalStorageManager = require('../../sync/LocalStorageManager');
var ChangeTracker = require('../../sync/ChangeTracker');
var DiffGenerator = require('../../sync/DiffGenerator');

// 性能测试配置
var PERFORMANCE_CONFIG = {
  sampleSize: 50,           // 每次测试的重复次数
  largeDatasetSize: 1000,   // 大数据集大小
  dataSizes: [10, 100, 1000], // 测试不同数据量
  maxHeapUsage: 5 * 1024 * 1024 // 最大允许内存使用量（5MB）
};

// 模拟wx.setStorageSync和wx.getStorageSync
var mockStorage = {};
global.wx = {
  setStorageSync: function(key, data) {
    mockStorage[key] = data;
    return true;
  },
  getStorageSync: function(key) {
    return mockStorage[key];
  },
  removeStorageSync: function(key) {
    delete mockStorage[key];
    return true;
  },
  clearStorage: function() {
    mockStorage = {};
  }
};

// 在全局范围添加性能测量函数
global.performance = {
  now: function() {
    return Date.now();
  }
};

// 性能测试助手函数
function runPerformanceTest(testFn, iterations) {
  iterations = iterations || PERFORMANCE_CONFIG.sampleSize;
  var times = [];
  
  for (var i = 0; i < iterations; i++) {
    var startTime = performance.now();
    testFn();
    var endTime = performance.now();
    
    times.push(endTime - startTime);
  }
  
  // 计算平均和最大时间
  var sum = times.reduce(function(a, b) { return a + b; }, 0);
  var max = Math.max.apply(null, times);
  var min = Math.min.apply(null, times);
  var avg = sum / times.length;
  
  return {
    average: avg,
    max: max,
    min: min,
    samples: times.length,
    total: sum
  };
}

// 生成测试数据集
function generateTestData(size, depth, complexity) {
  var result = {};
  depth = depth || 3;
  complexity = complexity || 3;
  
  for (var i = 0; i < size; i++) {
    var id = 'item_' + i;
    result[id] = generateComplexObject(depth, complexity, i);
  }
  
  return result;
}

// 生成复杂对象
function generateComplexObject(depth, width, seed) {
  if (depth <= 0) {
    return "value_" + seed;
  }
  
  if (depth === 1) {
    return {
      id: "id_" + seed,
      name: "name_" + seed,
      value: seed,
      date: new Date(2025, 0, 1).getTime() + seed * 86400000
    };
  }
  
  var result = {
    id: "id_" + seed,
    name: "name_" + seed,
    timestamp: Date.now() + seed,
    metadata: {
      created: Date.now() - 86400000,
      status: seed % 2 === 0 ? "active" : "inactive",
      priority: seed % 3
    }
  };
  
  // 添加嵌套数组
  result.tags = [];
  for (var i = 0; i < width; i++) {
    result.tags.push("tag_" + (seed * 10 + i));
  }
  
  // 添加嵌套对象
  if (depth > 2) {
    result.children = {};
    for (var j = 0; j < width; j++) {
      result.children["child_" + j] = generateComplexObject(depth - 1, width - 1, seed * 100 + j);
    }
  }
  
  return result;
}

// 生成修改后的数据（约30%的内容变化）
function generateModifiedData(original) {
  var result = JSON.parse(JSON.stringify(original)); // 深拷贝
  
  // 修改约30%的条目
  var keys = Object.keys(result);
  var changeCount = Math.floor(keys.length * 0.3);
  
  for (var i = 0; i < changeCount; i++) {
    var idx = Math.floor(Math.random() * keys.length);
    var key = keys[idx];
    
    // 修改对象的不同部分
    var item = result[key];
    if (typeof item === 'object') {
      // 随机修改一些属性
      if (item.name) item.name = item.name + "_modified";
      if (item.timestamp) item.timestamp = Date.now();
      if (item.metadata) item.metadata.status = "updated";
      if (item.tags && item.tags.length) {
        item.tags.push("new_tag");
        if (item.tags.length > 2) {
          item.tags.splice(1, 1); // 删除一个标签
        }
      }
    }
  }
  
  // 添加一些新条目
  var addCount = Math.floor(keys.length * 0.1);
  for (var j = 0; j < addCount; j++) {
    var newId = 'new_item_' + j;
    result[newId] = generateComplexObject(3, 3, j + 1000);
  }
  
  // 删除一些条目
  var removeCount = Math.floor(keys.length * 0.1);
  for (var k = 0; k < removeCount; k++) {
    var removeIdx = Math.floor(Math.random() * keys.length);
    var removeKey = keys[removeIdx];
    delete result[removeKey];
    keys.splice(removeIdx, 1);
  }
  
  return result;
}

describe('数据管理框架性能测试', function() {
  var storageManager, changeTracker, diffGenerator;
  var testData, modifiedData;
  
  beforeEach(function() {
    // 重置存储
    mockStorage = {};
    
    // 初始化组件
    storageManager = new LocalStorageManager({
      prefix: 'perf_test_'
    });
    
    diffGenerator = new DiffGenerator({
      detectArrayMove: true,
      includeStats: true
    });
    
    changeTracker = new ChangeTracker({
      namespace: 'perf_test_changes',
      storageManager: storageManager,
      diffGenerator: diffGenerator
    });
    
    // 生成测试数据
    testData = generateTestData(100, 3, 3);
    modifiedData = generateModifiedData(testData);
  });
  
  test('读取单个数据项的响应时间应小于10ms', function() {
    // 准备：存储一个数据项
    var testItemKey = 'test_item';
    var testItemValue = generateComplexObject(4, 4, 42); // 相当复杂的测试对象
    storageManager.set(testItemKey, testItemValue);
    
    // 测试：读取性能
    var readPerformance = runPerformanceTest(function() {
      storageManager.get(testItemKey);
    });
    
    console.log('单数据读取性能:', readPerformance);
    expect(readPerformance.average).toBeLessThan(10); // 小于10毫秒
    expect(readPerformance.max).toBeLessThan(20); // 最大值也要合理
  });
  
  test('写入单个数据项的响应时间应小于10ms', function() {
    // 测试：写入性能
    var testItemKey = 'test_item';
    var testItemValue = generateComplexObject(4, 4, 42);
    
    var writePerformance = runPerformanceTest(function() {
      storageManager.set(testItemKey, testItemValue);
    });
    
    console.log('单数据写入性能:', writePerformance);
    expect(writePerformance.average).toBeLessThan(10); // 小于10毫秒
    expect(writePerformance.max).toBeLessThan(20); // 最大值也要合理
  });
  
  test('批量操作(1000条)响应时间应小于100ms', function() {
    // 生成1000条测试数据
    var largeDataset = generateTestData(PERFORMANCE_CONFIG.largeDatasetSize, 2, 2);
    
    // 测试：批量写入性能
    var writeBatchPerformance = runPerformanceTest(function() {
      storageManager.setBatch('items', largeDataset);
    });
    
    console.log('批量写入性能(1000条):', writeBatchPerformance);
    expect(writeBatchPerformance.average).toBeLessThan(100); // 小于100毫秒
    
    // 测试：批量读取性能
    var readBatchPerformance = runPerformanceTest(function() {
      storageManager.getBatch('items', Object.keys(largeDataset));
    });
    
    console.log('批量读取性能(1000条):', readBatchPerformance);
    expect(readBatchPerformance.average).toBeLessThan(100); // 小于100毫秒
  });
  
  test('差异计算性能应比全量传输提升至少70%', function() {
    // 生成差异计算测试数据
    PERFORMANCE_CONFIG.dataSizes.forEach(function(size) {
      var originalData = generateTestData(size, 3, 3);
      var changedData = generateModifiedData(originalData);
      
      // 计算全量传输大小
      var fullSize = JSON.stringify(changedData).length;
      
      // 测量差异计算性能
      var diffPerformance = runPerformanceTest(function() {
        diffGenerator.generateDiff(originalData, changedData);
      });
      
      // 计算差异大小
      var diff = diffGenerator.generateDiff(originalData, changedData);
      var diffSize = JSON.stringify(diff).length;
      
      // 计算大小减少比例
      var sizeReduction = (fullSize - diffSize) / fullSize * 100;
      
      console.log('数据大小 ' + size + ' 项:');
      console.log('- 全量大小: ' + fullSize + ' 字节');
      console.log('- 差异大小: ' + diffSize + ' 字节');
      console.log('- 大小减少: ' + sizeReduction.toFixed(2) + '%');
      console.log('- 差异计算时间: ' + diffPerformance.average.toFixed(2) + 'ms');
      
      expect(sizeReduction).toBeGreaterThanOrEqual(70);
    });
  });
  
  test('内存占用峰值应小于5MB', function() {
    // 注意：这个测试是模拟的，在实际环境中需要更复杂的内存测量方法
    // 模拟大批量操作
    var largeDataset = generateTestData(PERFORMANCE_CONFIG.largeDatasetSize, 3, 3);
    
    // 跟踪内存使用
    var memoryUsed = 0;
    
    // 批量操作前先记录当前存储大小
    var baselineSize = JSON.stringify(mockStorage).length;
    
    // 执行批量操作
    storageManager.setBatch('memory_test', largeDataset);
    
    // 记录所有数据变更
    Object.keys(largeDataset).forEach(function(id) {
      changeTracker.trackChange('memory_test', id, largeDataset[id], null, 'create');
    });
    
    // 计算存储增长
    var finalSize = JSON.stringify(mockStorage).length;
    memoryUsed = finalSize - baselineSize;
    
    console.log('内存占用估计: ' + (memoryUsed / 1024 / 1024).toFixed(2) + 'MB');
    expect(memoryUsed).toBeLessThan(PERFORMANCE_CONFIG.maxHeapUsage);
  });
}); 