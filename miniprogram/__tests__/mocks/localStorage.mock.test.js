/**
 * localStorage模拟实现的性能测试
 * 
 * 创建时间: 2025年04月09日
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

// 导入被测试的模块
const LocalStorageMock = require('./localStorage.mock');

// 性能测试配置
const PERFORMANCE_CONFIG = {
  sampleSize: 50,          // 每次测试的重复次数
  smallItems: 100,         // 小数据项数量
  largeItems: 10,          // 大数据项数量
  largeItemSize: 100 * 1024, // 大数据项大小(100KB)
  timeLimits: {
    setSmall: 1,           // 设置小项目时间限制(ms)
    getSmall: 0.5,         // 获取小项目时间限制(ms)
    setLarge: 5,           // 设置大项目时间限制(ms)
    getLarge: 3,           // 获取大项目时间限制(ms)
    batchSet: 10,          // 批量设置时间限制(ms)
    batchGet: 8,           // 批量获取时间限制(ms)
    clear: 5               // 清空存储时间限制(ms)
  }
};

// 性能测试辅助函数
function runPerformanceTest(testFn, iterations) {
  iterations = iterations || PERFORMANCE_CONFIG.sampleSize;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    testFn();
    const endTime = performance.now();
    
    times.push(endTime - startTime);
  }
  
  // 计算统计数据
  const sum = times.reduce((a, b) => a + b, 0);
  const max = Math.max(...times);
  const min = Math.min(...times);
  const avg = sum / times.length;
  
  return {
    average: avg,
    max: max,
    min: min,
    samples: times.length,
    total: sum
  };
}

// 生成指定大小的测试数据
function generateLargeString(sizeInBytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < sizeInBytes; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 添加全局performance对象（如果在测试环境中不存在）
if (typeof performance === 'undefined') {
  global.performance = {
    now: function() {
      return Date.now();
    }
  };
}

describe('LocalStorageMock 性能测试', () => {
  let storage;
  
  beforeEach(() => {
    // 创建新的存储实例
    storage = new LocalStorageMock();
  });
  
  test('单个小数据项设置性能', () => {
    const testKey = 'test_small_item';
    const testValue = 'simple test value';
    
    const performance = runPerformanceTest(() => {
      storage.setItem(testKey, testValue);
    });
    
    console.log('单个小数据项设置性能:', performance);
    expect(performance.average).toBeLessThan(PERFORMANCE_CONFIG.timeLimits.setSmall);
  });
  
  test('单个小数据项获取性能', () => {
    const testKey = 'test_small_item';
    const testValue = 'simple test value';
    storage.setItem(testKey, testValue);
    
    const performance = runPerformanceTest(() => {
      storage.getItem(testKey);
    });
    
    console.log('单个小数据项获取性能:', performance);
    expect(performance.average).toBeLessThan(PERFORMANCE_CONFIG.timeLimits.getSmall);
  });
  
  test('单个大数据项设置性能', () => {
    const testKey = 'test_large_item';
    const testValue = generateLargeString(PERFORMANCE_CONFIG.largeItemSize);
    
    const performance = runPerformanceTest(() => {
      storage.setItem(testKey, testValue);
    });
    
    console.log('单个大数据项设置性能:', performance);
    expect(performance.average).toBeLessThan(PERFORMANCE_CONFIG.timeLimits.setLarge);
  });
  
  test('单个大数据项获取性能', () => {
    const testKey = 'test_large_item';
    const testValue = generateLargeString(PERFORMANCE_CONFIG.largeItemSize);
    storage.setItem(testKey, testValue);
    
    const performance = runPerformanceTest(() => {
      storage.getItem(testKey);
    });
    
    console.log('单个大数据项获取性能:', performance);
    expect(performance.average).toBeLessThan(PERFORMANCE_CONFIG.timeLimits.getLarge);
  });
  
  test('批量操作性能', () => {
    // 创建测试数据
    const items = {};
    const keys = [];
    
    for (let i = 0; i < PERFORMANCE_CONFIG.smallItems; i++) {
      const key = `batch_key_${i}`;
      items[key] = `value_${i}`;
      keys.push(key);
    }
    
    // 测试批量设置性能
    const setBatchPerformance = runPerformanceTest(() => {
      Object.keys(items).forEach(key => {
        storage.setItem(key, items[key]);
      });
    });
    
    console.log('批量设置性能:', setBatchPerformance);
    expect(setBatchPerformance.average).toBeLessThan(PERFORMANCE_CONFIG.timeLimits.batchSet);
    
    // 测试批量获取性能
    const getBatchPerformance = runPerformanceTest(() => {
      keys.forEach(key => {
        storage.getItem(key);
      });
    });
    
    console.log('批量获取性能:', getBatchPerformance);
    expect(getBatchPerformance.average).toBeLessThan(PERFORMANCE_CONFIG.timeLimits.batchGet);
  });
  
  test('清空存储性能', () => {
    // 先填充数据
    for (let i = 0; i < PERFORMANCE_CONFIG.smallItems; i++) {
      storage.setItem(`clear_test_key_${i}`, `value_${i}`);
    }
    
    // 测试清空性能
    const clearPerformance = runPerformanceTest(() => {
      storage.clear();
    });
    
    console.log('清空存储性能:', clearPerformance);
    expect(clearPerformance.average).toBeLessThan(PERFORMANCE_CONFIG.timeLimits.clear);
  });
  
  test('键遍历性能', () => {
    // 先填充数据
    for (let i = 0; i < PERFORMANCE_CONFIG.smallItems; i++) {
      storage.setItem(`key_${i}`, `value_${i}`);
    }
    
    // 测试键遍历性能
    const keyPerformance = runPerformanceTest(() => {
      for (let i = 0; i < storage.length; i++) {
        storage.key(i);
      }
    });
    
    console.log('键遍历性能:', keyPerformance);
    expect(keyPerformance.average).toBeLessThan(PERFORMANCE_CONFIG.timeLimits.batchGet);
  });
}); 