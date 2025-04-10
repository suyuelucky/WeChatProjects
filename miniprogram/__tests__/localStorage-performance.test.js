/**
 * localStorage 性能测试
 * 
 * 创建时间: 2025年04月09日
 * 创建者: Claude 3.7 Sonnet
 * 
 * 此测试文件比较真实localStorage和LocalStorageMock的性能差异
 */

'use strict';

const { LocalStorageMock } = require('./mocks/localStorage.mock');
const { 
  generateLargeString, 
  runPerformanceTest, 
  clearRealLocalStorage,
  formatPerformanceResults,
  compareResults
} = require('./mocks/storage-test-utils');

describe('LocalStorage 性能测试', () => {
  // 测试数据
  const smallData = generateLargeString(100);
  const mediumData = generateLargeString(1000);
  const largeData = generateLargeString(5000);
  
  // 实例化模拟对象
  const mockStorage = new LocalStorageMock();
  
  // 测试前清理
  beforeEach(() => {
    mockStorage.clear();
    clearRealLocalStorage();
  });
  
  // 测试小型数据
  describe('小型数据 (100字节)', () => {
    const keyPrefix = 'small';
    
    test('setItem 性能对比', () => {
      const mockResults = runPerformanceTest(() => {
        for (let i = 0; i < 10; i++) {
          mockStorage.setItem(`${keyPrefix}_${i}`, smallData);
        }
      }, 50);
      
      console.log(`\n模拟 localStorage.setItem (小型数据): ${formatPerformanceResults(mockResults)}`);
      
      if (typeof localStorage !== 'undefined') {
        const realResults = runPerformanceTest(() => {
          for (let i = 0; i < 10; i++) {
            localStorage.setItem(`${keyPrefix}_${i}`, smallData);
          }
        }, 50);
        
        console.log(`真实 localStorage.setItem (小型数据): ${formatPerformanceResults(realResults)}`);
        
        const comparison = compareResults(mockResults, realResults);
        console.log(`差异: ${comparison.averageDiff.toFixed(2)}% (${comparison.isMockFaster ? '模拟更快' : '真实更快'})`);
      }
    });
    
    test('getItem 性能对比', () => {
      // 预先填充数据
      for (let i = 0; i < 10; i++) {
        mockStorage.setItem(`${keyPrefix}_${i}`, smallData);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(`${keyPrefix}_${i}`, smallData);
        }
      }
      
      const mockResults = runPerformanceTest(() => {
        for (let i = 0; i < 10; i++) {
          mockStorage.getItem(`${keyPrefix}_${i}`);
        }
      }, 50);
      
      console.log(`\n模拟 localStorage.getItem (小型数据): ${formatPerformanceResults(mockResults)}`);
      
      if (typeof localStorage !== 'undefined') {
        const realResults = runPerformanceTest(() => {
          for (let i = 0; i < 10; i++) {
            localStorage.getItem(`${keyPrefix}_${i}`);
          }
        }, 50);
        
        console.log(`真实 localStorage.getItem (小型数据): ${formatPerformanceResults(realResults)}`);
        
        const comparison = compareResults(mockResults, realResults);
        console.log(`差异: ${comparison.averageDiff.toFixed(2)}% (${comparison.isMockFaster ? '模拟更快' : '真实更快'})`);
      }
    });
  });
  
  // 测试中型数据
  describe('中型数据 (1KB)', () => {
    const keyPrefix = 'medium';
    
    test('setItem 性能对比', () => {
      const mockResults = runPerformanceTest(() => {
        for (let i = 0; i < 5; i++) {
          mockStorage.setItem(`${keyPrefix}_${i}`, mediumData);
        }
      }, 50);
      
      console.log(`\n模拟 localStorage.setItem (中型数据): ${formatPerformanceResults(mockResults)}`);
      
      if (typeof localStorage !== 'undefined') {
        const realResults = runPerformanceTest(() => {
          for (let i = 0; i < 5; i++) {
            localStorage.setItem(`${keyPrefix}_${i}`, mediumData);
          }
        }, 50);
        
        console.log(`真实 localStorage.setItem (中型数据): ${formatPerformanceResults(realResults)}`);
        
        const comparison = compareResults(mockResults, realResults);
        console.log(`差异: ${comparison.averageDiff.toFixed(2)}% (${comparison.isMockFaster ? '模拟更快' : '真实更快'})`);
      }
    });
  });
  
  // 测试大型数据
  describe('大型数据 (5KB)', () => {
    const keyPrefix = 'large';
    
    test('setItem 性能对比', () => {
      const mockResults = runPerformanceTest(() => {
        mockStorage.setItem(`${keyPrefix}_test`, largeData);
      }, 30);
      
      console.log(`\n模拟 localStorage.setItem (大型数据): ${formatPerformanceResults(mockResults)}`);
      
      if (typeof localStorage !== 'undefined') {
        const realResults = runPerformanceTest(() => {
          localStorage.setItem(`${keyPrefix}_test`, largeData);
        }, 30);
        
        console.log(`真实 localStorage.setItem (大型数据): ${formatPerformanceResults(realResults)}`);
        
        const comparison = compareResults(mockResults, realResults);
        console.log(`差异: ${comparison.averageDiff.toFixed(2)}% (${comparison.isMockFaster ? '模拟更快' : '真实更快'})`);
      }
    });
  });
  
  // 批量操作测试
  describe('批量操作', () => {
    test('新增并删除100个项目', () => {
      const mockResults = runPerformanceTest(() => {
        // 添加100个项目
        for (let i = 0; i < 100; i++) {
          mockStorage.setItem(`bulk_${i}`, `value_${i}`);
        }
        
        // 删除50个项目
        for (let i = 0; i < 50; i++) {
          mockStorage.removeItem(`bulk_${i}`);
        }
      }, 20);
      
      console.log(`\n模拟 localStorage 批量操作: ${formatPerformanceResults(mockResults)}`);
      
      if (typeof localStorage !== 'undefined') {
        const realResults = runPerformanceTest(() => {
          // 添加100个项目
          for (let i = 0; i < 100; i++) {
            localStorage.setItem(`bulk_${i}`, `value_${i}`);
          }
          
          // 删除50个项目
          for (let i = 0; i < 50; i++) {
            localStorage.removeItem(`bulk_${i}`);
          }
        }, 20);
        
        console.log(`真实 localStorage 批量操作: ${formatPerformanceResults(realResults)}`);
        
        const comparison = compareResults(mockResults, realResults);
        console.log(`差异: ${comparison.averageDiff.toFixed(2)}% (${comparison.isMockFaster ? '模拟更快' : '真实更快'})`);
      }
    });
  });
}); 