/**
 * performance-benchmark.js
 * 优化图片加载器性能基准测试
 * 
 * 创建时间: 2025-04-09 21:00:45
 * 创建者: Claude AI 3.7 Sonnet
 */

const OptimizedImageLoader = require('../utils/optimized-image-loader');

// 模拟环境
const mockWx = require('./mocks/wx-mock');
global.wx = mockWx.createMock();
global.getCurrentPages = mockWx.getCurrentPages;

// 定义基准测试场景
const benchmarks = {
  // 并发加载基准测试
  concurrentLoading: async (concurrentLimit, totalImages) => {
    console.log(`\n[并发加载基准测试] - 并发限制: ${concurrentLimit}, 总图片数: ${totalImages}`);
    
    // 初始化加载器
    OptimizedImageLoader.init({
      concurrentLoads: concurrentLimit,
      debug: false
    });
    
    // 生成测试URL
    const urls = Array.from({ length: totalImages }, (_, i) => 
      `https://example.com/benchmark/image${i}.jpg`);
    
    // 执行基准测试
    const startTime = Date.now();
    
    // 开始加载所有图片
    const promises = urls.map(url => OptimizedImageLoader.loadImage(url));
    
    // 等待所有加载完成
    await Promise.all(promises);
    const endTime = Date.now();
    
    // 计算指标
    const totalTime = endTime - startTime;
    const avgTimePerImage = totalTime / totalImages;
    const imagesPerSecond = 1000 / avgTimePerImage;
    
    // 输出结果
    console.log(`总耗时: ${totalTime}ms`);
    console.log(`平均每张图片时间: ${avgTimePerImage.toFixed(2)}ms`);
    console.log(`每秒处理图片数: ${imagesPerSecond.toFixed(2)}张/秒`);
    
    return {
      totalTime,
      avgTimePerImage,
      imagesPerSecond
    };
  },
  
  // 内存效率基准测试
  memoryEfficiency: async (iterations, cleanupThreshold) => {
    console.log(`\n[内存效率基准测试] - 迭代次数: ${iterations}, 清理阈值: ${cleanupThreshold}MB`);
    
    // 初始化加载器
    OptimizedImageLoader.init({
      maxSize: cleanupThreshold * 1024 * 1024,
      debug: false
    });
    
    // 模拟文件大小 - 随机100KB到500KB
    mockWx.setFileSizeRange(100 * 1024, 500 * 1024);
    
    // 监控内存使用
    let maxCacheSize = 0;
    let cleanupCount = 0;
    let totalLoadedSize = 0;
    
    // 开始测试
    const startTime = Date.now();
    
    // 执行多次迭代
    for (let i = 0; i < iterations; i++) {
      // 生成随机URL
      const url = `https://example.com/benchmark/memory${i}.jpg`;
      
      // 加载图片
      await OptimizedImageLoader.loadImage(url);
      
      // 记录当前缓存大小
      const currentSize = OptimizedImageLoader._cache.totalSize;
      
      // 更新统计
      totalLoadedSize += mockWx.getLastFileSize();
      maxCacheSize = Math.max(maxCacheSize, currentSize);
      
      // 检查是否执行了清理
      if (i > 0 && currentSize < previousSize) {
        cleanupCount++;
      }
      
      // 保存当前大小以供下次比较
      const previousSize = currentSize;
    }
    
    const endTime = Date.now();
    
    // 计算指标
    const totalTime = endTime - startTime;
    const memoryEfficiencyRatio = (totalLoadedSize / maxCacheSize).toFixed(2);
    const compressionRatio = (1 - (maxCacheSize / totalLoadedSize)).toFixed(2);
    
    // 输出结果
    console.log(`总耗时: ${totalTime}ms`);
    console.log(`最大缓存大小: ${(maxCacheSize / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`总加载图片大小: ${(totalLoadedSize / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`内存效率比: ${memoryEfficiencyRatio}x`);
    console.log(`内存压缩率: ${compressionRatio}`);
    console.log(`执行缓存清理次数: ${cleanupCount}`);
    
    return {
      totalTime,
      maxCacheSize,
      totalLoadedSize,
      memoryEfficiencyRatio,
      cleanupCount
    };
  },
  
  // 高负载基准测试
  highLoad: async (duration) => {
    console.log(`\n[高负载基准测试] - 持续时间: ${duration}秒`);
    
    // 初始化加载器
    OptimizedImageLoader.init({
      concurrentLoads: 5,
      debug: false
    });
    
    // 设置随机响应时间 (10ms - 500ms)
    mockWx.setResponseTimeRange(10, 500);
    
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let activeRequests = 0;
    const maxConcurrent = 5;
    
    // 统计每秒请求数
    const requestsPerSecond = [];
    let lastSecondRequests = 0;
    let lastSecondTime = startTime;
    
    // 高负载循环
    while (Date.now() < endTime) {
      // 控制并发数
      if (activeRequests < maxConcurrent) {
        activeRequests++;
        totalRequests++;
        lastSecondRequests++;
        
        // 随机决定是否使用缩略图模式
        const useThumbnail = Math.random() > 0.5;
        
        // 生成随机URL
        const url = `https://example.com/benchmark/load${totalRequests}.jpg`;
        
        // 随机决定是否添加错误URL (10%概率)
        const finalUrl = Math.random() < 0.1 ? url + '?error=true' : url;
        
        // 加载图片
        OptimizedImageLoader.loadImage(finalUrl, { thumbnail: useThumbnail })
          .then(() => {
            successfulRequests++;
          })
          .catch(() => {
            failedRequests++;
          })
          .finally(() => {
            activeRequests--;
          });
      }
      
      // 每秒记录一次请求数
      if (Date.now() - lastSecondTime >= 1000) {
        requestsPerSecond.push(lastSecondRequests);
        lastSecondRequests = 0;
        lastSecondTime = Date.now();
      }
      
      // 减轻CPU压力
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // 等待所有活跃请求完成
    while (activeRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 计算指标
    const avgRequestsPerSecond = requestsPerSecond.reduce((a, b) => a + b, 0) / requestsPerSecond.length;
    const peakRequestsPerSecond = Math.max(...requestsPerSecond);
    const successRate = (successfulRequests / totalRequests * 100).toFixed(2);
    
    // 输出结果
    console.log(`总请求数: ${totalRequests}`);
    console.log(`成功请求: ${successfulRequests}`);
    console.log(`失败请求: ${failedRequests}`);
    console.log(`成功率: ${successRate}%`);
    console.log(`平均每秒请求数: ${avgRequestsPerSecond.toFixed(2)}`);
    console.log(`峰值每秒请求数: ${peakRequestsPerSecond}`);
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      avgRequestsPerSecond,
      peakRequestsPerSecond
    };
  },
  
  // 缓存效率基准测试
  cacheEfficiency: async (iterations, repeatRate) => {
    console.log(`\n[缓存效率基准测试] - 迭代次数: ${iterations}, 重复率: ${repeatRate}`);
    
    // 初始化加载器
    OptimizedImageLoader.init({
      debug: false
    });
    
    // 生成图片URL池
    const uniqueUrlCount = Math.floor(iterations * (1 - repeatRate));
    const uniqueUrls = Array.from({ length: uniqueUrlCount }, (_, i) => 
      `https://example.com/benchmark/cache${i}.jpg`);
    
    // 统计指标
    let cacheHits = 0;
    let cacheMisses = 0;
    let fromCacheTime = 0;
    let fromNetworkTime = 0;
    
    // 执行测试
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      // 根据重复率决定是使用已有URL还是新URL
      let url;
      if (i < uniqueUrlCount) {
        // 新URL
        url = uniqueUrls[i];
      } else {
        // 从已有URL中随机选择
        const randomIndex = Math.floor(Math.random() * uniqueUrlCount);
        url = uniqueUrls[randomIndex];
      }
      
      // 记录单次请求时间
      const requestStart = Date.now();
      
      // 加载图片
      const result = await OptimizedImageLoader.loadImage(url);
      
      // 记录请求耗时
      const requestTime = Date.now() - requestStart;
      
      // 更新统计
      if (result.fromCache) {
        cacheHits++;
        fromCacheTime += requestTime;
      } else {
        cacheMisses++;
        fromNetworkTime += requestTime;
      }
    }
    
    const endTime = Date.now();
    
    // 计算指标
    const totalTime = endTime - startTime;
    const cacheHitRate = (cacheHits / iterations * 100).toFixed(2);
    const avgCacheTime = cacheHits > 0 ? (fromCacheTime / cacheHits).toFixed(2) : 0;
    const avgNetworkTime = cacheMisses > 0 ? (fromNetworkTime / cacheMisses).toFixed(2) : 0;
    const speedupRatio = avgNetworkTime > 0 ? (avgNetworkTime / avgCacheTime).toFixed(2) : 0;
    
    // 输出结果
    console.log(`总耗时: ${totalTime}ms`);
    console.log(`缓存命中率: ${cacheHitRate}%`);
    console.log(`缓存命中: ${cacheHits}`);
    console.log(`缓存未命中: ${cacheMisses}`);
    console.log(`平均缓存加载时间: ${avgCacheTime}ms`);
    console.log(`平均网络加载时间: ${avgNetworkTime}ms`);
    console.log(`加速比: ${speedupRatio}x`);
    
    return {
      totalTime,
      cacheHitRate,
      cacheHits,
      cacheMisses,
      avgCacheTime,
      avgNetworkTime,
      speedupRatio
    };
  }
};

// 执行基准测试
async function runBenchmarks() {
  console.log('======== 优化图片加载器性能基准测试 ========');
  console.log('测试时间: ' + new Date().toISOString());
  
  // 并发加载测试 - 不同并发数
  await benchmarks.concurrentLoading(2, 50);
  await benchmarks.concurrentLoading(5, 50);
  await benchmarks.concurrentLoading(10, 50);
  
  // 内存效率测试 - 不同清理阈值
  await benchmarks.memoryEfficiency(100, 1);  // 1MB阈值
  await benchmarks.memoryEfficiency(100, 5);  // 5MB阈值
  
  // 高负载测试 - 不同持续时间
  await benchmarks.highLoad(5);  // 5秒
  await benchmarks.highLoad(10); // 10秒
  
  // 缓存效率测试 - 不同重复率
  await benchmarks.cacheEfficiency(100, 0.5);  // 50%重复
  await benchmarks.cacheEfficiency(100, 0.8);  // 80%重复
  
  console.log('\n======== 基准测试完成 ========');
}

// 导出基准测试
module.exports = {
  benchmarks,
  runBenchmarks
};

// 如果直接运行则执行所有基准测试
if (require.main === module) {
  runBenchmarks().catch(console.error);
} 