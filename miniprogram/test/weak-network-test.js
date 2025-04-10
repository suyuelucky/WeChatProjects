/**
 * 优化图片加载器 - 弱网环境测试
 * 创建日期: 2025-04-13 16:50:23
 * 创建者: Claude AI 3.7 Sonnet
 */

// 设置测试环境
process.env.NODE_ENV = 'test';

// 导入模块
const NetworkFluctuationSimulator = require('./utils/network-fluctuation-simulator');
const OptimizedImageLoader = require('../utils/optimized-image-loader');

// 控制台颜色
const color = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// 测试配置
const TEST_CONFIG = {
  DURATION: 60000, // 测试时长（毫秒）
  SUCCESS_THRESHOLD: 50, // 成功率阈值（百分比）
  MAX_LOAD_TIME: 3000, // 最大平均加载时间（毫秒）
  TEST_IMAGES: Array(30).fill().map((_, i) => `https://example.com/test-${i}.jpg`)
};

/**
 * 打印标题
 * @param {String} text 标题文本
 */
function printTitle(text) {
  console.log('\n' + color.bright + color.cyan + 
             '===========================================' + 
             color.reset);
  console.log(color.bright + color.cyan + text + color.reset);
  console.log(color.bright + color.cyan + 
             '===========================================' + 
             color.reset);
}

/**
 * 打印子标题
 * @param {String} text 子标题文本
 */
function printSubtitle(text) {
  console.log('\n' + color.bright + color.magenta + text + color.reset);
  console.log(color.magenta + '------------------------------------------' + color.reset);
}

/**
 * 打印测试结果
 * @param {String} label 结果标签
 * @param {String|Number} value 结果值
 * @param {Boolean} isSuccess 是否成功
 */
function printResult(label, value, isSuccess) {
  const indicator = isSuccess ? color.green + '✓' : color.red + '✗';
  console.log(indicator + color.reset + ' ' + label + ': ' + 
             (isSuccess ? color.green : color.red) + value + color.reset);
}

/**
 * 测试极弱网环境下图片加载
 */
async function testExtremeWeakNetwork() {
  printSubtitle('极端弱网环境测试');
  
  // 创建极端网络波动模拟器
  const networkSimulator = new NetworkFluctuationSimulator({
    TIMEOUT_PERCENTAGE: 80,       // 80%请求超时
    SLOW_RESPONSE_PERCENTAGE: 90, // 90%慢响应
    MAX_DELAY: 15000,             // 最大延迟15秒
    DISCONNECT_INTERVAL: 8000,    // 每8秒断网一次
    RECONNECT_DELAY: 5000,        // 断网后5秒重连
    RANDOM_ERROR_RATE: 0.3        // 30%随机错误率
  });
  
  // 创建图片加载器
  const loader = new OptimizedImageLoader({
    maxCacheSize: 20 * 1024 * 1024,
    logLevel: 'info',
    adaptiveLoadingEnabled: true,
    weakNetworkMaxRetries: 8,
    weakNetworkQuality: 70,
    weakNetworkMaxWidth: 640,
    weakNetworkMaxHeight: 640
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
  const testEndTime = Date.now() + TEST_CONFIG.DURATION;
  let currentIndex = 0;
  
  while (Date.now() < testEndTime) {
    // 选择测试图片
    const imageUrl = TEST_CONFIG.TEST_IMAGES[currentIndex % TEST_CONFIG.TEST_IMAGES.length];
    currentIndex++;
    
    stats.totalRequests++;
    
    try {
      console.log(`[${stats.totalRequests}] 加载图片: ${imageUrl}`);
      
      // 记录开始时间
      const startTime = Date.now();
      
      // 加载图片
      const result = await loader.loadImage(imageUrl, {
        timeout: 10000
      });
      
      // 计算加载时间
      const loadTime = Date.now() - startTime;
      
      // 更新统计
      stats.successRequests++;
      stats.consecutiveSuccesses++;
      stats.loadTimes.push(loadTime);
      
      // 更新最长连续成功次数
      if (stats.consecutiveSuccesses > stats.longestConsecutiveSuccess) {
        stats.longestConsecutiveSuccess = stats.consecutiveSuccesses;
      }
      
      console.log(`✓ 成功加载图片 [${loadTime}ms] ${result.fromCache ? '(缓存)' : ''}`);
      
      // 检查加载时间
      if (loadTime > stats.maxLoadTime) {
        stats.maxLoadTime = loadTime;
      }
      
      // 每5次请求后暂停一下，防止测试过于密集
      if (stats.totalRequests % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      // 失败处理
      stats.failedRequests++;
      stats.consecutiveSuccesses = 0;
      
      // 检查是否是超时
      if (error.message && error.message.includes('timeout')) {
        stats.timeoutCount++;
        console.log(`✗ 图片加载超时: ${error.message}`);
      } else {
        console.log(`✗ 图片加载失败: ${error.message}`);
      }
      
      // 增加重试统计
      if (error.retryCount) {
        stats.retryCount += error.retryCount;
      }
      
      // 失败后暂停一下
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // 计算平均加载时间
  if (stats.loadTimes.length > 0) {
    stats.averageLoadTime = stats.loadTimes.reduce((a, b) => a + b, 0) / stats.loadTimes.length;
  }
  
  // 停止网络波动模拟
  networkSimulator.stop();
  
  // 打印测试结果
  console.log('\n测试结束，总耗时: ' + (Date.now() - stats.startTime) + 'ms');
  printResult('总请求数', stats.totalRequests);
  printResult('成功请求数', stats.successRequests);
  printResult('失败请求数', stats.failedRequests);
  printResult('超时请求数', stats.timeoutCount);
  printResult('平均加载时间', `${Math.round(stats.averageLoadTime)}ms`, 
             stats.averageLoadTime < TEST_CONFIG.MAX_LOAD_TIME);
  printResult('最长加载时间', `${Math.round(stats.maxLoadTime)}ms`);
  printResult('重试次数', stats.retryCount);
  printResult('最长连续成功', stats.longestConsecutiveSuccess);
  
  // 计算成功率
  const successRate = (stats.successRequests / stats.totalRequests) * 100;
  
  // 测试结果评估
  console.log('\n' + color.bright + '弱网测试总结:');
  printResult('弱网成功率', `${successRate.toFixed(2)}%`, 
             successRate > TEST_CONFIG.SUCCESS_THRESHOLD);
  printResult('平均加载性能', `${Math.round(stats.averageLoadTime)}ms`, 
             stats.averageLoadTime < TEST_CONFIG.MAX_LOAD_TIME);
  
  return {
    successRate,
    averageLoadTime: stats.averageLoadTime,
    maxLoadTime: stats.maxLoadTime,
    totalRequests: stats.totalRequests,
    retryCount: stats.retryCount
  };
}

/**
 * 主测试函数
 */
async function runTest() {
  printTitle('优化图片加载器 - 弱网环境测试');
  console.log('测试时间: ' + new Date().toLocaleString());
  console.log('测试环境: NODE_ENV=' + process.env.NODE_ENV);
  console.log('测试时长: ' + (TEST_CONFIG.DURATION / 1000) + '秒\n');
  
  const startTime = Date.now();
  const results = await testExtremeWeakNetwork();
  const endTime = Date.now();
  
  printTitle('测试总结');
  console.log('总耗时: ' + ((endTime - startTime) / 1000).toFixed(2) + '秒');
  
  // 测试通过/失败判断
  const passed = results.successRate > TEST_CONFIG.SUCCESS_THRESHOLD && 
                results.averageLoadTime < TEST_CONFIG.MAX_LOAD_TIME;
  
  console.log('\n测试' + (passed ? 
              color.green + '通过' : 
              color.red + '失败') + color.reset);
  
  return passed;
}

// 执行测试
runTest().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(error => {
  console.error('测试执行错误:', error);
  process.exit(1);
}); 