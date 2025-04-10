/**
 * localStorage真实实现与模拟实现性能比较测试
 * 
 * 创建时间: 2025年04月09日
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

const { LocalStorageMock } = require('./localStorage.mock');

// 性能测试配置
const config = {
  sampleSize: 30,         // 每个测试重复次数
  smallItems: 50,         // 小数据数量
  largeItems: 5,          // 大数据数量
  largeItemSize: 50 * 1024, // 大数据大小（字节）
};

// 性能测试工具函数
function runPerformanceTest(testFn, iterations = 1) {
  const times = [];
  let totalTime = 0;
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    testFn();
    const endTime = performance.now();
    const elapsedTime = endTime - startTime;
    times.push(elapsedTime);
    totalTime += elapsedTime;
  }

  const avgTime = totalTime / iterations;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);

  return {
    avg: avgTime,
    max: maxTime,
    min: minTime,
    total: totalTime
  };
}

// 生成大字符串
function generateLargeString(sizeInBytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < sizeInBytes; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 清理真实localStorage
function clearRealLocalStorage() {
  localStorage.clear();
}

// 测试套件
describe('LocalStorageMock 与真实 localStorage 性能比较', () => {
  let mockStorage;
  let realStorageAvailable = false;

  beforeAll(() => {
    mockStorage = new LocalStorageMock();
    
    // 检查环境中是否有真实的localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        realStorageAvailable = true;
        clearRealLocalStorage();
      }
    } catch (e) {
      console.warn('真实localStorage不可用，只测试模拟实现');
    }
  });

  beforeEach(() => {
    mockStorage.clear();
    if (realStorageAvailable) {
      clearRealLocalStorage();
    }
  });

  // 测试设置小数据项
  test('设置单个小数据项', () => {
    const mockResults = runPerformanceTest(() => {
      mockStorage.setItem('test-key', 'test-value');
    }, config.sampleSize);

    console.log('模拟实现 - 设置小数据性能:', mockResults);
    
    if (realStorageAvailable) {
      const realResults = runPerformanceTest(() => {
        localStorage.setItem('test-key', 'test-value');
      }, config.sampleSize);
      
      console.log('真实实现 - 设置小数据性能:', realResults);
      console.log(`性能比较 - 设置小数据: 模拟实现与真实实现的比值: ${mockResults.avg / realResults.avg}`);
    }
  });

  // 测试获取小数据项
  test('获取单个小数据项', () => {
    mockStorage.setItem('test-key', 'test-value');
    if (realStorageAvailable) {
      localStorage.setItem('test-key', 'test-value');
    }

    const mockResults = runPerformanceTest(() => {
      mockStorage.getItem('test-key');
    }, config.sampleSize);

    console.log('模拟实现 - 获取小数据性能:', mockResults);
    
    if (realStorageAvailable) {
      const realResults = runPerformanceTest(() => {
        localStorage.getItem('test-key');
      }, config.sampleSize);
      
      console.log('真实实现 - 获取小数据性能:', realResults);
      console.log(`性能比较 - 获取小数据: 模拟实现与真实实现的比值: ${mockResults.avg / realResults.avg}`);
    }
  });

  // 测试设置大数据项
  test('设置单个大数据项', () => {
    const largeData = generateLargeString(config.largeItemSize);
    
    const mockResults = runPerformanceTest(() => {
      mockStorage.setItem('large-key', largeData);
    }, config.sampleSize);

    console.log('模拟实现 - 设置大数据性能:', mockResults);
    
    if (realStorageAvailable) {
      const realResults = runPerformanceTest(() => {
        localStorage.setItem('large-key', largeData);
      }, config.sampleSize);
      
      console.log('真实实现 - 设置大数据性能:', realResults);
      console.log(`性能比较 - 设置大数据: 模拟实现与真实实现的比值: ${mockResults.avg / realResults.avg}`);
    }
  });

  // 测试批量操作
  test('批量设置多个小数据项', () => {
    const mockResults = runPerformanceTest(() => {
      for (let i = 0; i < config.smallItems; i++) {
        mockStorage.setItem(`key-${i}`, `value-${i}`);
      }
    }, config.sampleSize);

    console.log('模拟实现 - 批量设置小数据性能:', mockResults);
    
    if (realStorageAvailable) {
      const realResults = runPerformanceTest(() => {
        for (let i = 0; i < config.smallItems; i++) {
          localStorage.setItem(`key-${i}`, `value-${i}`);
        }
      }, config.sampleSize);
      
      console.log('真实实现 - 批量设置小数据性能:', realResults);
      console.log(`性能比较 - 批量设置小数据: 模拟实现与真实实现的比值: ${mockResults.avg / realResults.avg}`);
    }
  });

  // 测试清除存储
  test('清除存储', () => {
    // 先填充数据
    for (let i = 0; i < config.smallItems; i++) {
      mockStorage.setItem(`key-${i}`, `value-${i}`);
      if (realStorageAvailable) {
        localStorage.setItem(`key-${i}`, `value-${i}`);
      }
    }

    const mockResults = runPerformanceTest(() => {
      mockStorage.clear();
    }, config.sampleSize);

    console.log('模拟实现 - 清除存储性能:', mockResults);
    
    if (realStorageAvailable) {
      const realResults = runPerformanceTest(() => {
        localStorage.clear();
      }, config.sampleSize);
      
      console.log('真实实现 - 清除存储性能:', realResults);
      console.log(`性能比较 - 清除存储: 模拟实现与真实实现的比值: ${mockResults.avg / realResults.avg}`);
    }
  });

  // 测试Key遍历
  test('遍历所有键', () => {
    // 先填充数据
    for (let i = 0; i < config.smallItems; i++) {
      mockStorage.setItem(`key-${i}`, `value-${i}`);
      if (realStorageAvailable) {
        localStorage.setItem(`key-${i}`, `value-${i}`);
      }
    }

    const mockResults = runPerformanceTest(() => {
      for (let i = 0; i < mockStorage.length; i++) {
        mockStorage.key(i);
      }
    }, config.sampleSize);

    console.log('模拟实现 - 遍历键性能:', mockResults);
    
    if (realStorageAvailable) {
      const realResults = runPerformanceTest(() => {
        for (let i = 0; i < localStorage.length; i++) {
          localStorage.key(i);
        }
      }, config.sampleSize);
      
      console.log('真实实现 - 遍历键性能:', realResults);
      console.log(`性能比较 - 遍历键: 模拟实现与真实实现的比值: ${mockResults.avg / realResults.avg}`);
    }
  });
}); 