/**
 * 图片加载器网络适应性极限测试
 * 创建日期: 2025-04-11 15:25:42
 * 创建者: Claude AI 3.7 Sonnet
 * 
 * 该文件包含了针对优化图片加载器在各种网络环境下的严格测试
 * 包括网络波动、弱网环境、断网重连等场景测试
 */

const OptimizedImageLoader = require('../utils/optimized-image-loader');
const { NetworkFluctuationSimulator } = require('./network-adaptability.test');

// 设置测试环境
process.env.NODE_ENV = 'test';

// 输出颜色配置
const color = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  
  // 便利函数
  bold: function(text) { return color.bright + text + color.reset; },
  error: function(text) { return color.red + text + color.reset; },
  success: function(text) { return color.green + text + color.reset; },
  warn: function(text) { return color.yellow + text + color.reset; },
  info: function(text) { return color.cyan + text + color.reset; }
};

// 测试配置
const TEST_CONFIG = {
  DURATION: 120000, // 测试持续时间 2分钟
  IMAGES: [
    'https://example.com/images/test_1.jpg',
    'https://example.com/images/test_2.jpg',
    'https://example.com/images/test_3.jpg',
    'https://example.com/images/test_4.jpg',
    'https://example.com/images/test_5.jpg',
    'https://example.com/images/test_high_res_1.jpg',
    'https://example.com/images/test_high_res_2.jpg',
    'https://example.com/images/test_transparent.png',
    'https://example.com/images/test_animated.gif',
    'https://example.com/images/test_large.jpg'
  ],
  NETWORK_TYPES: ['wifi', '4g', '3g', '2g', 'none', '2g', '3g', '4g', 'wifi'],
  NETWORK_SWITCH_INTERVAL: 8000, // 网络切换间隔
  EXTREME_FAILURE_RATE: 0.8,     // 极端失败率
  NETWORK_FLUCTUATION_INTERVAL: 3000 // 网络波动间隔
};

// 输出格式化函数
function printTitle(title) {
  console.log('\n' + color.bold('='.repeat(80)));
  console.log(color.bold(' ' + title));
  console.log(color.bold('='.repeat(80)));
}

function printSubtitle(subtitle) {
  console.log('\n' + color.bold('-'.repeat(50)));
  console.log(color.bold(' ' + subtitle));
  console.log(color.bold('-'.repeat(50)));
}

function printResult(name, value, isSuccess) {
  const icon = isSuccess === undefined ? '•' : 
               isSuccess === true ? '✓' : 
               '✗';
  const valueColor = isSuccess === undefined ? color.info : 
                     isSuccess === true ? color.success : 
                     color.error;
  
  console.log(`  ${icon} ${name}: ${valueColor(value)}`);
}

/**
 * 测试极端弱网环境
 */
async function testExtremeWeakNetwork() {
  printSubtitle('极端弱网环境测试');
  
  // 创建极端网络波动模拟器
  const networkSimulator = new NetworkFluctuationSimulator({
    TIMEOUT_PERCENTAGE: 80,        // 80%请求超时
    SLOW_RESPONSE_PERCENTAGE: 90,  // 90%慢响应
    MAX_DELAY: 12000,              // 最大延迟12秒
    DISCONNECT_INTERVAL: 5000,     // 每5秒断网一次
    RECONNECT_DELAY: 3000          // 断网后3秒重连
  });
  
  // 创建图片加载器
  const loader = new OptimizedImageLoader({
    maxCacheSize: 20 * 1024 * 1024,
    logLevel: 'info',
    adaptiveLoadingEnabled: true,
    maxRetries: 8,                 // 增加重试次数
    retryInterval: 1000,           // 重试间隔
    timeout: 10000,                // 超时设置
    weakNetworkTimeoutMultiplier: 3 // 弱网超时倍数
  });
  
  // 初始化加载器
  await loader.init();
  console.log('图片加载器初始化完成');
  
  // 启动极端网络波动
  networkSimulator.start();
  networkSimulator.setNetworkType('2g');
  
  // 统计变量
  const stats = {
    startTime: Date.now(),
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    retryCount: 0,
    timeoutCount: 0,
    averageLoadTime: 0,
    maxLoadTime: 0,
    loadTimes: [],
    consecutiveSuccesses: 0,
    longestConsecutiveSuccess: 0
  };
  
  console.log('开始极端弱网环境测试，将持续测试图片加载能力...');
  
  // 测试持续指定时间
  const testEndTime = Date.now() + TEST_CONFIG.DURATION / 2;
  
  // 定义异步测试函数
  const runTestIteration = async () => {
    // 随机选择一张图片
    const randomIndex = Math.floor(Math.random() * TEST_CONFIG.IMAGES.length);
    const url = TEST_CONFIG.IMAGES[randomIndex];
    
    stats.totalRequests++;
    
    try {
      // 记录加载开始时间
      const loadStartTime = Date.now();
      
      // 加载图片，设置更长的超时时间
      const result = await loader.loadImage({
        url,
        timeout: 15000
      });
      
      // 计算加载时间
      const loadTime = Date.now() - loadStartTime;
      stats.loadTimes.push(loadTime);
      
      // 更新统计
      stats.successRequests++;
      stats.retryCount += (result.retryCount || 0);
      stats.maxLoadTime = Math.max(stats.maxLoadTime, loadTime);
      
      // 记录连续成功
      stats.consecutiveSuccesses++;
      stats.longestConsecutiveSuccess = Math.max(
        stats.longestConsecutiveSuccess, 
        stats.consecutiveSuccesses
      );
      
      if (stats.successRequests % 5 === 0) {
        console.log(color.success(`成功加载第 ${stats.successRequests} 张图片，耗时: ${loadTime}ms`));
      }
    } catch (error) {
      stats.failedRequests++;
      stats.consecutiveSuccesses = 0;
      
      // 记录超时情况
      if (error.message && error.message.indexOf('超时') >= 0) {
        stats.timeoutCount++;
      }
      
      console.log(color.error(`加载失败: ${url} - ${error.message}`));
    }
  };
  
  // 批量执行测试
  while (Date.now() < testEndTime) {
    // 并发运行多个测试实例
    await Promise.all([
      runTestIteration(),
      runTestIteration(),
      runTestIteration()
    ]);
    
    // 短暂暂停
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // 清理
  networkSimulator.stop();
  await loader.destroy();
  
  // 计算平均加载时间
  if (stats.loadTimes.length) {
    stats.averageLoadTime = stats.loadTimes.reduce((sum, time) => sum + time, 0) / stats.loadTimes.length;
  }
  
  // 输出统计结果
  const totalDuration = (Date.now() - stats.startTime) / 1000;
  
  console.log('\n' + color.bold('极端弱网环境测试结果:'));
  printResult('测试持续时间', `${totalDuration.toFixed(2)}秒`);
  printResult('总请求数', stats.totalRequests);
  printResult('成功请求数', stats.successRequests);
  printResult('失败请求数', stats.failedRequests);
  printResult('平均加载时间', `${Math.round(stats.averageLoadTime)}ms`, stats.averageLoadTime < 5000);
  printResult('最长加载时间', `${Math.round(stats.maxLoadTime)}ms`);
  printResult('重试次数', stats.retryCount);
  printResult('超时次数', stats.timeoutCount);
  printResult('最长连续成功', stats.longestConsecutiveSuccess, stats.longestConsecutiveSuccess >= 3);
  
  // 测试结果评估
  const successRate = (stats.successRequests / stats.totalRequests) * 100;
  
  console.log('\n' + color.bold('极端弱网测试总结:'));
  printResult('极端弱网成功率', `${successRate.toFixed(2)}%`, successRate > 30);
  
  return {
    successRate,
    averageLoadTime: stats.averageLoadTime,
    totalRequests: stats.totalRequests,
    retryCount: stats.retryCount,
    maxLoadTime: stats.maxLoadTime,
    longestConsecutiveSuccess: stats.longestConsecutiveSuccess
  };
}

/**
 * 测试断网重连恢复能力
 */
async function testNetworkRecovery() {
  printSubtitle('断网重连恢复能力测试');
  
  // 创建网络波动模拟器
  const networkSimulator = new NetworkFluctuationSimulator();
  
  // 创建图片加载器
  const loader = new OptimizedImageLoader({
    maxCacheSize: 20 * 1024 * 1024,
    logLevel: 'info',
    adaptiveLoadingEnabled: true,
    maxRetries: 5
  });
  
  // 初始化加载器
  await loader.init();
  
  // 统计变量
  const stats = {
    disconnectCount: 0,
    recoverySuccessCount: 0,
    tasksDuringDisconnect: 0,
    tasksAfterRecovery: 0,
    recoveryTimes: []
  };
  
  // 测试持续时间
  const testDuration = TEST_CONFIG.DURATION / 3;
  const startTime = Date.now();
  
  // 启动网络模拟器
  networkSimulator.start();
  networkSimulator.setNetworkType('4g');
  
  console.log('开始断网重连恢复能力测试...');
  
  // 断网重连循环测试
  while (Date.now() - startTime < testDuration) {
    // 预热 - 先加载一些图片
    console.log(color.info('正常网络下预热加载...'));
    const preloadPromises = TEST_CONFIG.IMAGES.slice(0, 3).map(url => 
      loader.loadImage({ url }).catch(e => ({ error: e }))
    );
    await Promise.all(preloadPromises);
    
    // 断网
    stats.disconnectCount++;
    console.log(color.warn(`\n===== 断网测试 #${stats.disconnectCount} =====`));
    networkSimulator.setNetworkType('none');
    
    // 断网期间尝试加载图片
    const disconnectTime = Date.now();
    console.log('网络已断开，尝试请求...');
    
    const disconnectPromises = TEST_CONFIG.IMAGES.map(url => {
      stats.tasksDuringDisconnect++;
      
      return loader.loadImage({ url, timeout: 5000 })
        .then(result => {
          // 断网期间能成功加载（肯定是缓存）
          console.log(color.success(`断网期间命中缓存: ${url}`));
          return { success: true, fromCache: true };
        })
        .catch(error => {
          // 预期失败
          console.log(color.warn(`断网期间预期失败: ${url}`));
          return { success: false, error };
        });
    });
    
    await Promise.all(disconnectPromises);
    
    // 恢复网络
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log(color.info('\n恢复网络连接...'));
    networkSimulator.setNetworkType('4g');
    
    // 等待网络恢复
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 恢复后尝试加载图片
    console.log('网络已恢复，测试恢复能力...');
    
    const recoveryStartTime = Date.now();
    const recoveryPromises = TEST_CONFIG.IMAGES.slice(0, 5).map(url => {
      stats.tasksAfterRecovery++;
      
      return loader.loadImage({ url })
        .then(result => {
          stats.recoverySuccessCount++;
          return { success: true, result };
        })
        .catch(error => {
          console.log(color.error(`恢复后仍然失败: ${url} - ${error.message}`));
          return { success: false, error };
        });
    });
    
    const recoveryResults = await Promise.all(recoveryPromises);
    
    // 计算恢复时间
    const recoveryTime = Date.now() - recoveryStartTime;
    stats.recoveryTimes.push(recoveryTime);
    
    console.log(color.info(`网络恢复测试完成，耗时: ${recoveryTime}ms，成功率: ${
      recoveryResults.filter(r => r.success).length / recoveryResults.length * 100
    }%`));
    
    // 间隔
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 清理
  networkSimulator.stop();
  await loader.destroy();
  
  // 计算平均恢复时间
  const avgRecoveryTime = stats.recoveryTimes.length ? 
    stats.recoveryTimes.reduce((sum, time) => sum + time, 0) / stats.recoveryTimes.length : 
    0;
  
  // 输出结果
  console.log('\n' + color.bold('断网重连恢复能力测试结果:'));
  printResult('断网次数', stats.disconnectCount);
  printResult('断网期间请求数', stats.tasksDuringDisconnect);
  printResult('恢复后请求数', stats.tasksAfterRecovery);
  printResult('恢复后成功数', stats.recoverySuccessCount);
  printResult('平均恢复时间', `${Math.round(avgRecoveryTime)}ms`, avgRecoveryTime < 10000);
  
  // 计算恢复成功率
  const recoveryRate = stats.tasksAfterRecovery > 0 ? 
    (stats.recoverySuccessCount / stats.tasksAfterRecovery) * 100 : 0;
  
  printResult('恢复成功率', `${recoveryRate.toFixed(2)}%`, recoveryRate > 70);
  
  return {
    disconnectCount: stats.disconnectCount,
    recoveryRate: recoveryRate,
    avgRecoveryTime: avgRecoveryTime
  };
}

/**
 * 运行所有网络适应性测试
 */
async function runAllNetworkTests() {
  printTitle('优化图片加载器网络适应性测试');
  
  console.log(color.bold(`开始时间: ${new Date().toLocaleString()}`));
  console.log(color.cyan('测试环境: WeChat 小程序'));
  console.log(color.cyan(`测试持续时间: ${TEST_CONFIG.DURATION / 1000}秒`));
  
  const startTime = Date.now();
  
  // 运行极端弱网测试
  const extremeWeakResults = await testExtremeWeakNetwork();
  
  // 运行断网恢复测试
  const recoveryResults = await testNetworkRecovery();
  
  // 计算总测试时间
  const totalTestTime = (Date.now() - startTime) / 1000;
  
  // 打印总结
  printTitle('网络适应性测试总结');
  console.log(`测试总耗时: ${totalTestTime.toFixed(2)}秒`);
  
  // 极端弱网环境测试评估
  console.log('\n' + color.bold('极端弱网环境表现:'));
  printResult('成功率', `${extremeWeakResults.successRate.toFixed(2)}%`, 
             extremeWeakResults.successRate > 30);
  printResult('平均加载时间', `${Math.round(extremeWeakResults.averageLoadTime)}ms`, 
             extremeWeakResults.averageLoadTime < 5000);
  printResult('连续成功能力', extremeWeakResults.longestConsecutiveSuccess, 
             extremeWeakResults.longestConsecutiveSuccess >= 3);
  
  // 断网恢复能力评估
  console.log('\n' + color.bold('断网恢复能力:'));
  printResult('恢复成功率', `${recoveryResults.recoveryRate.toFixed(2)}%`, 
             recoveryResults.recoveryRate > 70);
  printResult('平均恢复时间', `${Math.round(recoveryResults.avgRecoveryTime)}ms`, 
             recoveryResults.avgRecoveryTime < 10000);
  
  // 整体测试结果评估
  const overallSuccess = (
    extremeWeakResults.successRate > 30 &&
    recoveryResults.recoveryRate > 70 &&
    extremeWeakResults.averageLoadTime < 5000 &&
    recoveryResults.avgRecoveryTime < 10000
  );
  
  if (overallSuccess) {
    console.log('\n' + color.bold(color.green('✓ 网络适应性测试通过')));
    console.log(color.green('图片加载器在极端网络环境和断网恢复场景下表现良好'));
  } else {
    console.log('\n' + color.bold(color.red('✗ 网络适应性测试不通过')));
    console.log(color.red('图片加载器在某些网络环境下性能不佳，需要进一步优化'));
  }
  
  return {
    extremeWeakResults,
    recoveryResults,
    overallSuccess,
    testTime: totalTestTime
  };
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runAllNetworkTests().then(results => {
    console.log('\n网络适应性测试已完成。');
    process.exit(results.overallSuccess ? 0 : 1);
  }).catch(err => {
    console.error('测试执行失败:', err);
    process.exit(1);
  });
}

// 导出测试函数
module.exports = {
  runAllNetworkTests,
  testExtremeWeakNetwork,
  testNetworkRecovery
}; 