/**
 * memory-leak-detector.js
 * 图片加载器内存泄漏检测工具
 * 
 * 创建时间: 2025-04-09 23:18:45
 * 创建者: Claude AI 3.7 Sonnet
 */

// 导入图片加载器
const OptimizedImageLoader = require('../utils/optimized-image-loader');

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

/**
 * 内存泄漏检测器
 */
class MemoryLeakDetector {
  /**
   * 构造函数
   * @param {Object} config 配置项
   * @param {Array<string>} config.imageUrls 测试图片URL列表
   * @param {number} config.repetitions 重复加载次数
   * @param {number} config.maxMemoryThreshold 最大内存阈值(MB)
   */
  constructor(config) {
    this.config = {
      imageUrls: [],
      repetitions: 10,
      maxMemoryThreshold: 100, // MB
      ...config
    };
    
    this.results = {
      memoryUsage: [],
      leakDetected: false,
      memoryGrowthRate: 0,
      peakMemory: 0,
      finalMemory: 0,
      passed: false,
      error: null
    };
    
    // 创建图片加载器实例
    this.imageLoader = new OptimizedImageLoader({
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      thumbnailQuality: 70,
      logLevel: 'error'  // 仅记录错误，减少日志干扰
    });
  }
  
  /**
   * 获取当前内存使用情况
   * @returns {Object} 内存使用信息
   */
  getMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    return {
      rss: memoryUsage.rss / (1024 * 1024), // MB
      heapTotal: memoryUsage.heapTotal / (1024 * 1024), // MB
      heapUsed: memoryUsage.heapUsed / (1024 * 1024), // MB
      external: memoryUsage.external / (1024 * 1024), // MB
      time: Date.now()
    };
  }
  
  /**
   * 强制垃圾回收
   * 注意：此方法仅在支持--expose-gc的环境中有效
   */
  forceGC() {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }
  
  /**
   * 打印内存快照信息
   * @param {Object} memory 内存信息
   * @param {string} label 标签
   */
  printMemorySnapshot(memory, label) {
    console.log(`${colors.yellow}${label}:${colors.reset}`);
    console.log(`  ${colors.cyan}堆内存使用:${colors.reset} ${memory.heapUsed.toFixed(2)} MB`);
    console.log(`  ${colors.cyan}总堆内存:${colors.reset} ${memory.heapTotal.toFixed(2)} MB`);
    console.log(`  ${colors.cyan}RSS:${colors.reset} ${memory.rss.toFixed(2)} MB`);
  }
  
  /**
   * 睡眠函数
   * @param {number} ms 毫秒
   * @returns {Promise} Promise对象
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 运行基础内存泄漏测试
   * @returns {Object} 测试结果
   */
  async runBasicLeakTest() {
    console.log(`${colors.bright}运行基础内存泄漏测试 - 重复加载/卸载图片${colors.reset}`);
    
    const startTime = Date.now();
    this.results.memoryUsage = [];
    
    try {
      // 获取初始内存状态
      this.forceGC();
      await this.sleep(200);
      const initialMemory = this.getMemoryUsage();
      this.results.memoryUsage.push(initialMemory);
      this.printMemorySnapshot(initialMemory, "初始内存");
      
      // 进行重复的加载和卸载测试
      for (let i = 0; i < this.config.repetitions; i++) {
        console.log(`${colors.yellow}执行测试循环 ${i + 1}/${this.config.repetitions}${colors.reset}`);
        
        // 加载所有测试图片
        for (const url of this.config.imageUrls) {
          await this.imageLoader.loadImage(url);
        }
        
        // 强制清理缓存
        this.imageLoader.clearCache();
        
        // 强制垃圾回收
        this.forceGC();
        await this.sleep(100);
        
        // 记录内存状态
        const memory = this.getMemoryUsage();
        this.results.memoryUsage.push(memory);
        
        // 记录峰值内存
        if (memory.heapUsed > this.results.peakMemory) {
          this.results.peakMemory = memory.heapUsed;
        }
        
        // 每3次循环打印一次内存状态
        if ((i + 1) % 3 === 0 || i === this.config.repetitions - 1) {
          this.printMemorySnapshot(memory, `循环 ${i + 1} 内存状态`);
        }
      }
      
      // 最终内存检查
      await this.sleep(500);
      this.forceGC();
      await this.sleep(200);
      const finalMemory = this.getMemoryUsage();
      this.results.memoryUsage.push(finalMemory);
      this.results.finalMemory = finalMemory.heapUsed;
      this.printMemorySnapshot(finalMemory, "最终内存");
      
      // 计算内存增长率
      const memoryDiff = finalMemory.heapUsed - initialMemory.heapUsed;
      const growthRatePerIteration = memoryDiff / this.config.repetitions;
      this.results.memoryGrowthRate = growthRatePerIteration;
      
      // 判断是否存在泄漏
      // 如果每次迭代平均增加超过0.5MB，或总增长超过5MB，则视为有泄漏
      const leakDetected = growthRatePerIteration > 0.5 || memoryDiff > 5;
      this.results.leakDetected = leakDetected;
      
      // 输出结果
      console.log(`\n${colors.bright}基础内存泄漏测试结果:${colors.reset}`);
      console.log(`${colors.cyan}初始内存:${colors.reset} ${initialMemory.heapUsed.toFixed(2)} MB`);
      console.log(`${colors.cyan}最终内存:${colors.reset} ${finalMemory.heapUsed.toFixed(2)} MB`);
      console.log(`${colors.cyan}内存变化:${colors.reset} ${memoryDiff.toFixed(2)} MB`);
      console.log(`${colors.cyan}每次迭代平均内存增长:${colors.reset} ${growthRatePerIteration.toFixed(2)} MB`);
      console.log(`${colors.cyan}峰值内存使用:${colors.reset} ${this.results.peakMemory.toFixed(2)} MB`);
      
      if (leakDetected) {
        console.log(`\n${colors.red}警告: 检测到潜在内存泄漏!${colors.reset}`);
        console.log(`每次迭代平均内存增长(${growthRatePerIteration.toFixed(2)} MB)超过阈值(0.5 MB)`);
      } else {
        console.log(`\n${colors.green}通过: 未检测到内存泄漏${colors.reset}`);
      }
      
      // 构建结果
      const results = {
        passed: !leakDetected,
        initialMemory: initialMemory.heapUsed,
        finalMemory: finalMemory.heapUsed,
        memoryDiff,
        growthRatePerIteration,
        peakMemory: this.results.peakMemory,
        leakDetected,
        duration: Date.now() - startTime
      };
      
      return results;
    } catch (error) {
      console.error(`${colors.red}内存泄漏测试执行错误:${colors.reset}`, error);
      
      return {
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
  
  /**
   * 运行极端情况测试
   * @returns {Object} 测试结果
   */
  async runExtremeCaseTest() {
    console.log(`\n${colors.bright}运行高负载内存测试 - 模拟极端使用场景${colors.reset}`);
    
    const startTime = Date.now();
    
    try {
      // 重置图片加载器
      this.imageLoader.clearCache();
      
      // 获取初始内存状态
      this.forceGC();
      await this.sleep(200);
      const initialMemory = this.getMemoryUsage();
      this.printMemorySnapshot(initialMemory, "初始内存");
      
      // 测试场景1: 大量不同图片并发加载
      console.log(`\n${colors.yellow}测试场景1: 大量不同图片并发加载${colors.reset}`);
      
      // 生成大量测试URL
      const testUrls = [];
      for (let i = 0; i < 100; i++) {
        testUrls.push(`https://example.com/test/image${i}.jpg?size=large`);
      }
      
      // 并发加载
      const loadPromises = testUrls.map(url => this.imageLoader.loadImage(url));
      await Promise.all(loadPromises);
      
      // 记录内存
      this.forceGC();
      const afterScenario1 = this.getMemoryUsage();
      this.printMemorySnapshot(afterScenario1, "场景1完成后内存");
      
      // 测试场景2: 重复加载相同图片
      console.log(`\n${colors.yellow}测试场景2: 重复加载相同图片${colors.reset}`);
      
      const singleUrl = 'https://example.com/test/repeated-image.jpg';
      for (let i = 0; i < 200; i++) {
        await this.imageLoader.loadImage(singleUrl);
      }
      
      // 记录内存
      this.forceGC();
      const afterScenario2 = this.getMemoryUsage();
      this.printMemorySnapshot(afterScenario2, "场景2完成后内存");
      
      // 测试场景3: 加载图片后切换缩略图
      console.log(`\n${colors.yellow}测试场景3: 频繁切换原图和缩略图${colors.reset}`);
      
      for (let i = 0; i < 50; i++) {
        const url = `https://example.com/test/switch-image${i % 10}.jpg`;
        // 先加载缩略图
        await this.imageLoader.loadThumbnail(url);
        // 再加载原图
        await this.imageLoader.loadImage(url);
        // 再次切换到缩略图
        await this.imageLoader.loadThumbnail(url);
      }
      
      // 记录内存
      this.forceGC();
      const afterScenario3 = this.getMemoryUsage();
      this.printMemorySnapshot(afterScenario3, "场景3完成后内存");
      
      // 清理缓存，检查内存释放情况
      console.log(`\n${colors.yellow}清理缓存后内存检查${colors.reset}`);
      this.imageLoader.clearCache();
      this.forceGC();
      await this.sleep(500);
      
      // 最终内存
      const finalMemory = this.getMemoryUsage();
      this.printMemorySnapshot(finalMemory, "清理后最终内存");
      
      // 分析结果
      const memoryAfterCleanup = finalMemory.heapUsed - initialMemory.heapUsed;
      const peakMemory = Math.max(
        afterScenario1.heapUsed,
        afterScenario2.heapUsed,
        afterScenario3.heapUsed
      );
      
      // 判断测试是否通过
      // 1. 峰值内存不应超过阈值
      // 2. 清理后内存增长不应过大
      const peakExceeded = peakMemory > this.config.maxMemoryThreshold;
      const cleanupFailed = memoryAfterCleanup > 5; // 5MB
      const passed = !peakExceeded && !cleanupFailed;
      
      // 输出结果
      console.log(`\n${colors.bright}高负载内存测试结果:${colors.reset}`);
      console.log(`${colors.cyan}初始内存:${colors.reset} ${initialMemory.heapUsed.toFixed(2)} MB`);
      console.log(`${colors.cyan}峰值内存:${colors.reset} ${peakMemory.toFixed(2)} MB (阈值: ${this.config.maxMemoryThreshold} MB)`);
      console.log(`${colors.cyan}清理后最终内存:${colors.reset} ${finalMemory.heapUsed.toFixed(2)} MB`);
      console.log(`${colors.cyan}清理后内存增长:${colors.reset} ${memoryAfterCleanup.toFixed(2)} MB`);
      
      if (peakExceeded) {
        console.log(`\n${colors.red}警告: 峰值内存(${peakMemory.toFixed(2)} MB)超过阈值(${this.config.maxMemoryThreshold} MB)${colors.reset}`);
      }
      
      if (cleanupFailed) {
        console.log(`\n${colors.red}警告: 清理后内存未正确释放! 残留增长: ${memoryAfterCleanup.toFixed(2)} MB${colors.reset}`);
      }
      
      if (passed) {
        console.log(`\n${colors.green}通过: 高负载内存测试通过${colors.reset}`);
      }
      
      // 构建结果
      const results = {
        passed,
        initialMemory: initialMemory.heapUsed,
        finalMemory: finalMemory.heapUsed,
        peakMemory,
        memoryAfterCleanup,
        peakExceeded,
        cleanupFailed,
        maxMemoryThreshold: this.config.maxMemoryThreshold,
        duration: Date.now() - startTime
      };
      
      return results;
    } catch (error) {
      console.error(`${colors.red}高负载内存测试执行错误:${colors.reset}`, error);
      
      return {
        passed: false,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
  
  /**
   * 运行所有内存测试
   * @returns {Object} 测试结果汇总
   */
  async runAllTests() {
    console.log(`${colors.bright}${colors.magenta}启动内存泄漏检测器...${colors.reset}`);
    
    const startTime = Date.now();
    
    try {
      // 运行基础内存泄漏测试
      const basicResults = await this.runBasicLeakTest();
      
      // 运行极端情况测试
      const extremeResults = await this.runExtremeCaseTest();
      
      // 汇总结果
      const allPassed = basicResults.passed && extremeResults.passed;
      
      // 输出总结
      console.log(`\n${colors.bright}${colors.cyan}内存泄漏检测总结:${colors.reset}`);
      console.log(`${colors.bright}基础内存泄漏测试: ${basicResults.passed ? colors.green + '通过' : colors.red + '失败'}${colors.reset}`);
      console.log(`${colors.bright}高负载内存测试: ${extremeResults.passed ? colors.green + '通过' : colors.red + '失败'}${colors.reset}`);
      console.log(`\n${colors.bright}总体结果: ${allPassed ? colors.green + '通过' : colors.red + '失败'}${colors.reset}`);
      
      // 构建最终结果
      const results = {
        passed: allPassed,
        passedTests: (basicResults.passed ? 1 : 0) + (extremeResults.passed ? 1 : 0),
        totalTests: 2,
        results: [
          {
            name: '基础内存泄漏测试',
            passed: basicResults.passed,
            details: basicResults
          },
          {
            name: '高负载内存测试',
            passed: extremeResults.passed,
            details: extremeResults
          }
        ],
        duration: Date.now() - startTime
      };
      
      return results;
    } catch (error) {
      console.error(`${colors.red}内存测试执行过程中出错:${colors.reset}`, error);
      
      return {
        passed: false,
        passedTests: 0,
        totalTests: 2,
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }
}

// 仅当直接运行此文件时执行测试
if (require.main === module) {
  // 设置测试环境
  process.env.NODE_ENV = 'test';
  
  // 创建内存泄漏检测器
  const detector = new MemoryLeakDetector({
    imageUrls: [
      'https://example.com/test/image1.jpg',
      'https://example.com/test/image2.jpg',
      'https://example.com/test/image3.jpg'
    ],
    repetitions: 10,
    maxMemoryThreshold: 100 // MB
  });
  
  // 运行所有测试
  detector.runAllTests().then(results => {
    console.log('\n内存泄漏检测完成.');
    process.exit(results.passed ? 0 : 1);
  }).catch(err => {
    console.error('内存测试脚本执行错误:', err);
    process.exit(1);
  });
}

module.exports = MemoryLeakDetector; 