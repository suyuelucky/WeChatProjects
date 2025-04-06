/**
 * 微信小程序本地存储容量测试自动执行脚本
 * 
 * 用于自动执行存储极限容量测试并收集测试结果
 */

// 导入测试模块
const storageCapacityTests = require('./存储容量压力测试代码');
const fs = require('fs');
const path = require('path');

// 测试结果保存路径
const RESULTS_DIR = path.join(__dirname, 'results');
const LOGS_DIR = path.join(RESULTS_DIR, 'logs');
const SUMMARY_FILE = path.join(RESULTS_DIR, 'test_summary.json');

// 确保结果目录存在
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`创建目录: ${directory}`);
  }
}

// 测试结果收集器
class TestResultCollector {
  constructor() {
    this.results = {
      startTime: new Date().toISOString(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      warningTests: 0,
      failedTests: 0,
      testSuites: {}
    };
    
    // 拦截控制台输出用于日志收集
    this.setupConsoleInterceptor();
  }
  
  setupConsoleInterceptor() {
    const logFile = path.join(LOGS_DIR, `test_log_${new Date().toISOString().replace(/:/g, '-')}.log`);
    ensureDirectoryExists(LOGS_DIR);
    
    // 创建日志写入流
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    // 保存原始console方法
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      time: console.time,
      timeEnd: console.timeEnd
    };
    
    // 重写console方法以便同时输出到文件
    console.log = (...args) => {
      this.originalConsole.log(...args);
      this.logStream.write(`[LOG] ${args.join(' ')}\n`);
    };
    
    console.error = (...args) => {
      this.originalConsole.error(...args);
      this.logStream.write(`[ERROR] ${args.join(' ')}\n`);
      this.recordTestResult('error', args.join(' '));
    };
    
    console.warn = (...args) => {
      this.originalConsole.warn(...args);
      this.logStream.write(`[WARN] ${args.join(' ')}\n`);
      this.recordTestResult('warn', args.join(' '));
    };
    
    console.info = (...args) => {
      this.originalConsole.info(...args);
      this.logStream.write(`[INFO] ${args.join(' ')}\n`);
    };
    
    // 计时功能修改
    const timeLabels = {};
    
    console.time = (label) => {
      this.originalConsole.time(label);
      timeLabels[label] = Date.now();
      this.logStream.write(`[TIME] ${label} - 开始计时\n`);
    };
    
    console.timeEnd = (label) => {
      const duration = Date.now() - (timeLabels[label] || Date.now());
      this.originalConsole.timeEnd(label);
      this.logStream.write(`[TIME] ${label} - 结束计时: ${duration}ms\n`);
      
      // 记录性能指标
      if (label.includes('写入耗时') || label.includes('读取耗时')) {
        this.recordPerformanceMetric(label, duration);
      }
    };
  }
  
  // 记录测试结果
  recordTestResult(type, message) {
    // 提取当前测试套件名称
    const suiteMatch = message.match(/======== (.*?) ========/);
    if (suiteMatch) {
      this.currentSuite = suiteMatch[1];
      if (!this.results.testSuites[this.currentSuite]) {
        this.results.testSuites[this.currentSuite] = {
          tests: [],
          metrics: {}
        };
      }
      return;
    }
    
    // 检查是否是测试结果信息
    if (message.includes('✅')) {
      this.results.passedTests++;
      this.results.totalTests++;
      this._addTestResult('pass', message);
    } else if (message.includes('⚠️')) {
      this.results.warningTests++;
      this.results.totalTests++;
      this._addTestResult('warning', message);
    } else if (message.includes('❌')) {
      this.results.failedTests++;
      this.results.totalTests++;
      this._addTestResult('fail', message);
    }
  }
  
  // 记录性能指标
  recordPerformanceMetric(label, duration) {
    if (!this.currentSuite) return;
    
    const suiteName = this.currentSuite;
    if (!this.results.testSuites[suiteName].metrics) {
      this.results.testSuites[suiteName].metrics = {};
    }
    
    this.results.testSuites[suiteName].metrics[label] = duration;
  }
  
  // 添加测试结果到当前套件
  _addTestResult(status, message) {
    if (!this.currentSuite) return;
    
    const testName = message.replace(/✅|⚠️|❌/, '').trim();
    this.results.testSuites[this.currentSuite].tests.push({
      name: testName,
      status: status,
      timestamp: new Date().toISOString()
    });
  }
  
  // 完成测试收集
  finishCollection() {
    this.results.endTime = new Date().toISOString();
    
    // 恢复原始控制台方法
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.time = this.originalConsole.time;
    console.timeEnd = this.originalConsole.timeEnd;
    
    // 关闭日志流
    this.logStream.end();
    
    return this.results;
  }
  
  // 保存测试结果到文件
  saveResults() {
    const results = this.finishCollection();
    ensureDirectoryExists(RESULTS_DIR);
    
    fs.writeFileSync(
      SUMMARY_FILE,
      JSON.stringify(results, null, 2)
    );
    
    console.log(`测试结果已保存到: ${SUMMARY_FILE}`);
    return results;
  }
}

/**
 * 运行测试并捕获结果
 */
async function runTestsWithResultCollection() {
  const collector = new TestResultCollector();
  
  try {
    console.log('=========== 开始自动测试执行 ===========');
    console.log(`测试开始时间: ${new Date().toISOString()}`);
    
    // 运行容量测试
    await storageCapacityTests.testStorageCapacityLimit();
    
    // 运行性能测试
    await storageCapacityTests.testStoragePerformance();
    
    // 运行并发测试
    await storageCapacityTests.testConcurrentStorage();
    
    // 运行恢复测试
    await storageCapacityTests.testStorageRecovery();
    
    console.log(`测试结束时间: ${new Date().toISOString()}`);
    console.log('=========== 自动测试执行完成 ===========');
  } catch (error) {
    console.error('自动测试执行过程中发生错误:', error);
  } finally {
    // 收集并保存测试结果
    const results = collector.saveResults();
    
    // 打印测试总结
    console.log('\n=========== 测试结果总结 ===========');
    console.log(`总测试数: ${results.totalTests}`);
    console.log(`通过测试: ${results.passedTests}`);
    console.log(`警告测试: ${results.warningTests}`);
    console.log(`失败测试: ${results.failedTests}`);
    console.log(`通过率: ${(results.passedTests / results.totalTests * 100).toFixed(2)}%`);
    console.log('====================================');
    
    // 生成简单HTML报告
    generateHtmlReport(results);
  }
}

/**
 * 生成HTML测试报告
 */
function generateHtmlReport(results) {
  const reportFile = path.join(RESULTS_DIR, 'test_report.html');
  
  // 构建HTML内容
  let htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>微信小程序存储容量测试报告</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background-color: #0078d4; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .summary { display: flex; justify-content: space-between; flex-wrap: wrap; margin: 20px 0; }
    .summary-card { background-color: #f5f5f5; border-radius: 5px; padding: 15px; margin: 10px; flex: 1; min-width: 200px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .pass { background-color: #dff6dd; border-left: 4px solid #107c10; }
    .warning { background-color: #fff4ce; border-left: 4px solid #ff8c00; }
    .fail { background-color: #fde7e9; border-left: 4px solid #d13438; }
    .test-suite { background-color: white; margin-bottom: 20px; border-radius: 5px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .suite-header { background-color: #0078d4; color: white; padding: 10px 20px; }
    .test-list { padding: 0; }
    .test-item { list-style: none; padding: 10px 20px; border-bottom: 1px solid #eee; }
    .test-item.pass { background-color: #dff6dd; }
    .test-item.warning { background-color: #fff4ce; }
    .test-item.fail { background-color: #fde7e9; }
    .metrics { margin-top: 15px; }
    .metric-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee; }
    h1, h2, h3 { margin-top: 0; }
    footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
    .chart-container { margin: 20px 0; height: 300px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>微信小程序存储容量测试报告</h1>
      <p>测试执行时间: ${new Date(results.startTime).toLocaleString()} - ${new Date(results.endTime).toLocaleString()}</p>
    </header>
    
    <div class="summary">
      <div class="summary-card">
        <h2>测试总览</h2>
        <p>总测试数: ${results.totalTests}</p>
        <p>测试套件数: ${Object.keys(results.testSuites).length}</p>
        <p>总执行时间: ${Math.round((new Date(results.endTime) - new Date(results.startTime)) / 1000)} 秒</p>
      </div>
      
      <div class="summary-card pass">
        <h2>通过测试</h2>
        <p>${results.passedTests} 个测试</p>
        <p>${(results.passedTests / results.totalTests * 100).toFixed(2)}%</p>
      </div>
      
      <div class="summary-card warning">
        <h2>警告测试</h2>
        <p>${results.warningTests} 个测试</p>
        <p>${(results.warningTests / results.totalTests * 100).toFixed(2)}%</p>
      </div>
      
      <div class="summary-card fail">
        <h2>失败测试</h2>
        <p>${results.failedTests} 个测试</p>
        <p>${(results.failedTests / results.totalTests * 100).toFixed(2)}%</p>
      </div>
    </div>
    
    <h2>测试套件详情</h2>`;
  
  // 添加各测试套件的结果
  Object.entries(results.testSuites).forEach(([suiteName, suite]) => {
    htmlContent += `
    <div class="test-suite">
      <div class="suite-header">
        <h3>${suiteName}</h3>
      </div>
      
      <ul class="test-list">`;
    
    // 添加测试用例结果
    if (suite.tests && suite.tests.length > 0) {
      suite.tests.forEach(test => {
        htmlContent += `
        <li class="test-item ${test.status}">
          <strong>${test.name}</strong>
          <div>状态: ${test.status === 'pass' ? '通过 ✅' : test.status === 'warning' ? '警告 ⚠️' : '失败 ❌'}</div>
          <div>时间: ${new Date(test.timestamp).toLocaleTimeString()}</div>
        </li>`;
      });
    } else {
      htmlContent += `
        <li class="test-item">
          <em>该测试套件没有记录具体测试结果</em>
        </li>`;
    }
    
    htmlContent += `
      </ul>`;
    
    // 添加性能指标
    if (suite.metrics && Object.keys(suite.metrics).length > 0) {
      htmlContent += `
      <div class="metrics">
        <h4>性能指标</h4>`;
      
      Object.entries(suite.metrics).forEach(([metricName, value]) => {
        htmlContent += `
        <div class="metric-item">
          <span>${metricName}</span>
          <strong>${value} ms</strong>
        </div>`;
      });
      
      htmlContent += `
      </div>`;
    }
    
    htmlContent += `
    </div>`;
  });
  
  // 添加页脚和结束标签
  htmlContent += `
    <footer>
      <p>自动生成的测试报告 - ${new Date().toLocaleString()}</p>
    </footer>
  </div>
</body>
</html>
  `;
  
  // 写入HTML报告文件
  fs.writeFileSync(reportFile, htmlContent);
  console.log(`HTML测试报告已生成: ${reportFile}`);
}

/**
 * 主函数
 */
async function main() {
  // 确保目录结构
  ensureDirectoryExists(RESULTS_DIR);
  ensureDirectoryExists(LOGS_DIR);
  
  // 运行测试
  await runTestsWithResultCollection();
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('执行测试脚本时出现错误:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests: runTestsWithResultCollection
}; 