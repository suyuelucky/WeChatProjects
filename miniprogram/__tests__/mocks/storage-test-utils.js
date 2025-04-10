/**
 * localStorage测试工具函数
 * 
 * 创建时间: 2025年04月09日
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

/**
 * 生成指定大小的字符串
 * @param {number} size - 字符串大小（字节）
 * @return {string} - 生成的字符串
 */
function generateLargeString(size) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  
  for (let i = 0; i < size; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

/**
 * 运行性能测试并收集数据
 * @param {Function} testFunction - 要测试的函数
 * @param {number} iterations - 重复测试的次数
 * @return {Object} - 包含测试结果的对象
 */
function runPerformanceTest(testFunction, iterations = 100) {
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    testFunction();
    const end = performance.now();
    times.push(end - start);
  }
  
  // 计算统计数据
  const total = times.reduce((sum, time) => sum + time, 0);
  const average = total / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  return {
    average,
    min,
    max,
    total,
    times
  };
}

/**
 * 清除真实的localStorage (仅在浏览器或JSDOM环境下可用)
 */
function clearRealLocalStorage() {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
}

/**
 * 格式化性能测试结果为可读的字符串
 * @param {Object} results - 测试结果对象
 * @return {string} - 格式化的结果
 */
function formatPerformanceResults(results) {
  return `平均: ${results.average.toFixed(3)}ms, 最小: ${results.min.toFixed(3)}ms, 最大: ${results.max.toFixed(3)}ms, 总计: ${results.total.toFixed(3)}ms`;
}

/**
 * 对比两个测试结果并计算差异百分比
 * @param {Object} mockResults - 模拟实现的测试结果
 * @param {Object} realResults - 真实实现的测试结果
 * @return {Object} - 包含差异百分比的对象
 */
function compareResults(mockResults, realResults) {
  const averageDiff = ((mockResults.average - realResults.average) / realResults.average) * 100;
  const minDiff = ((mockResults.min - realResults.min) / realResults.min) * 100;
  const maxDiff = ((mockResults.max - realResults.max) / realResults.max) * 100;
  
  return {
    averageDiff,
    minDiff,
    maxDiff,
    isMockFaster: averageDiff < 0
  };
}

module.exports = {
  generateLargeString,
  runPerformanceTest,
  clearRealLocalStorage,
  formatPerformanceResults,
  compareResults
}; 