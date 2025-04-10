/**
 * integration-test-runner.js
 * B1模块集成测试运行器
 * 
 * 创建时间: 2025-04-09 23:15:32
 * 创建者: Claude AI 3.7 Sonnet
 */

// 导入测试模块
const MemoryLeakDetector = require('./memory-leak-detector');
const NetworkResilienceTest = require('./network-resilience-test');
const ExtremeTester = require('./optimized-image-loader.extreme.test');
const PerformanceBenchmark = require('./performance-benchmark');

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
 * 集成测试运行器
 */
const IntegrationTestRunner = {
  // 测试结果
  results: {
    memoryTests: null,
    networkTests: null,
    extremeTests: null,
    performanceTests: null,
    passed: false,
    startTime: null,
    duration: 0
  },
  
  /**
   * 打印标题
   * @param {String} title 标题文本
   */
  printTitle: function(title) {
    console.log('\n' + colors.bright + colors.cyan + '='.repeat(100));
    console.log(' ' + title);
    console.log('='.repeat(100) + colors.reset + '\n');
  },
  
  /**
   * 打印子标题
   * @param {String} title 标题文本
   */
  printSubTitle: function(title) {
    console.log('\n' + colors.bright + colors.yellow + '-'.repeat(80));
    console.log(' ' + title);
    console.log('-'.repeat(80) + colors.reset + '\n');
  },
  
  /**
   * 打印测试结果
   * @param {Object} results 测试结果
   * @param {String} testType 测试类型
   */
  printTestResults: function(results, testType) {
    const success = results.passed;
    console.log(
      (success ? colors.green + '✓ 通过: ' : colors.red + '✗ 失败: ') +
      `${testType}测试 - ${results.passedTests || 0}/${results.totalTests || 0} 通过` +
      colors.reset
    );
    
    // 如果有详细测试结果，打印出来
    if (results.results && Array.isArray(results.results)) {
      results.results.forEach(test => {
        const status = test.passed ? colors.green + '✓' : colors.red + '✗';
        console.log(`  ${status} ${test.name}${colors.reset}`);
      });
    }
    
    // 如果有错误信息，打印出来
    if (results.error) {
      console.log(colors.red + '  错误: ' + results.error + colors.reset);
    }
  },
  
  /**
   * 运行内存测试
   */
  runMemoryTests: async function() {
    this.printSubTitle('运行内存泄漏测试');
    
    try {
      // 初始化内存泄漏检测器
      const detector = new MemoryLeakDetector({
        imageUrls: [
          'https://example.com/test/image1.jpg',
          'https://example.com/test/image2.jpg',
          'https://example.com/test/image3.jpg'
        ],
        repetitions: 10,
        maxMemoryThreshold: 100 // MB
      });
      
      // 运行基础内存测试
      console.log('运行基础内存稳定性测试...');
      const basicResults = await detector.runBasicLeakTest();
      
      // 运行高负载内存测试
      console.log('运行高负载内存测试...');
      const extremeResults = await detector.runExtremeCaseTest();
      
      // 汇总结果
      const results = {
        passed: basicResults.passed && extremeResults.passed,
        passedTests: (basicResults.passed ? 1 : 0) + (extremeResults.passed ? 1 : 0),
        totalTests: 2,
        results: [
          {
            name: '基础内存稳定性测试',
            passed: basicResults.passed,
            details: basicResults
          },
          {
            name: '高负载内存测试',
            passed: extremeResults.passed,
            details: extremeResults
          }
        ],
        duration: basicResults.duration + extremeResults.duration
      };
      
      this.results.memoryTests = results;
      return results;
    } catch (error) {
      console.error(colors.red + '内存测试执行过程中出错:' + colors.reset, error);
      
      const results = {
        passed: false,
        passedTests: 0,
        totalTests: 2,
        error: error.message,
        duration: 0
      };
      
      this.results.memoryTests = results;
      return results;
    }
  },
  
  /**
   * 运行网络弹性测试
   */
  runNetworkTests: async function() {
    this.printSubTitle('运行网络适应性测试');
    
    try {
      // 执行网络适应性测试
      const results = await NetworkResilienceTest.runAllTests();
      this.results.networkTests = results;
      return results;
    } catch (error) {
      console.error(colors.red + '网络测试执行过程中出错:' + colors.reset, error);
      
      const results = {
        passed: false,
        error: error.message
      };
      
      this.results.networkTests = results;
      return results;
    }
  },
  
  /**
   * 运行极端测试
   */
  runExtremeTests: async function() {
    this.printSubTitle('运行极端场景测试');
    
    try {
      // 执行极端测试
      const results = await ExtremeTester.runAllTests();
      this.results.extremeTests = results;
      return results;
    } catch (error) {
      console.error(colors.red + '极端测试执行过程中出错:' + colors.reset, error);
      
      const results = {
        passed: false,
        error: error.message
      };
      
      this.results.extremeTests = results;
      return results;
    }
  },
  
  /**
   * 运行性能基准测试
   */
  runPerformanceTests: async function() {
    this.printSubTitle('运行性能基准测试');
    
    try {
      // 执行性能基准测试
      const results = await PerformanceBenchmark.runAllBenchmarks();
      this.results.performanceTests = results;
      return results;
    } catch (error) {
      console.error(colors.red + '性能测试执行过程中出错:' + colors.reset, error);
      
      const results = {
        passed: false,
        error: error.message
      };
      
      this.results.performanceTests = results;
      return results;
    }
  },
  
  /**
   * 生成总结报告
   */
  generateReport: function() {
    const duration = (Date.now() - this.results.startTime) / 1000;
    this.results.duration = duration;
    
    this.printTitle('B1模块综合验收测试报告');
    
    // 打印时间信息
    const now = new Date();
    console.log(`测试时间: ${now.toLocaleString()}`);
    console.log(`测试用时: ${duration.toFixed(2)}秒\n`);
    
    console.log(colors.bright + '测试结果汇总:' + colors.reset);
    
    // 打印各项测试结果
    if (this.results.memoryTests) {
      this.printTestResults(this.results.memoryTests, '内存');
    }
    
    if (this.results.networkTests) {
      this.printTestResults(this.results.networkTests, '网络');
    }
    
    if (this.results.extremeTests) {
      this.printTestResults(this.results.extremeTests, '极端场景');
    }
    
    if (this.results.performanceTests) {
      this.printTestResults(this.results.performanceTests, '性能');
    }
    
    // 计算总体通过率
    const testModules = [
      this.results.memoryTests,
      this.results.networkTests,
      this.results.extremeTests,
      this.results.performanceTests
    ].filter(Boolean);
    
    const passedModules = testModules.filter(module => module.passed).length;
    const totalModules = testModules.length;
    const allPassed = passedModules === totalModules;
    
    this.results.passed = allPassed;
    
    // 打印总结
    console.log('\n' + colors.bright + colors.cyan + '-'.repeat(100) + colors.reset);
    console.log(colors.bright + '测试套件总结:' + colors.reset);
    console.log(`通过测试模块: ${passedModules}/${totalModules}`);
    console.log(`总通过率: ${(passedModules / totalModules * 100).toFixed(0)}%`);
    
    // 打印验收状态
    console.log('\n' + colors.bright + '验收测试状态: ' + 
      (allPassed 
        ? colors.green + '通过 ✓' 
        : colors.red + '未通过 ✗'
      ) + colors.reset
    );
    
    // 如果未通过，列出失败的测试模块
    if (!allPassed) {
      console.log(colors.yellow + '\n需要修复的问题:' + colors.reset);
      
      if (this.results.memoryTests && !this.results.memoryTests.passed) {
        console.log('- 内存管理问题: 存在内存泄漏或内存使用过高');
      }
      
      if (this.results.networkTests && !this.results.networkTests.passed) {
        console.log('- 网络适应性问题: 在弱网或不稳定网络环境下表现不佳');
      }
      
      if (this.results.extremeTests && !this.results.extremeTests.passed) {
        console.log('- 极端场景处理问题: 在边界情况下存在缺陷');
      }
      
      if (this.results.performanceTests && !this.results.performanceTests.passed) {
        console.log('- 性能问题: 加载速度、并发处理或资源使用不合格');
      }
    }
    
    return this.results;
  },
  
  /**
   * 运行所有测试并生成报告
   */
  runAllTests: async function() {
    this.printTitle('B1模块集成测试开始');
    console.log(colors.bright + colors.magenta + '开始全面验收测试...' + colors.reset);
    
    // 记录开始时间
    this.results.startTime = Date.now();
    
    try {
      // 按顺序运行各项测试
      await this.runMemoryTests();
      await this.runNetworkTests();
      await this.runExtremeTests();
      await this.runPerformanceTests();
      
      // 生成报告
      const report = this.generateReport();
      
      return report;
    } catch (error) {
      console.error(colors.red + '测试过程中出现严重错误:' + colors.reset, error);
      
      // 尝试生成部分报告
      this.generateReport();
      
      return {
        ...this.results,
        error: error.message,
        passed: false
      };
    }
  }
};

// 仅当直接运行此文件时执行测试
if (require.main === module) {
  // 设置测试环境
  process.env.NODE_ENV = 'test';
  
  IntegrationTestRunner.runAllTests().then(results => {
    console.log('\n' + colors.cyan + '集成测试执行完成.' + colors.reset);
    process.exit(results.passed ? 0 : 1);
  }).catch(err => {
    console.error(colors.red + '测试脚本执行错误:' + colors.reset, err);
    process.exit(1);
  });
}

module.exports = IntegrationTestRunner; 