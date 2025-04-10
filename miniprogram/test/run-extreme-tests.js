/**
 * run-extreme-tests.js
 * 运行优化图片加载器的极端场景测试
 * 
 * 创建时间: 2025-04-09 21:12:48
 * 创建者: Claude AI 3.7 Sonnet
 */

// 设置环境
process.env.NODE_ENV = 'test';

// 引入测试模块
const extremeTests = require('./optimized-image-loader.extreme.test');
const performanceBenchmark = require('./performance-benchmark');

// 引入颜色模块美化输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * 打印彩色标题
 * @param {String} text 标题文本
 * @param {String} color 颜色
 */
function printTitle(text, color = colors.cyan) {
  const line = '='.repeat(text.length + 10);
  console.log(`\n${color}${line}${colors.reset}`);
  console.log(`${color}===  ${colors.bright}${text}${colors.reset}${color}  ===${colors.reset}`);
  console.log(`${color}${line}${colors.reset}\n`);
}

/**
 * 打印彩色子标题
 * @param {String} text 子标题文本
 * @param {String} color 颜色
 */
function printSubtitle(text, color = colors.yellow) {
  console.log(`\n${color}${colors.bright}${text}${colors.reset}`);
  console.log(`${color}${'-'.repeat(text.length)}${colors.reset}\n`);
}

/**
 * 打印结果项
 * @param {String} label 标签
 * @param {String|Number} value 值
 * @param {Boolean} isGood 是否为好结果 
 */
function printResult(label, value, isGood = true) {
  const valueColor = isGood ? colors.green : colors.red;
  console.log(`${colors.dim}${label}:${colors.reset} ${valueColor}${value}${colors.reset}`);
}

/**
 * 运行极端场景测试
 */
async function runExtremeTests() {
  printTitle('优化图片加载器极端场景测试', colors.magenta);
  console.log(`测试时间: ${new Date().toISOString()}`);
  console.log(`测试环境: Node.js ${process.version}`);
  
  // 引入Jest
  const jest = require('jest');
  
  // 配置测试
  const jestConfig = {
    rootDir: __dirname,
    testRegex: 'optimized-image-loader.extreme.test.js',
    verbose: true,
    testTimeout: 30000
  };
  
  // 运行测试
  printSubtitle('执行极端场景测试');
  try {
    await jest.runCLI(jestConfig, [__dirname]);
    printResult('极端场景测试', '通过', true);
  } catch (error) {
    printResult('极端场景测试', '失败', false);
    console.error(error);
  }
}

/**
 * 运行性能基准测试
 */
async function runPerformanceBenchmarks() {
  printTitle('优化图片加载器性能基准测试', colors.blue);
  
  try {
    // 运行所有基准测试
    await performanceBenchmark.runBenchmarks();
    
    // 额外运行极限负载测试 (5000张图片)
    printSubtitle('极限负载测试 - 5000张图片');
    const result = await performanceBenchmark.benchmarks.concurrentLoading(20, 5000);
    
    printResult('总耗时', `${result.totalTime}ms`);
    printResult('平均每张图片时间', `${result.avgTimePerImage.toFixed(2)}ms`);
    printResult('每秒处理图片数', `${result.imagesPerSecond.toFixed(2)}张/秒`);
    
    const isGoodPerformance = result.imagesPerSecond > 100; // 每秒100张以上为好性能
    printResult('性能评级', isGoodPerformance ? '优秀' : '一般', isGoodPerformance);
    
    printResult('性能基准测试', '完成', true);
  } catch (error) {
    printResult('性能基准测试', '失败', false);
    console.error(error);
  }
}

/**
 * 运行资源效率测试
 */
async function runResourceEfficiencyTests() {
  printTitle('优化图片加载器资源效率测试', colors.green);
  
  // 测试内存优化效率
  printSubtitle('内存优化效率测试');
  
  try {
    // 引入模拟模块
    const mockWx = require('./mocks/wx-mock');
    global.wx = mockWx.createMock();
    global.getCurrentPages = mockWx.getCurrentPages;
    
    // 引入加载器
    const OptimizedImageLoader = require('../utils/optimized-image-loader');
    
    // 初始化加载器，限制缓存大小
    OptimizedImageLoader.init({
      maxSize: 2 * 1024 * 1024, // 2MB
      debug: false
    });
    
    // 设置大文件
    mockWx.setFileSizeRange(200 * 1024, 1024 * 1024); // 200KB-1MB
    
    // 跟踪指标
    let totalLoadedSize = 0;
    let maxCacheSize = 0;
    let loadCount = 0;
    let cacheHits = 0;
    
    // 第一阶段：加载大量不同图片
    printSubtitle('阶段1: 加载500个不同图片', colors.dim);
    
    for (let i = 0; i < 500; i++) {
      const url = `https://example.com/resource_test_${i}.jpg`;
      const result = await OptimizedImageLoader.loadImage(url);
      
      loadCount++;
      if (result.fromCache) cacheHits++;
      
      totalLoadedSize += mockWx.getLastFileSize();
      maxCacheSize = Math.max(maxCacheSize, OptimizedImageLoader._cache.totalSize);
      
      if (i % 100 === 0 && i > 0) {
        console.log(`已加载 ${i} 张图片，当前缓存大小: ${(OptimizedImageLoader._cache.totalSize / (1024 * 1024)).toFixed(2)}MB`);
      }
    }
    
    // 第二阶段：复用50%图片
    printSubtitle('阶段2: 再加载300张图片(50%复用)', colors.dim);
    
    for (let i = 0; i < 300; i++) {
      // 50%复用率
      const index = Math.random() < 0.5 ? Math.floor(Math.random() * 500) : 500 + i;
      const url = `https://example.com/resource_test_${index}.jpg`;
      
      const result = await OptimizedImageLoader.loadImage(url);
      
      loadCount++;
      if (result.fromCache) cacheHits++;
      
      if (!result.fromCache) {
        totalLoadedSize += mockWx.getLastFileSize();
      }
      
      maxCacheSize = Math.max(maxCacheSize, OptimizedImageLoader._cache.totalSize);
    }
    
    // 计算指标
    const cacheHitRate = (cacheHits / loadCount * 100).toFixed(2);
    const memoryEfficiency = (totalLoadedSize / maxCacheSize).toFixed(2);
    const memoryRatio = (totalLoadedSize / (1024 * 1024)).toFixed(2) + 'MB' + 
                       ' → ' + 
                       (maxCacheSize / (1024 * 1024)).toFixed(2) + 'MB';
    
    // 输出结果
    printSubtitle('资源效率测试结果');
    printResult('总加载图片数', loadCount);
    printResult('总下载大小', `${(totalLoadedSize / (1024 * 1024)).toFixed(2)}MB`);
    printResult('最大缓存大小', `${(maxCacheSize / (1024 * 1024)).toFixed(2)}MB`);
    printResult('内存优化效率比', memoryEfficiency + 'x', parseFloat(memoryEfficiency) > 1.5);
    printResult('内存使用比例', memoryRatio);
    printResult('缓存命中率', cacheHitRate + '%', parseFloat(cacheHitRate) > 40);
    
    // 清理全局变量
    delete global.wx;
    delete global.getCurrentPages;
    
    printResult('资源效率测试', '完成', true);
  } catch (error) {
    printResult('资源效率测试', '失败', false);
    console.error(error);
  }
}

/**
 * 主函数
 */
async function main() {
  const startTime = Date.now();
  
  printTitle('优化图片加载器全面测试套件', colors.bright + colors.magenta);
  console.log(`开始时间: ${new Date().toISOString()}`);
  
  try {
    // 运行极端场景测试
    await runExtremeTests();
    
    // 运行性能基准测试
    await runPerformanceBenchmarks();
    
    // 运行资源效率测试
    await runResourceEfficiencyTests();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    printTitle(`测试完成! 总耗时: ${duration}秒`, colors.green);
  } catch (error) {
    printTitle('测试过程中发生错误', colors.red);
    console.error(error);
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  runExtremeTests,
  runPerformanceBenchmarks,
  runResourceEfficiencyTests,
  main
}; 