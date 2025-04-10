/**
 * 图片加载器极端加载测试
 * 创建日期: 2025-04-11 15:45:23
 * 创建者: Claude AI 3.7 Sonnet
 * 
 * 该文件包含针对图片加载器在极限负载情况下的测试
 * 包括大量并发请求、内存使用分析和稳定性测试
 */

const OptimizedImageLoader = require('../utils/optimized-image-loader');
const MemoryLeakDetector = require('./memory-leak-detector');

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
  // 测试图片组合
  TEST_IMAGES: [
    // 小图片 (10张)
    ...[...Array(10)].map((_, i) => `https://example.com/images/small_${i}.jpg`),
    // 中等图片 (10张)
    ...[...Array(10)].map((_, i) => `https://example.com/images/medium_${i}.jpg`),
    // 大图片 (5张)
    ...[...Array(5)].map((_, i) => `https://example.com/images/large_${i}.jpg`),
    // 超大图片 (2张)
    'https://example.com/images/xlarge_1.jpg',
    'https://example.com/images/xlarge_2.jpg',
    // 不同格式 (3张)
    'https://example.com/images/test.png',
    'https://example.com/images/test.gif',
    'https://example.com/images/test.webp'
  ],
  
  // 极限测试配置
  MAX_CONCURRENT_REQUESTS: 150,   // 最大并发请求数
  TOTAL_REQUESTS: 500,            // 总请求数
  MEMORY_WARNING_THRESHOLD: 150,  // 内存警告阈值(MB)
  STABILITY_DURATION: 60000,      // 稳定性测试持续时间(ms)
  CACHE_SIZE_MB: 30               // 缓存大小(MB)
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
 * 极限并发请求测试
 */
async function testExtremeConcurrency() {
  printSubtitle('极限并发请求测试');
  
  // 初始化内存监控
  const memoryDetector = new MemoryLeakDetector({
    intervalMs: 1000,
    debugLog: false
  });
  memoryDetector.init();
  
  // 创建图片加载器
  const loader = new OptimizedImageLoader({
    maxCacheSize: TEST_CONFIG.CACHE_SIZE_MB * 1024 * 1024,
    logLevel: 'info',
    adaptiveLoadingEnabled: true,
    concurrentLoads: 20  // 设置较高的并发数
  });
  
  // 初始化加载器
  await loader.init();
  console.log('图片加载器初始化完成');
  
  // 统计变量
  const stats = {
    startTime: Date.now(),
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    totalLoadTime: 0,
    maxConcurrent: 0,
    currentConcurrent: 0,
    memorySnapshots: [],
    errors: []
  };
  
  // 获取初始内存使用量
  const initialMemory = await memoryDetector.takeSnapshot();
  stats.memorySnapshots.push(initialMemory);
  console.log(`初始内存使用: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  
  // 准备测试图片列表
  let testUrls = [];
  for (let i = 0; i < TEST_CONFIG.TOTAL_REQUESTS; i++) {
    // 循环使用测试图片
    const index = i % TEST_CONFIG.TEST_IMAGES.length;
    testUrls.push(TEST_CONFIG.TEST_IMAGES[index]);
  }
  
  console.log(`开始加载 ${testUrls.length} 张图片，最大并发数 ${TEST_CONFIG.MAX_CONCURRENT_REQUESTS}...`);
  
  // 定义加载函数
  const loadImage = async (url) => {
    stats.currentConcurrent++;
    stats.maxConcurrent = Math.max(stats.maxConcurrent, stats.currentConcurrent);
    stats.totalRequests++;
    
    try {
      const startTime = Date.now();
      const result = await loader.loadImage({ url });
      const loadTime = Date.now() - startTime;
      
      stats.successRequests++;
      stats.totalLoadTime += loadTime;
      
      if (result.fromCache) {
        stats.cacheHits++;
      }
      
      if (stats.successRequests % 50 === 0) {
        const memoryNow = await memoryDetector.takeSnapshot();
        stats.memorySnapshots.push(memoryNow);
        
        console.log(color.success(
          `已成功加载 ${stats.successRequests}/${stats.totalRequests} 张图片，` +
          `内存: ${(memoryNow.heapUsed / 1024 / 1024).toFixed(2)}MB`
        ));
      }
      
      return result;
    } catch (error) {
      stats.failedRequests++;
      stats.errors.push({ url, error: error.message });
      
      if (stats.failedRequests % 10 === 0) {
        console.log(color.error(`失败累计: ${stats.failedRequests} 个请求`));
      }
      
      return null;
    } finally {
      stats.currentConcurrent--;
    }
  };
  
  // 分批次执行加载
  const batchSize = TEST_CONFIG.MAX_CONCURRENT_REQUESTS;
  const batches = Math.ceil(testUrls.length / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, testUrls.length);
    const batchUrls = testUrls.slice(start, end);
    
    console.log(color.info(`执行第 ${i+1}/${batches} 批，共 ${batchUrls.length} 个请求`));
    
    // 并发加载
    await Promise.all(batchUrls.map(url => loadImage(url)));
    
    // 每批后记录内存
    const memoryNow = await memoryDetector.takeSnapshot();
    stats.memorySnapshots.push(memoryNow);
    
    // 短暂暂停，让系统喘息
    if (i < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 最终内存使用
  const finalMemory = await memoryDetector.takeSnapshot();
  stats.memorySnapshots.push(finalMemory);
  
  // 停止加载器和内存监控
  await loader.destroy();
  memoryDetector.stop();
  
  // 计算统计数据
  const totalDuration = (Date.now() - stats.startTime) / 1000;
  const avgLoadTime = stats.successRequests > 0 ? 
                     stats.totalLoadTime / stats.successRequests : 0;
  const successRate = (stats.successRequests / stats.totalRequests) * 100;
  const cacheHitRate = (stats.cacheHits / stats.successRequests) * 100;
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;
  
  // 输出结果
  console.log('\n' + color.bold('极限并发请求测试结果:'));
  printResult('测试持续时间', `${totalDuration.toFixed(2)}秒`);
  printResult('总请求数', stats.totalRequests);
  printResult('成功请求数', stats.successRequests);
  printResult('失败请求数', stats.failedRequests);
  printResult('最大并发数', stats.maxConcurrent);
  printResult('平均加载时间', `${Math.round(avgLoadTime)}ms`, avgLoadTime < 1000);
  printResult('成功率', `${successRate.toFixed(2)}%`, successRate > 95);
  printResult('缓存命中率', `${cacheHitRate.toFixed(2)}%`);
  
  console.log('\n' + color.bold('内存使用情况:'));
  printResult('初始内存', `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  printResult('最终内存', `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  printResult('内存增长', `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`, 
              memoryIncreasePercent < 100);
  
  // 如果有错误，输出一部分
  if (stats.errors.length > 0) {
    console.log('\n' + color.warn(`发生 ${stats.errors.length} 个错误，显示前5个:`));
    stats.errors.slice(0, 5).forEach((err, i) => {
      console.log(`  ${i+1}. ${err.url}: ${err.error}`);
    });
  }
  
  return {
    successRate,
    avgLoadTime,
    cacheHitRate,
    memoryIncrease: memoryIncrease / 1024 / 1024, // MB
    maxConcurrent: stats.maxConcurrent,
    errorsCount: stats.errors.length
  };
}

/**
 * 长时间稳定性测试
 */
async function testLongRunningStability() {
  printSubtitle('长时间稳定性测试');
  
  // 初始化内存监控
  const memoryDetector = new MemoryLeakDetector({
    intervalMs: 5000,
    debugLog: false
  });
  memoryDetector.init();
  
  // 创建图片加载器
  const loader = new OptimizedImageLoader({
    maxCacheSize: TEST_CONFIG.CACHE_SIZE_MB * 1024 * 1024,
    logLevel: 'info',
    adaptiveLoadingEnabled: true
  });
  
  // 初始化加载器
  await loader.init();
  
  // 统计变量
  const stats = {
    cycleCount: 0,
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    memoryReadings: [],
    startTime: Date.now(),
    cacheSize: []
  };
  
  // 获取内存基准
  const baselineMemory = await memoryDetector.takeSnapshot();
  stats.memoryReadings.push({
    time: 0,
    memory: baselineMemory.heapUsed / 1024 / 1024
  });
  
  // 运行时间
  const endTime = Date.now() + TEST_CONFIG.STABILITY_DURATION;
  
  console.log(`开始长时间稳定性测试，将持续 ${TEST_CONFIG.STABILITY_DURATION/1000} 秒...`);
  
  // 持续加载直到时间结束
  while (Date.now() < endTime) {
    stats.cycleCount++;
    
    // 在每个循环中加载不同数量的图片
    const batchSize = 5 + (stats.cycleCount % 10); // 5-14张图片
    
    console.log(color.info(`周期 #${stats.cycleCount}，加载 ${batchSize} 张图片`));
    
    // 选择要加载的图片
    const imagesToLoad = [];
    for (let i = 0; i < batchSize; i++) {
      const randomIndex = Math.floor(Math.random() * TEST_CONFIG.TEST_IMAGES.length);
      imagesToLoad.push(TEST_CONFIG.TEST_IMAGES[randomIndex]);
    }
    
    // 并发加载
    const loadPromises = imagesToLoad.map(url => {
      stats.totalRequests++;
      
      return loader.loadImage({ url })
        .then(result => {
          stats.successRequests++;
          return result;
        })
        .catch(err => {
          stats.failedRequests++;
          return { error: err };
        });
    });
    
    await Promise.all(loadPromises);
    
    // 记录内存使用
    const currentMemory = await memoryDetector.takeSnapshot();
    const elapsedTime = (Date.now() - stats.startTime) / 1000;
    
    stats.memoryReadings.push({
      time: elapsedTime,
      memory: currentMemory.heapUsed / 1024 / 1024
    });
    
    // 获取当前缓存大小
    const cacheInfo = loader.getCacheInfo ? loader.getCacheInfo() : { totalSize: 0 };
    stats.cacheSize.push({
      time: elapsedTime,
      size: cacheInfo.totalSize / 1024 / 1024
    });
    
    // 输出状态
    if (stats.cycleCount % 5 === 0) {
      console.log(color.success(
        `已完成 ${stats.cycleCount} 个周期，成功率: ${
          (stats.successRequests / stats.totalRequests * 100).toFixed(1)
        }%，内存: ${currentMemory.heapUsed / 1024 / 1024.toFixed(2)}MB`
      ));
    }
    
    // 随机等待一段时间
    const waitTime = 500 + Math.random() * 1500;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // 最终内存
  const finalMemory = await memoryDetector.takeSnapshot();
  
  // 停止加载器和内存监控
  await loader.destroy();
  memoryDetector.stop();
  
  // 计算统计数据
  const totalDuration = (Date.now() - stats.startTime) / 1000;
  const successRate = (stats.successRequests / stats.totalRequests) * 100;
  
  // 内存增长率
  const initialMemory = stats.memoryReadings[0].memory;
  const finalMemoryMB = finalMemory.heapUsed / 1024 / 1024;
  const memoryIncrease = finalMemoryMB - initialMemory;
  const memoryIncreaseRate = memoryIncrease / totalDuration; // MB/s
  
  // 检查内存是否线性增长（内存泄漏的迹象）
  let isMemoryStable = true;
  if (stats.memoryReadings.length >= 10) {
    // 取第一个10%和最后10%的平均值比较
    const sampleSize = Math.max(1, Math.floor(stats.memoryReadings.length * 0.1));
    
    const firstReadings = stats.memoryReadings.slice(0, sampleSize);
    const lastReadings = stats.memoryReadings.slice(-sampleSize);
    
    const firstAvg = firstReadings.reduce((sum, r) => sum + r.memory, 0) / firstReadings.length;
    const lastAvg = lastReadings.reduce((sum, r) => sum + r.memory, 0) / lastReadings.length;
    
    // 如果内存增长超过50%，且持续上升，可能有泄漏
    isMemoryStable = (lastAvg - firstAvg) / firstAvg < 0.5;
  }
  
  // 输出结果
  console.log('\n' + color.bold('长时间稳定性测试结果:'));
  printResult('测试持续时间', `${totalDuration.toFixed(2)}秒`);
  printResult('循环周期数', stats.cycleCount);
  printResult('总请求数', stats.totalRequests);
  printResult('成功请求数', stats.successRequests);
  printResult('失败请求数', stats.failedRequests);
  printResult('成功率', `${successRate.toFixed(2)}%`, successRate > 95);
  
  console.log('\n' + color.bold('内存使用情况:'));
  printResult('初始内存', `${initialMemory.toFixed(2)}MB`);
  printResult('最终内存', `${finalMemoryMB.toFixed(2)}MB`);
  printResult('内存增长', `${memoryIncrease.toFixed(2)}MB`);
  printResult('内存增长率', `${memoryIncreaseRate.toFixed(4)}MB/秒`, memoryIncreaseRate < 0.05);
  printResult('内存稳定性', isMemoryStable ? '稳定' : '不稳定（可能存在泄漏）', isMemoryStable);
  
  return {
    successRate,
    memoryIncrease,
    memoryIncreaseRate,
    isMemoryStable,
    totalRequests: stats.totalRequests,
    cycleCount: stats.cycleCount
  };
}

/**
 * 运行所有极端加载测试
 */
async function runAllExtremeLoadTests() {
  printTitle('图片加载器极端加载测试');
  
  console.log(color.bold(`开始时间: ${new Date().toLocaleString()}`));
  console.log(color.cyan('测试环境: WeChat 小程序'));
  
  const startTime = Date.now();
  
  // 运行极限并发测试
  const concurrencyResults = await testExtremeConcurrency();
  
  // 运行长时间稳定性测试
  const stabilityResults = await testLongRunningStability();
  
  // 计算总测试时间
  const totalTestTime = (Date.now() - startTime) / 1000;
  
  // 打印总结
  printTitle('极端加载测试总结');
  console.log(`测试总耗时: ${totalTestTime.toFixed(2)}秒`);
  
  // 整体测试结果评估
  const overallSuccess = (
    concurrencyResults.successRate > 90 &&
    stabilityResults.successRate > 90 &&
    concurrencyResults.avgLoadTime < 2000 &&
    stabilityResults.isMemoryStable
  );
  
  // 极限并发测试评估
  console.log('\n' + color.bold('极限并发表现:'));
  printResult('成功率', `${concurrencyResults.successRate.toFixed(2)}%`, 
             concurrencyResults.successRate > 90);
  printResult('平均加载时间', `${Math.round(concurrencyResults.avgLoadTime)}ms`, 
             concurrencyResults.avgLoadTime < 2000);
  printResult('内存增长', `${concurrencyResults.memoryIncrease.toFixed(2)}MB`, 
             concurrencyResults.memoryIncrease < 50);
  
  // 稳定性测试评估
  console.log('\n' + color.bold('长时间稳定性:'));
  printResult('成功率', `${stabilityResults.successRate.toFixed(2)}%`, 
             stabilityResults.successRate > 90);
  printResult('内存增长率', `${stabilityResults.memoryIncreaseRate.toFixed(4)}MB/秒`, 
             stabilityResults.memoryIncreaseRate < 0.05);
  printResult('内存稳定性', stabilityResults.isMemoryStable ? '稳定' : '不稳定', 
             stabilityResults.isMemoryStable);
  
  if (overallSuccess) {
    console.log('\n' + color.bold(color.green('✓ 极端加载测试通过')));
    console.log(color.green('图片加载器在极端负载和长时间运行情况下表现良好'));
  } else {
    console.log('\n' + color.bold(color.red('✗ 极端加载测试不通过')));
    console.log(color.red('图片加载器在极端条件下性能不佳，需要进一步优化'));
  }
  
  return {
    concurrencyResults,
    stabilityResults,
    overallSuccess,
    testTime: totalTestTime
  };
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runAllExtremeLoadTests().then(results => {
    console.log('\n极端加载测试已完成。');
    process.exit(results.overallSuccess ? 0 : 1);
  }).catch(err => {
    console.error('测试执行失败:', err);
    process.exit(1);
  });
}

// 导出测试函数
module.exports = {
  runAllExtremeLoadTests,
  testExtremeConcurrency,
  testLongRunningStability
}; 