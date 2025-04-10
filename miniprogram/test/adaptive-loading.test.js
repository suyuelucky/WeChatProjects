/**
 * 自适应图片加载测试
 * 创建日期: 2025-04-09 15:27:43
 * 创建者: Claude AI 3.7 Sonnet
 */

// 设置测试环境
process.env.NODE_ENV = 'test';

// 导入必要模块
const OptimizedImageLoader = require('../utils/optimized-image-loader');
const AdaptiveLoadingStrategy = require('../utils/adaptive-loading-strategy');
const { mockWxAPI, cleanupMocks } = require('./mock/wx-api-mock');

// 测试用图片
const TEST_IMAGES = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.png',
  'https://example.com/image3.webp',
  'https://example.com/image4.jpg',
  'https://example.com/largefile.jpg',
];

// 控制台输出颜色
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 打印标题
function printTitle(title) {
  console.log(`\n${colors.magenta}======================================`);
  console.log(`🔄 ${title}`);
  console.log(`======================================${colors.reset}`);
}

// 打印子标题
function printSubTitle(title) {
  console.log(`\n${colors.cyan}--------------------------------------`);
  console.log(`✅ ${title}`);
  console.log(`--------------------------------------${colors.reset}`);
}

// 打印结果
function printResult(label, value, isSuccess = true) {
  const color = isSuccess ? colors.green : colors.red;
  console.log(`${color}${label}: ${value}${colors.reset}`);
}

/**
 * 模拟网络环境
 * @param {string} networkType - 网络类型
 */
function mockNetworkEnvironment(networkType) {
  // 模拟微信网络API
  global.wx.getNetworkType = jest.fn().mockImplementation(({ success }) => {
    success({ networkType });
  });
  
  // 触发网络变化事件
  global.wx.onNetworkStatusChange = jest.fn();
  const callbacks = [];
  global.wx.onNetworkStatusChange.mockImplementation((callback) => {
    callbacks.push(callback);
    return callback;
  });
  
  // 返回一个函数，用于触发网络变化事件
  return (newNetworkType) => {
    callbacks.forEach(callback => callback({ 
      isConnected: newNetworkType !== 'none', 
      networkType: newNetworkType 
    }));
  };
}

/**
 * 测试不同网络环境下的加载性能
 */
async function testNetworkConditions() {
  printTitle('测试不同网络环境下的加载性能');
  
  // 模拟微信API
  mockWxAPI();
  
  // 创建自定义日志记录器
  const logs = [];
  const customLogger = (level, message) => {
    logs.push({ level, message, timestamp: Date.now() });
  };
  
  // 初始化图片加载器（启用自适应加载）
  const imageLoader = new OptimizedImageLoader({
    enableAdaptiveLoading: true,
    logger: customLogger,
    maxCacheSize: 20 * 1024 * 1024, // 20MB
    adaptiveOptions: {
      logLevel: 'debug',
    }
  });
  
  // 获取网络变化触发器
  const triggerNetworkChange = mockNetworkEnvironment('wifi');
  
  // 测试不同网络条件下的加载
  const networkTypes = ['wifi', '5g', '4g', '3g', '2g', 'none'];
  const results = {};
  
  for (const networkType of networkTypes) {
    printSubTitle(`测试 ${networkType} 网络环境`);
    
    // 清空日志
    logs.length = 0;
    
    // 切换网络环境
    triggerNetworkChange(networkType);
    
    // 等待策略更新
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 加载测试图片
    const startTime = Date.now();
    const loadResults = [];
    
    for (const url of TEST_IMAGES) {
      try {
        const result = await imageLoader.loadImage(url);
        loadResults.push({
          url,
          success: true,
          loadTime: result.loadTime,
          fromCache: result.fromCache,
          width: result.width,
          height: result.height,
        });
      } catch (error) {
        loadResults.push({
          url,
          success: false,
          error: error.message,
        });
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // 计算成功率和平均加载时间
    const successCount = loadResults.filter(r => r.success).length;
    const successRate = (successCount / TEST_IMAGES.length) * 100;
    const avgLoadTime = loadResults.filter(r => r.success)
      .reduce((sum, r) => sum + r.loadTime, 0) / successCount || 0;
    
    // 分析应用的自适应策略
    const strategyLogs = logs.filter(log => 
      log.message.includes('网络环境变化') || 
      log.message.includes('已应用自适应策略调整')
    );
    
    // 记录结果
    results[networkType] = {
      successRate,
      avgLoadTime,
      totalTime,
      strategyApplied: strategyLogs.length > 0,
      successCount,
      failCount: TEST_IMAGES.length - successCount,
    };
    
    // 打印结果
    printResult('成功率', `${successRate.toFixed(2)}%`, successRate > 0);
    printResult('平均加载时间', `${avgLoadTime.toFixed(2)}ms`, avgLoadTime < 1000);
    printResult('总加载时间', `${totalTime}ms`, totalTime < 5000);
    printResult('应用自适应策略', strategyLogs.length > 0);
    
    if (strategyLogs.length > 0) {
      console.log(`${colors.cyan}应用的策略:${colors.reset}`);
      strategyLogs.forEach(log => {
        console.log(`  - ${log.message}`);
      });
    }
    
    // 打印每个图片的加载结果
    console.log(`\n${colors.yellow}图片加载详情:${colors.reset}`);
    loadResults.forEach(result => {
      const statusColor = result.success ? colors.green : colors.red;
      const status = result.success ? '成功' : '失败';
      const details = result.success
        ? `${result.loadTime}ms, 缓存: ${result.fromCache ? '是' : '否'}`
        : `错误: ${result.error}`;
      console.log(`  ${statusColor}[${status}]${colors.reset} ${result.url} - ${details}`);
    });
    
    // 添加间隔，避免网络状态更新冲突
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 比较不同网络条件下的性能
  printSubTitle('不同网络环境性能对比');
  console.log(colors.yellow + '网络类型\t成功率\t平均加载时间\t总时间' + colors.reset);
  
  for (const [type, data] of Object.entries(results)) {
    const color = data.successRate > 50 ? colors.green : colors.red;
    console.log(`${color}${type}\t${data.successRate.toFixed(2)}%\t${data.avgLoadTime.toFixed(2)}ms\t${data.totalTime}ms${colors.reset}`);
  }
  
  // 清理
  imageLoader.destroy();
  cleanupMocks();
}

/**
 * 测试网络状态变化响应
 */
async function testNetworkTransitions() {
  printTitle('测试网络状态变化响应');
  
  // 模拟微信API
  mockWxAPI();
  
  // 创建日志记录器
  const logs = [];
  const customLogger = (level, message, data) => {
    logs.push({ level, message, data, timestamp: Date.now() });
  };
  
  // 初始化图片加载器
  const imageLoader = new OptimizedImageLoader({
    enableAdaptiveLoading: true,
    logger: customLogger,
    adaptiveOptions: {
      logLevel: 'debug',
      // 自定义网络配置
      networkStrategies: {
        wifi: {
          quality: { quality: 0.9, maxWidth: 0, maxHeight: 0 },
          preload: { enablePreload: true, preloadDepth: 3, maxConcurrent: 5 },
          retry: { maxRetries: 1, retryInterval: 500 }
        },
        '3g': {
          quality: { quality: 0.7, maxWidth: 800, maxHeight: 800 },
          preload: { enablePreload: false, preloadDepth: 0, maxConcurrent: 2 },
          retry: { maxRetries: 3, retryInterval: 1500 }
        }
      }
    }
  });
  
  // 获取网络变化触发器
  const triggerNetworkChange = mockNetworkEnvironment('wifi');
  
  // 测试网络状态变化序列
  const networkSequence = [
    { type: 'wifi', delay: 1000 },
    { type: '4g', delay: 1000 },
    { type: '3g', delay: 1000 },
    { type: '2g', delay: 1000 },
    { type: 'none', delay: 1000 },
    { type: '4g', delay: 1000 },
    { type: 'wifi', delay: 1000 },
  ];
  
  printSubTitle('模拟网络状态变化序列');
  console.log(`${colors.yellow}将按顺序切换以下网络状态: ${networkSequence.map(n => n.type).join(' -> ')}${colors.reset}\n`);
  
  // 执行网络切换序列
  for (const { type, delay } of networkSequence) {
    console.log(`${colors.cyan}切换到网络: ${type}${colors.reset}`);
    triggerNetworkChange(type);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // 分析策略变化日志
  const strategyChangeLogs = logs.filter(log => 
    log.message.includes('网络环境变化') || 
    log.message.includes('网络状态已变更')
  );
  
  printSubTitle('网络状态变化响应分析');
  printResult('策略变化次数', strategyChangeLogs.length, strategyChangeLogs.length >= networkSequence.length - 1);
  
  console.log(`\n${colors.yellow}策略变化日志:${colors.reset}`);
  strategyChangeLogs.forEach((log, index) => {
    console.log(`  ${index + 1}. ${log.message}`);
  });
  
  // 测试在网络变化过程中加载图片
  printSubTitle('在网络变化期间加载图片');
  
  // 先设置到WiFi
  triggerNetworkChange('wifi');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 开始加载第一张图片
  const loadPromise1 = imageLoader.loadImage(TEST_IMAGES[0]);
  
  // 改变网络状态到2G
  triggerNetworkChange('2g');
  
  // 开始加载第二张图片
  const loadPromise2 = imageLoader.loadImage(TEST_IMAGES[1]);
  
  // 改变网络状态到无网络
  triggerNetworkChange('none');
  
  // 尝试加载第三张图片（应该失败）
  const loadPromise3 = imageLoader.loadImage(TEST_IMAGES[2]);
  
  // 恢复网络到4G
  triggerNetworkChange('4g');
  
  // 等待所有加载完成或失败
  const results = await Promise.allSettled([loadPromise1, loadPromise2, loadPromise3]);
  
  console.log(`\n${colors.yellow}网络切换期间的图片加载结果:${colors.reset}`);
  results.forEach((result, index) => {
    const statusColor = result.status === 'fulfilled' ? colors.green : colors.red;
    const status = result.status === 'fulfilled' ? '成功' : '失败';
    const details = result.status === 'fulfilled'
      ? `加载时间: ${result.value.loadTime}ms, 缓存: ${result.value.fromCache ? '是' : '否'}`
      : `错误: ${result.reason?.message || '未知错误'}`;
    
    console.log(`  ${statusColor}[${status}]${colors.reset} ${TEST_IMAGES[index]} - ${details}`);
  });
  
  // 清理
  imageLoader.destroy();
  cleanupMocks();
}

/**
 * 主函数
 */
async function main() {
  const startTime = Date.now();
  
  try {
    // 执行测试
    await testNetworkConditions();
    await testNetworkTransitions();
    
    const totalTime = Date.now() - startTime;
    printTitle('测试完成');
    printResult('总耗时', `${totalTime}ms`);
    printResult('测试状态', '所有测试已完成');
  } catch (error) {
    console.error(`${colors.red}测试失败:${colors.reset}`, error);
  }
}

// 运行测试
main().catch(console.error); 