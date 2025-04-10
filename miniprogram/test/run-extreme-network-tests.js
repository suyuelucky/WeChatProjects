/**
 * 极端网络环境测试脚本
 * 测试图像加载器在各种恶劣网络条件下的性能和适应性
 * 
 * 创建时间: 2025-04-09 20:27:55
 * 创建者: Claude AI 3.7 Sonnet
 */

// 设置测试环境
process.env.NODE_ENV = 'test';

// 导入必要的模块
const OptimizedImageLoader = require('../utils/optimized-image-loader');
const NetworkSimulator = require('./utils/network-simulator');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// 控制台颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// 输出格式化函数
function printTitle(title) {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + ' ' + title + colors.reset);
  console.log(colors.bright + colors.cyan + '='.repeat(80) + colors.reset);
}

function printSubtitle(subtitle) {
  console.log('\n' + colors.bright + colors.yellow + subtitle + colors.reset);
  console.log(colors.yellow + '-'.repeat(subtitle.length) + colors.reset);
}

function printResult(label, value, isSuccess = true) {
  const statusColor = isSuccess ? colors.green : colors.red;
  console.log(`${colors.bright}${label}:${colors.reset} ${statusColor}${value}${colors.reset}`);
}

// 测试配置
const testConfig = {
  // 测试图片URL数组，实际测试中会使用真实URL
  testImages: [
    'https://example.com/test-image-1.jpg',
    'https://example.com/test-image-2.jpg',
    'https://example.com/test-image-3.jpg',
    'https://example.com/test-image-4.jpg',
    'https://example.com/test-image-5.jpg',
    'https://example.com/test-image-large-1.jpg',
    'https://example.com/test-image-large-2.jpg',
    'https://example.com/test-image-large-3.jpg',
  ],
  // 极大图片用于测试大文件加载
  largeImages: [
    'https://example.com/extremely-large-image-1.jpg', // 10MB
    'https://example.com/extremely-large-image-2.jpg', // 15MB
  ],
  // 网络配置
  networkProfiles: {
    fast: { type: '4g', latency: 100, packetLoss: 0, downloadSpeed: 1000 }, // 1Mbps
    medium: { type: '3g', latency: 300, packetLoss: 0.05, downloadSpeed: 500 }, // 500kbps
    slow: { type: '2g', latency: 800, packetLoss: 0.1, downloadSpeed: 100 }, // 100kbps
    verySlowWithLoss: { type: '2g', latency: 1200, packetLoss: 0.25, downloadSpeed: 50 }, // 50kbps
    unreliable: { type: 'unknown', latency: 2000, packetLoss: 0.4, downloadSpeed: 30 }, // 30kbps
    extreme: { type: 'unknown', latency: 3000, packetLoss: 0.6, downloadSpeed: 10 }, // 10kbps
  },
  // 超时设置
  timeoutSettings: {
    standard: 30000, // 30秒
    extended: 60000, // 60秒
  },
  // 重试设置
  retrySettings: {
    none: { count: 0, delay: 0 },
    minimal: { count: 1, delay: 1000 },
    moderate: { count: 3, delay: 2000 },
    aggressive: { count: 5, delay: 3000 },
  },
  // 测试持续时间
  testDuration: 300000, // 5分钟
};

/**
 * 运行网络断连测试
 */
async function runNetworkDisconnectTests() {
  printSubtitle('测试网络断连恢复');

  const imageLoader = new OptimizedImageLoader({
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    concurrentLoads: 3,
    retryCount: 3,
    retryDelay: 2000,
    timeout: 30000,
    debug: true
  });

  // 初始化网络模拟器
  const networkSim = new NetworkSimulator();
  
  try {
    // 开始测试，先设置为正常网络
    networkSim.setNetworkProfile(testConfig.networkProfiles.medium);
    
    console.log('1. 开始加载图片 (正常网络)');
    const loadPromises = testConfig.testImages.slice(0, 3).map(url => {
      return imageLoader.loadImage(url).catch(err => {
        console.log(`加载失败 ${url}: ${err.message}`);
        return null;
      });
    });
    
    // 在加载过程中突然断开网络
    setTimeout(() => {
      console.log('2. 模拟网络突然断开');
      networkSim.disconnectNetwork();
    }, 1000);
    
    // 等待一段时间后恢复网络
    setTimeout(() => {
      console.log('3. 恢复网络连接');
      networkSim.setNetworkProfile(testConfig.networkProfiles.slow);
    }, 5000);
    
    // 等待所有加载完成或超时
    const results = await Promise.race([
      Promise.all(loadPromises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('测试超时')), 20000))
    ]);
    
    // 分析结果
    const successCount = results.filter(r => r !== null).length;
    const successRate = (successCount / testConfig.testImages.slice(0, 3).length) * 100;
    
    printResult('网络断连后恢复成功率', `${successRate.toFixed(2)}%`, successRate > 50);
    printResult('成功加载图片数', `${successCount}/${testConfig.testImages.slice(0, 3).length}`);
    
    // 检查图片加载器状态
    const stats = imageLoader.getStats();
    printResult('重试次数', stats.retryCount || 0);
    printResult('失败任务处理', stats.failedTasksHandled || 0);
    
    return { 
      successRate, 
      successCount, 
      totalImages: testConfig.testImages.slice(0, 3).length,
      stats
    };
  } finally {
    // 清理
    networkSim.restore();
  }
}

/**
 * 运行弱网测试
 */
async function runPoorNetworkTests() {
  printSubtitle('测试极端弱网环境');

  // 使用更激进的重试策略
  const imageLoader = new OptimizedImageLoader({
    maxCacheSize: 50 * 1024 * 1024, // 50MB
    concurrentLoads: 2,
    retryCount: 5,
    retryDelay: 1000,
    timeout: 45000,
    debug: true
  });

  // 初始化网络模拟器并设置为极端弱网
  const networkSim = new NetworkSimulator();
  
  try {
    // 设置为极端弱网
    networkSim.setNetworkProfile(testConfig.networkProfiles.extreme);
    
    console.log('开始在极端弱网环境中加载图片');
    const startTime = performance.now();
    
    const loadPromises = testConfig.testImages.slice(0, 5).map(url => {
      return imageLoader.loadImage(url).catch(err => {
        console.log(`加载失败 ${url}: ${err.message}`);
        return null;
      });
    });
    
    // 等待所有加载完成或超时
    const results = await Promise.race([
      Promise.all(loadPromises),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 60000))
    ]);
    
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    
    // 如果超时，记录已完成的数量
    let successCount = 0;
    if (results === 'timeout') {
      printResult('测试结果', '测试超时，部分图片未能加载完成', false);
      // 获取已完成的数量
      successCount = (await Promise.all(
        loadPromises.map(p => p.then(() => true).catch(() => false))
      )).filter(r => r).length;
    } else {
      successCount = results.filter(r => r !== null).length;
    }
    
    const successRate = (successCount / testConfig.testImages.slice(0, 5).length) * 100;
    
    printResult('极端弱网成功率', `${successRate.toFixed(2)}%`, successRate > 30);
    printResult('成功加载图片数', `${successCount}/${testConfig.testImages.slice(0, 5).length}`);
    printResult('总耗时', `${duration.toFixed(2)}秒`);
    
    // 获取加载器性能统计
    const stats = imageLoader.getStats();
    printResult('平均加载时间', `${stats.avgLoadTime || 'N/A'}ms`);
    printResult('重试次数', stats.retryCount || 0);
    
    return { 
      successRate, 
      successCount, 
      totalImages: testConfig.testImages.slice(0, 5).length,
      duration,
      stats
    };
  } finally {
    // 清理
    networkSim.restore();
  }
}

/**
 * 运行网络波动测试
 */
async function runNetworkFluctuationTests() {
  printSubtitle('测试网络质量波动');

  const imageLoader = new OptimizedImageLoader({
    maxCacheSize: 50 * 1024 * 1024,
    concurrentLoads: 3,
    retryCount: 4,
    retryDelay: 1500,
    timeout: 40000,
    debug: true
  });

  // 初始化网络模拟器
  const networkSim = new NetworkSimulator();
  
  try {
    // 记录开始时间
    const startTime = performance.now();
    
    // 开始加载所有图片
    console.log('开始在波动网络环境中加载图片');
    const loadPromises = testConfig.testImages.map(url => {
      return imageLoader.loadImage(url).catch(err => {
        console.log(`加载失败 ${url}: ${err.message}`);
        return null;
      });
    });
    
    // 网络波动模拟
    const fluctuationInterval = setInterval(() => {
      const profiles = Object.values(testConfig.networkProfiles);
      const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
      console.log(`网络波动: 切换到 ${randomProfile.type} 网络`);
      networkSim.setNetworkProfile(randomProfile);
    }, 5000);
    
    // 等待所有加载完成或超时
    const results = await Promise.race([
      Promise.all(loadPromises),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 120000))
    ]);
    
    // 停止网络波动
    clearInterval(fluctuationInterval);
    
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    
    // 如果超时，记录已完成的数量
    let successCount = 0;
    if (results === 'timeout') {
      printResult('测试结果', '测试超时，部分图片未能加载完成', false);
      // 获取已完成的数量
      successCount = (await Promise.all(
        loadPromises.map(p => p.then(() => true).catch(() => false))
      )).filter(r => r).length;
    } else {
      successCount = results.filter(r => r !== null).length;
    }
    
    const successRate = (successCount / testConfig.testImages.length) * 100;
    
    printResult('网络波动环境成功率', `${successRate.toFixed(2)}%`, successRate > 60);
    printResult('成功加载图片数', `${successCount}/${testConfig.testImages.length}`);
    printResult('总耗时', `${duration.toFixed(2)}秒`);
    
    // 获取详细统计
    const stats = imageLoader.getStats();
    printResult('平均加载时间', `${stats.avgLoadTime || 'N/A'}ms`);
    printResult('重试次数', stats.retryCount || 0);
    printResult('最长加载时间', `${stats.maxLoadTime || 'N/A'}ms`);
    
    return { 
      successRate, 
      successCount, 
      totalImages: testConfig.testImages.length,
      duration,
      stats
    };
  } finally {
    // 清理
    networkSim.restore();
  }
}

/**
 * 运行大文件测试
 */
async function runLargeFileTests() {
  printSubtitle('测试大文件加载和断点续传');

  const imageLoader = new OptimizedImageLoader({
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    concurrentLoads: 1,
    retryCount: 3,
    retryDelay: 2000,
    timeout: 120000, // 2分钟超时
    debug: true
  });

  // 初始化网络模拟器
  const networkSim = new NetworkSimulator();
  
  try {
    // 设置为慢速网络
    networkSim.setNetworkProfile(testConfig.networkProfiles.slow);
    
    console.log('开始加载大文件图片');
    const startTime = performance.now();
    
    // 加载大文件
    const loadPromises = testConfig.largeImages.map(url => {
      return imageLoader.loadImage(url, { priority: 'high' }).catch(err => {
        console.log(`加载失败 ${url}: ${err.message}`);
        return null;
      });
    });
    
    // 模拟网络中断和恢复
    setTimeout(() => {
      console.log('模拟网络中断');
      networkSim.disconnectNetwork();
      
      setTimeout(() => {
        console.log('恢复网络连接');
        networkSim.setNetworkProfile(testConfig.networkProfiles.medium);
      }, 10000);
    }, 20000);
    
    // 等待所有加载完成或超时
    const results = await Promise.race([
      Promise.all(loadPromises),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 180000))
    ]);
    
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    
    // 如果超时，记录已完成的数量
    let successCount = 0;
    if (results === 'timeout') {
      printResult('测试结果', '测试超时，部分图片未能加载完成', false);
      // 获取已完成的数量
      successCount = (await Promise.all(
        loadPromises.map(p => p.then(() => true).catch(() => false))
      )).filter(r => r).length;
    } else {
      successCount = results.filter(r => r !== null).length;
    }
    
    const successRate = (successCount / testConfig.largeImages.length) * 100;
    
    printResult('大文件加载成功率', `${successRate.toFixed(2)}%`, successRate > 50);
    printResult('成功加载图片数', `${successCount}/${testConfig.largeImages.length}`);
    printResult('总耗时', `${duration.toFixed(2)}秒`);
    
    // 获取详细统计
    const stats = imageLoader.getStats();
    printResult('平均加载时间', `${stats.avgLoadTime || 'N/A'}ms`);
    printResult('断点续传次数', stats.resumeCount || 0);
    
    return { 
      successRate, 
      successCount, 
      totalImages: testConfig.largeImages.length,
      duration,
      stats
    };
  } finally {
    // 清理
    networkSim.restore();
  }
}

/**
 * 运行并发加载测试
 */
async function runConcurrentLoadTests() {
  printSubtitle('测试并发加载和优先级');

  const imageLoader = new OptimizedImageLoader({
    maxCacheSize: 50 * 1024 * 1024,
    concurrentLoads: 2, // 限制并发数
    retryCount: 3,
    retryDelay: 2000,
    timeout: 30000,
    debug: true
  });

  // 初始化网络模拟器
  const networkSim = new NetworkSimulator();
  
  try {
    // 设置为中等网络
    networkSim.setNetworkProfile(testConfig.networkProfiles.medium);
    
    console.log('测试不同优先级的并发加载');
    const startTime = performance.now();
    
    // 准备测试图片，分配不同优先级
    const highPriorityImages = testConfig.testImages.slice(0, 2);
    const normalPriorityImages = testConfig.testImages.slice(2, 5);
    const lowPriorityImages = testConfig.testImages.slice(5);
    
    // 记录加载完成时间
    const completionTimes = {
      high: [],
      normal: [],
      low: []
    };
    
    // 加载高优先级图片
    const highPriorityPromises = highPriorityImages.map(url => {
      const start = performance.now();
      return imageLoader.loadImage(url, { priority: 'high' })
        .then(result => {
          const end = performance.now();
          completionTimes.high.push(end - start);
          return result;
        })
        .catch(err => {
          console.log(`高优先级加载失败 ${url}: ${err.message}`);
          return null;
        });
    });
    
    // 加载普通优先级图片
    const normalPriorityPromises = normalPriorityImages.map(url => {
      const start = performance.now();
      return imageLoader.loadImage(url, { priority: 'normal' })
        .then(result => {
          const end = performance.now();
          completionTimes.normal.push(end - start);
          return result;
        })
        .catch(err => {
          console.log(`普通优先级加载失败 ${url}: ${err.message}`);
          return null;
        });
    });
    
    // 加载低优先级图片
    const lowPriorityPromises = lowPriorityImages.map(url => {
      const start = performance.now();
      return imageLoader.loadImage(url, { priority: 'low' })
        .then(result => {
          const end = performance.now();
          completionTimes.low.push(end - start);
          return result;
        })
        .catch(err => {
          console.log(`低优先级加载失败 ${url}: ${err.message}`);
          return null;
        });
    });
    
    // 合并所有Promise
    const allPromises = [
      ...highPriorityPromises,
      ...normalPriorityPromises,
      ...lowPriorityPromises
    ];
    
    // 等待所有加载完成
    const results = await Promise.all(allPromises);
    
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    
    // 计算各优先级的平均加载时间
    const avgHighTime = completionTimes.high.length > 0 ? 
      completionTimes.high.reduce((a, b) => a + b, 0) / completionTimes.high.length : 0;
    
    const avgNormalTime = completionTimes.normal.length > 0 ? 
      completionTimes.normal.reduce((a, b) => a + b, 0) / completionTimes.normal.length : 0;
    
    const avgLowTime = completionTimes.low.length > 0 ? 
      completionTimes.low.reduce((a, b) => a + b, 0) / completionTimes.low.length : 0;
    
    // 验证优先级是否有效（高优先级应该比低优先级更快完成）
    const priorityEffective = avgHighTime < avgLowTime;
    
    const successCount = results.filter(r => r !== null).length;
    const successRate = (successCount / allPromises.length) * 100;
    
    printResult('并发加载成功率', `${successRate.toFixed(2)}%`, successRate > 70);
    printResult('成功加载图片数', `${successCount}/${allPromises.length}`);
    printResult('总耗时', `${duration.toFixed(2)}秒`);
    printResult('高优先级平均加载时间', `${avgHighTime.toFixed(2)}ms`);
    printResult('普通优先级平均加载时间', `${avgNormalTime.toFixed(2)}ms`);
    printResult('低优先级平均加载时间', `${avgLowTime.toFixed(2)}ms`);
    printResult('优先级策略有效性', priorityEffective ? '有效' : '无效', priorityEffective);
    
    return { 
      successRate, 
      successCount, 
      totalImages: allPromises.length,
      duration,
      avgLoadTimes: {
        high: avgHighTime,
        normal: avgNormalTime,
        low: avgLowTime
      },
      priorityEffective
    };
  } finally {
    // 清理
    networkSim.restore();
  }
}

/**
 * 生成测试报告
 */
function generateTestReport(results) {
  const reportData = {
    testTime: new Date().toISOString(),
    environment: {
      platform: process.platform,
      nodeVersion: process.version
    },
    results,
    summary: {
      overallSuccessRate: 0,
      totalSuccessfulLoads: 0,
      totalAttemptedLoads: 0,
      totalDuration: 0,
      passed: false
    }
  };
  
  // 计算总体成功率
  let totalSuccess = 0;
  let totalAttempts = 0;
  let totalDuration = 0;
  
  Object.keys(results).forEach(testName => {
    const result = results[testName];
    if (result.successCount !== undefined && result.totalImages !== undefined) {
      totalSuccess += result.successCount;
      totalAttempts += result.totalImages;
    }
    if (result.duration) {
      totalDuration += result.duration;
    }
  });
  
  reportData.summary.overallSuccessRate = totalAttempts > 0 ? 
    (totalSuccess / totalAttempts) * 100 : 0;
  reportData.summary.totalSuccessfulLoads = totalSuccess;
  reportData.summary.totalAttemptedLoads = totalAttempts;
  reportData.summary.totalDuration = totalDuration;
  
  // 判断测试是否通过 (75%以上成功率视为通过)
  reportData.summary.passed = reportData.summary.overallSuccessRate >= 75;
  
  // 输出测试报告
  printTitle('极端网络测试总结');
  printResult('总体成功率', `${reportData.summary.overallSuccessRate.toFixed(2)}%`, 
    reportData.summary.overallSuccessRate >= 75);
  printResult('成功加载总数', `${totalSuccess}/${totalAttempts}`);
  printResult('总测试耗时', `${totalDuration.toFixed(2)}秒`);
  printResult('测试结果', reportData.summary.passed ? '通过' : '不通过', reportData.summary.passed);
  
  // 保存测试报告
  try {
    const reportDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const fileName = `network-test-report-${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(
      path.join(reportDir, fileName),
      JSON.stringify(reportData, null, 2)
    );
    
    console.log(`\n测试报告已保存至: ${path.join(reportDir, fileName)}`);
  } catch (error) {
    console.error('保存测试报告时出错:', error);
  }
  
  return reportData;
}

/**
 * 主测试函数
 */
async function main() {
  const startTime = performance.now();
  
  printTitle('开始极端网络环境测试');
  console.log(`测试时间: ${new Date().toISOString()}`);
  console.log(`测试环境: ${process.platform}, Node ${process.version}`);
  
  const results = {};
  
  try {
    // 运行网络断连测试
    console.log('\n开始网络断连测试...');
    results.disconnectTest = await runNetworkDisconnectTests();
    
    // 运行弱网测试
    console.log('\n开始极端弱网测试...');
    results.poorNetworkTest = await runPoorNetworkTests();
    
    // 运行网络波动测试
    console.log('\n开始网络波动测试...');
    results.fluctuationTest = await runNetworkFluctuationTests();
    
    // 运行大文件测试
    console.log('\n开始大文件加载测试...');
    results.largeFileTest = await runLargeFileTests();
    
    // 运行并发加载测试
    console.log('\n开始并发加载测试...');
    results.concurrentLoadTest = await runConcurrentLoadTests();
    
    // 生成测试报告
    const report = generateTestReport(results);
    
    const endTime = performance.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log(`\n测试完成，总耗时: ${totalDuration.toFixed(2)}秒`);
    
    return report.summary.passed ? 0 : 1;
  } catch (error) {
    console.error('\n测试过程中发生错误:', error);
    return 1;
  }
}

// 如果直接运行此脚本，则执行主函数
if (require.main === module) {
  main().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runNetworkDisconnectTests,
  runPoorNetworkTests,
  runNetworkFluctuationTests,
  runLargeFileTests,
  runConcurrentLoadTests,
  main
}; 