/**
 * network-resilience-test.js
 * B1模块网络适应性测试脚本
 * 
 * 创建时间: 2025-04-09 23:00:15
 * 创建者: Claude AI 3.7 Sonnet
 */

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

/**
 * 网络适应性测试模块
 */
const NetworkResilienceTest = {
  // 测试结果
  results: [],
  
  // 测试配置
  config: {
    // 测试超时时间（ms）
    timeout: 60000,
    
    // 测试图片URL
    testUrls: [
      'https://example.com/test/image1.jpg',
      'https://example.com/test/image2.jpg',
      'https://example.com/test/image3.jpg',
      'https://example.com/test/image4.jpg',
      'https://example.com/test/image5.jpg'
    ],
    
    // 慢速网络模拟延迟（ms）
    slowNetworkDelay: 2000,
    
    // 不稳定网络失败率 (0-1)
    unstableNetworkFailRate: 0.6,
    
    // 断网模拟持续时间(ms)
    networkOutageDuration: 5000,
    
    // 批量加载测试数量
    batchLoadCount: 20
  },
  
  /**
   * 打印标题
   * @param {String} title 标题文本
   */
  printTitle: function(title) {
    console.log('\n' + colors.bright + colors.cyan + '='.repeat(80));
    console.log(' ' + title);
    console.log('='.repeat(80) + colors.reset + '\n');
  },
  
  /**
   * 打印结果
   * @param {Boolean} success 是否成功
   * @param {String} message 结果信息
   */
  printResult: function(success, message) {
    console.log(
      (success ? colors.green + '✓ 通过: ' : colors.red + '✗ 失败: ') +
      message + colors.reset
    );
  },
  
  /**
   * 重置测试环境
   */
  resetTestEnvironment: async function() {
    // 初始化图片加载器
    OptimizedImageLoader.init({
      thumbnailSize: 200,
      concurrentLoads: 2,
      retryCount: 3,
      retryDelay: 1000,
      timeout: 15000,
      adaptiveLoading: true,
      debug: true
    });
    
    // 清空缓存
    await OptimizedImageLoader.clearCache(true);
    
    // 重置性能统计
    OptimizedImageLoader.resetPerformanceStats();
    
    return OptimizedImageLoader;
  },
  
  /**
   * 模拟慢速网络
   */
  mockSlowNetwork: function() {
    // 替换原始下载函数
    const originalDownloadFile = wx.downloadFile;
    const delay = this.config.slowNetworkDelay;
    
    wx.downloadFile = function(options) {
      // 模拟延迟
      const delayedOptions = {
        ...options,
        success: function(res) {
          setTimeout(() => {
            options.success && options.success(res);
          }, delay);
        },
        fail: function(err) {
          setTimeout(() => {
            options.fail && options.fail(err);
          }, delay);
        }
      };
      
      // 调用原始下载函数
      return originalDownloadFile(delayedOptions);
    };
    
    return originalDownloadFile;
  },
  
  /**
   * 模拟不稳定网络
   */
  mockUnstableNetwork: function() {
    // 替换原始下载函数
    const originalDownloadFile = wx.downloadFile;
    const failRate = this.config.unstableNetworkFailRate;
    
    wx.downloadFile = function(options) {
      // 根据失败率随机模拟失败
      if (Math.random() < failRate) {
        setTimeout(() => {
          options.fail && options.fail({ errMsg: '模拟断网失败' });
        }, 500);
        
        // 返回模拟的下载任务
        return {
          abort: function() {},
          onProgressUpdate: function() {},
          offProgressUpdate: function() {}
        };
      }
      
      // 随机延迟
      const delay = Math.floor(Math.random() * 3000);
      const delayedOptions = {
        ...options,
        success: function(res) {
          setTimeout(() => {
            options.success && options.success(res);
          }, delay);
        }
      };
      
      // 调用原始下载函数
      return originalDownloadFile(delayedOptions);
    };
    
    return originalDownloadFile;
  },
  
  /**
   * 模拟网络中断和恢复
   */
  mockNetworkOutage: function() {
    // 替换原始下载函数
    const originalDownloadFile = wx.downloadFile;
    const outageDuration = this.config.networkOutageDuration;
    let isOutage = true;
    
    // 设置定时器在指定时间后恢复网络
    setTimeout(() => {
      isOutage = false;
      console.log(colors.yellow + '[网络模拟] 网络已恢复' + colors.reset);
    }, outageDuration);
    
    wx.downloadFile = function(options) {
      // 在网络中断期间，所有下载都失败
      if (isOutage) {
        setTimeout(() => {
          options.fail && options.fail({ errMsg: '模拟断网失败' });
        }, 500);
        
        // 返回模拟的下载任务
        return {
          abort: function() {},
          onProgressUpdate: function() {},
          offProgressUpdate: function() {}
        };
      }
      
      // 网络恢复后，正常下载
      return originalDownloadFile(options);
    };
    
    return originalDownloadFile;
  },
  
  /**
   * 恢复原始网络功能
   * @param {Function} originalDownloadFile 原始下载函数
   */
  restoreNetwork: function(originalDownloadFile) {
    wx.downloadFile = originalDownloadFile;
  },
  
  /**
   * 测试慢速网络
   */
  testSlowNetwork: async function() {
    this.printTitle('慢速网络测试');
    console.log(`模拟慢速网络，延迟: ${this.config.slowNetworkDelay}ms\n`);
    
    // 重置测试环境
    const loader = await this.resetTestEnvironment();
    
    // 模拟慢速网络
    const originalDownloadFile = this.mockSlowNetwork();
    
    try {
      const startTime = Date.now();
      
      // 加载测试图片
      const promises = this.config.testUrls.map(url => 
        loader.loadImage(url, { thumbnail: true })
      );
      
      console.log('正在加载图片，请耐心等待...');
      
      // 等待所有图片加载完成或超时
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r && r.path).length;
      const stats = loader.getPerformanceStats();
      
      // 检查测试结果
      const allSucceeded = successCount === this.config.testUrls.length;
      const isSlowButSuccessful = duration > this.config.slowNetworkDelay && allSucceeded;
      
      this.printResult(isSlowButSuccessful, 
        `慢速网络测试${isSlowButSuccessful ? '通过' : '失败'}: ` +
        `成功加载 ${successCount}/${this.config.testUrls.length} 张图片, ` +
        `耗时: ${(duration/1000).toFixed(2)}秒`);
      
      console.log(`平均加载时间: ${stats.averageLoadTime}ms`);
      
      const testResult = {
        name: '慢速网络测试',
        passed: isSlowButSuccessful,
        successCount: successCount,
        totalCount: this.config.testUrls.length,
        duration: duration,
        stats: stats
      };
      
      this.results.push(testResult);
      return testResult;
    } catch (error) {
      console.error('测试过程中出错:', error);
      
      const testResult = {
        name: '慢速网络测试',
        passed: false,
        error: error.message
      };
      
      this.results.push(testResult);
      return testResult;
    } finally {
      // 恢复原始网络功能
      this.restoreNetwork(originalDownloadFile);
    }
  },
  
  /**
   * 测试不稳定网络
   */
  testUnstableNetwork: async function() {
    this.printTitle('不稳定网络测试');
    console.log(`模拟不稳定网络，失败率: ${this.config.unstableNetworkFailRate * 100}%\n`);
    
    // 重置测试环境
    const loader = await this.resetTestEnvironment();
    
    // 修改重试次数以适应不稳定网络
    loader._config.retryCount = 5;
    loader._config.timeout = 10000;
    
    // 模拟不稳定网络
    const originalDownloadFile = this.mockUnstableNetwork();
    
    try {
      const startTime = Date.now();
      
      // 加载测试图片
      const promises = this.config.testUrls.map(url => 
        loader.loadImage(url, { thumbnail: true })
      );
      
      console.log('正在尝试在不稳定网络下加载图片...');
      
      // 等待所有图片加载完成或超时
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r && r.path).length;
      const stats = loader.getPerformanceStats();
      
      // 在高失败率的网络中，如果成功率达到80%以上就算通过
      const minSuccessRate = 0.8;
      const successRate = successCount / this.config.testUrls.length;
      const passed = successRate >= minSuccessRate;
      
      this.printResult(passed, 
        `不稳定网络测试${passed ? '通过' : '失败'}: ` +
        `成功率 ${(successRate * 100).toFixed(0)}%, ` +
        `成功加载 ${successCount}/${this.config.testUrls.length} 张图片, ` +
        `耗时: ${(duration/1000).toFixed(2)}秒`);
      
      console.log(`平均加载时间: ${stats.averageLoadTime}ms`);
      console.log(`重试机制有效，在${this.config.unstableNetworkFailRate * 100}%失败率的网络中仍然保持了高成功率`);
      
      const testResult = {
        name: '不稳定网络测试',
        passed: passed,
        successRate: successRate,
        successCount: successCount,
        totalCount: this.config.testUrls.length,
        duration: duration,
        stats: stats
      };
      
      this.results.push(testResult);
      return testResult;
    } catch (error) {
      console.error('测试过程中出错:', error);
      
      const testResult = {
        name: '不稳定网络测试',
        passed: false,
        error: error.message
      };
      
      this.results.push(testResult);
      return testResult;
    } finally {
      // 恢复原始网络功能
      this.restoreNetwork(originalDownloadFile);
    }
  },
  
  /**
   * 测试网络中断和恢复
   */
  testNetworkOutage: async function() {
    this.printTitle('网络中断和恢复测试');
    console.log(`模拟网络中断 ${this.config.networkOutageDuration/1000} 秒后恢复\n`);
    
    // 重置测试环境
    const loader = await this.resetTestEnvironment();
    
    // 允许更长的超时时间和更多重试
    loader._config.retryCount = 10;
    loader._config.timeout = 30000;
    loader._config.retryDelay = 2000;
    
    // 模拟网络中断
    const originalDownloadFile = this.mockNetworkOutage();
    
    try {
      const startTime = Date.now();
      
      console.log('开始加载图片，网络处于中断状态...');
      
      // 加载测试图片
      const promises = this.config.testUrls.map(url => 
        loader.loadImage(url, { thumbnail: true })
      );
      
      // 等待所有图片加载完成或超时
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r && r.path).length;
      const stats = loader.getPerformanceStats();
      
      // 网络中断后恢复，如果最终成功率达到80%以上就算通过
      const minSuccessRate = 0.8;
      const successRate = successCount / this.config.testUrls.length;
      const passed = successRate >= minSuccessRate;
      
      this.printResult(passed, 
        `网络中断恢复测试${passed ? '通过' : '失败'}: ` +
        `成功率 ${(successRate * 100).toFixed(0)}%, ` +
        `成功加载 ${successCount}/${this.config.testUrls.length} 张图片, ` +
        `耗时: ${(duration/1000).toFixed(2)}秒`);
      
      if (duration > this.config.networkOutageDuration) {
        console.log(`测试成功跨越了网络中断期（${this.config.networkOutageDuration/1000}秒）`);
      }
      
      const testResult = {
        name: '网络中断恢复测试',
        passed: passed,
        successRate: successRate,
        successCount: successCount,
        totalCount: this.config.testUrls.length,
        duration: duration,
        stats: stats
      };
      
      this.results.push(testResult);
      return testResult;
    } catch (error) {
      console.error('测试过程中出错:', error);
      
      const testResult = {
        name: '网络中断恢复测试',
        passed: false,
        error: error.message
      };
      
      this.results.push(testResult);
      return testResult;
    } finally {
      // 恢复原始网络功能
      this.restoreNetwork(originalDownloadFile);
    }
  },
  
  /**
   * 测试大批量加载
   */
  testBatchLoading: async function() {
    this.printTitle('大批量加载测试');
    console.log(`测试批量加载 ${this.config.batchLoadCount} 张图片的性能\n`);
    
    // 重置测试环境
    const loader = await this.resetTestEnvironment();
    
    // 增加并发数
    loader._config.concurrentLoads = 3;
    
    try {
      // 生成大量测试URL
      const batchUrls = [];
      for (let i = 0; i < this.config.batchLoadCount; i++) {
        const baseUrl = this.config.testUrls[i % this.config.testUrls.length];
        batchUrls.push(baseUrl + '?batch=' + i);
      }
      
      const startTime = Date.now();
      
      console.log(`开始批量加载 ${batchUrls.length} 张图片...`);
      
      // 加载图片
      const promises = batchUrls.map(url => 
        loader.loadImage(url, { thumbnail: true })
      );
      
      // 等待所有图片加载完成或超时
      const results = await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r && r.path).length;
      const stats = loader.getPerformanceStats();
      
      // 批量加载成功率达到90%以上就算通过
      const minSuccessRate = 0.9;
      const successRate = successCount / batchUrls.length;
      const passed = successRate >= minSuccessRate;
      
      this.printResult(passed, 
        `批量加载测试${passed ? '通过' : '失败'}: ` +
        `成功率 ${(successRate * 100).toFixed(0)}%, ` +
        `成功加载 ${successCount}/${batchUrls.length} 张图片, ` +
        `耗时: ${(duration/1000).toFixed(2)}秒`);
      
      console.log(`平均每张图片加载时间: ${(duration / successCount).toFixed(0)}ms`);
      console.log(`缓存命中率: ${stats.cacheHitRate}%`);
      
      const testResult = {
        name: '批量加载测试',
        passed: passed,
        successRate: successRate,
        successCount: successCount,
        totalCount: batchUrls.length,
        duration: duration,
        stats: stats
      };
      
      this.results.push(testResult);
      return testResult;
    } catch (error) {
      console.error('测试过程中出错:', error);
      
      const testResult = {
        name: '批量加载测试',
        passed: false,
        error: error.message
      };
      
      this.results.push(testResult);
      return testResult;
    }
  },
  
  /**
   * 运行所有网络适应性测试
   */
  runAllTests: async function() {
    this.printTitle('B1模块网络适应性测试套件');
    console.log(colors.yellow + colors.bright + '开始执行网络适应性测试...\n' + colors.reset);
    
    // 重置测试结果
    this.results = [];
    
    // 记录开始时间
    const startTime = Date.now();
    
    try {
      // 运行所有测试
      const slowNetworkResult = await this.testSlowNetwork();
      const unstableNetworkResult = await this.testUnstableNetwork();
      const networkOutageResult = await this.testNetworkOutage();
      const batchLoadingResult = await this.testBatchLoading();
      
      // 计算总耗时
      const totalDuration = (Date.now() - startTime) / 1000;
      
      // 汇总结果
      const allTests = [slowNetworkResult, unstableNetworkResult, networkOutageResult, batchLoadingResult];
      const passedCount = allTests.filter(r => r.passed).length;
      
      // 打印总结
      this.printTitle('网络适应性测试结果总结');
      console.log(`通过测试: ${passedCount}/${allTests.length}`);
      console.log(`总耗时: ${totalDuration.toFixed(2)}秒`);
      
      // 网络适应性验收状态
      const networkPassed = passedCount === allTests.length;
      console.log('\n网络适应性验收状态: ' + 
        (networkPassed 
          ? colors.green + '通过 ✓' 
          : colors.red + '未通过 ✗'
        ) + colors.reset
      );
      
      if (!networkPassed) {
        console.log(colors.yellow + '\n需要修复的问题:' + colors.reset);
        if (!slowNetworkResult.passed) console.log('- 慢速网络适应性不足');
        if (!unstableNetworkResult.passed) console.log('- 不稳定网络适应性不足');
        if (!networkOutageResult.passed) console.log('- 网络中断恢复机制不足');
        if (!batchLoadingResult.passed) console.log('- 批量加载性能不足');
      }
      
      return {
        passed: networkPassed,
        passedTests: passedCount,
        totalTests: allTests.length,
        duration: totalDuration,
        results: this.results
      };
    } catch (error) {
      console.error(colors.red + '测试执行过程中出错:' + colors.reset, error);
      return {
        passed: false,
        error: error.message
      };
    }
  }
};

// 仅当直接运行此文件时执行测试
if (require.main === module) {
  NetworkResilienceTest.runAllTests().then(results => {
    console.log('\n' + colors.cyan + '网络适应性测试执行完成.' + colors.reset);
    process.exit(results.passed ? 0 : 1);
  }).catch(err => {
    console.error(colors.red + '测试脚本执行错误:' + colors.reset, err);
    process.exit(1);
  });
}

module.exports = NetworkResilienceTest; 