/**
 * run-memory-tests.js
 * B1模块内存泄漏测试执行脚本
 * 
 * 创建时间: 2025-04-09 21:55:21
 * 创建者: Claude AI 3.7 Sonnet
 */

// 设置测试环境
process.env.NODE_ENV = 'test';

const MemoryLeakDetector = require('./memory-leak-detector');
const OptimizedImageLoader = require('../utils/optimized-image-loader');

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m"
};

// 打印标题
function printTitle(title) {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(80));
  console.log(' ' + title);
  console.log('='.repeat(80) + colors.reset + '\n');
}

// 打印结果
function printResult(success, message) {
  console.log(
    (success ? colors.green + '✓ 通过: ' : colors.red + '✗ 失败: ') +
    message + colors.reset
  );
}

/**
 * 运行基本内存泄漏测试 - 验证内存稳定性
 */
async function runBasicMemoryTests() {
  printTitle('基本内存泄漏测试');
  
  // 初始化图片加载器
  OptimizedImageLoader.init({
    thumbnailSize: 200,
    concurrentLoads: 2,
    retryCount: 1,
    debug: true
  });
  
  // 创建测试图片URL数组 - 5张图片，重复10轮
  const testImages = Array.from({ length: 5 }, (_, i) => 
    `https://example.com/test/memory-test-${i+1}.jpg`
  );
  
  // 运行内存泄漏测试
  const result = await MemoryLeakDetector.init({
    testImages: testImages,
    repetitions: 10,
    verbose: true
  }).runLeakTest({
    clearBetweenRounds: true
  });
  
  printResult(result.success, `内存稳定性测试${result.success ? '通过' : '失败'}`);
  
  return result;
}

/**
 * 运行极限内存测试 - 大量图片加载
 */
async function runExtremeMemoryTests() {
  printTitle('极限内存测试 - 加载100张图片');
  
  // 重置图片加载器
  OptimizedImageLoader.init({
    thumbnailSize: 150,  // 更小的缩略图，节省内存
    concurrentLoads: 3,
    retryCount: 1,
    debug: true
  });
  
  // 创建大量测试图片
  const extremeTestImages = Array.from({ length: 100 }, (_, i) => 
    `https://example.com/test/extreme-memory-test-${i+1}.jpg`
  );
  
  // 清理缓存，准备测试
  await OptimizedImageLoader.clearCache(true);
  
  // 记录起始时间
  const startTime = Date.now();
  
  // 运行内存泄漏测试 - 更多图片，更少重复次数
  const result = await MemoryLeakDetector.init({
    testImages: extremeTestImages,
    repetitions: 2,  // 只需要执行两轮
    maxMemoryMB: 150 // 验收标准要求
  }).runLeakTest({
    clearBetweenRounds: true
  });
  
  // 记录完成时间
  const duration = Date.now() - startTime;
  
  printResult(result.success, `极限内存测试${result.success ? '通过' : '失败'} (耗时: ${duration/1000}秒)`);
  
  return result;
}

/**
 * 运行无缓存清理测试 - 测试内存积累问题
 */
async function runNoClearingTest() {
  printTitle('无缓存清理测试 - 检查内存积累');
  
  // 重置图片加载器
  OptimizedImageLoader.init({
    thumbnailSize: 180,
    concurrentLoads: 2,
    retryCount: 1,
    debug: true
  });
  
  // 创建测试图片
  const testImages = Array.from({ length: 15 }, (_, i) => 
    `https://example.com/test/no-clear-test-${i+1}.jpg`
  );
  
  // 运行内存泄漏测试 - 不清理缓存
  const result = await MemoryLeakDetector.init({
    testImages: testImages,
    repetitions: 5,
    leakThresholdMB: 10 // 更高的阈值，允许一定程度的内存增长
  }).runLeakTest({
    clearBetweenRounds: false // 不清理缓存
  });
  
  // 内存应该稳定增长然后停止 - 如果无限增长，测试将失败
  printResult(result.success, `无缓存清理测试${result.success ? '通过' : '失败'}`);
  
  return result;
}

/**
 * 运行大图测试 - 测试大图处理的内存影响
 */
async function runLargeImageTest() {
  printTitle('大图处理测试');
  
  // 设置为处理大图的配置
  OptimizedImageLoader.init({
    thumbnailSize: 300,
    previewSize: 1200,
    concurrentLoads: 1, // 减少并发，避免内存峰值过高
    debug: true
  });
  
  // 大图测试集
  const largeImages = [
    'https://example.com/test/large-image-1-4000x3000.jpg',
    'https://example.com/test/large-image-2-5000x4000.jpg',
    'https://example.com/test/large-image-3-6000x4000.jpg'
  ];
  
  // 运行内存泄漏测试
  const result = await MemoryLeakDetector.init({
    testImages: largeImages,
    repetitions: 3,
    maxMemoryMB: 150
  }).runLeakTest({
    thumbnails: true, // 使用缩略图模式
    clearBetweenRounds: true
  });
  
  printResult(result.success, `大图处理测试${result.success ? '通过' : '失败'}`);
  
  return result;
}

/**
 * 主测试函数 - 运行所有内存测试
 */
async function main() {
  try {
    console.log(colors.yellow + colors.bright + '\n内存泄漏测试开始执行...\n' + colors.reset);
    
    // 记录起始时间
    const startTime = Date.now();
    
    // 运行测试套件
    const basicResult = await runBasicMemoryTests();
    const extremeResult = await runExtremeMemoryTests();
    const noClearResult = await runNoClearingTest();
    const largeImageResult = await runLargeImageTest();
    
    // 计算总耗时
    const totalDuration = (Date.now() - startTime) / 1000;
    
    // 汇总结果
    const allResults = [basicResult, extremeResult, noClearResult, largeImageResult];
    const passedCount = allResults.filter(r => r.success).length;
    
    // 打印总结
    printTitle('测试结果总结');
    console.log(`通过测试: ${passedCount}/${allResults.length}`);
    console.log(`总耗时: ${totalDuration.toFixed(2)}秒`);
    
    // 内存验收情况
    const passVerification = passedCount === allResults.length;
    console.log('\n内存验收状态: ' + 
      (passVerification 
        ? colors.green + '通过 ✓' 
        : colors.red + '未通过 ✗'
      ) + colors.reset
    );
    
    if (!passVerification) {
      console.log(colors.yellow + '\n需要修复的问题:' + colors.reset);
      if (!basicResult.success) console.log('- 基本内存泄漏问题');
      if (!extremeResult.success) console.log('- 大量图片加载时内存过高');
      if (!noClearResult.success) console.log('- 缓存管理不当导致内存积累');
      if (!largeImageResult.success) console.log('- 大图处理内存占用过高');
    }
    
    return passVerification;
  } catch (error) {
    console.error(colors.red + '测试执行过程中出错:' + colors.reset, error);
    return false;
  }
}

// 执行测试
main().then(success => {
  // 显示结束信息
  console.log('\n' + colors.cyan + '测试执行完成.' + colors.reset);
  
  // 在测试环境中，可以设置退出码
  if (typeof process !== 'undefined') {
    process.exit(success ? 0 : 1);
  }
}).catch(err => {
  console.error(colors.red + '测试脚本执行错误:' + colors.reset, err);
  if (typeof process !== 'undefined') {
    process.exit(1);
  }
}); 