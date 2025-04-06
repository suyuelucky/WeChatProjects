#!/usr/bin/env node
/**
 * B1基础照片采集功能 - 全面测试脚本
 * 此脚本运行所有单元测试、集成测试和模糊测试
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');  // 注：如果未安装，请使用 npm install chalk 安装

// 测试配置
const CONFIG = {
  testReportDir: path.resolve(__dirname, 'test-reports'),
  summaryFile: path.resolve(__dirname, 'test-reports/test-summary.html'),
  timeout: 120000 // 2分钟超时
};

// 确保测试报告目录存在
if (!fs.existsSync(CONFIG.testReportDir)) {
  fs.mkdirSync(CONFIG.testReportDir, { recursive: true });
}

// 要运行的测试类型
const TEST_TYPES = [
  {
    name: '单元测试',
    command: 'jest',
    args: ['--config', path.resolve(__dirname, '../jest.config.js')],
    description: '运行Jest单元测试覆盖核心函数逻辑'
  },
  {
    name: '集成测试',
    command: 'node',
    args: [path.resolve(__dirname, '自动化测试脚本/camera-integration-test.js')],
    description: '运行相机组件的集成测试'
  },
  {
    name: '模糊测试',
    command: 'node',
    args: [path.resolve(__dirname, '自动化测试脚本/fuzz-test.js')],
    description: '通过随机和异常输入测试系统的稳定性'
  },
  {
    name: '性能测试',
    command: 'node',
    args: [path.resolve(__dirname, '自动化测试脚本/performance-test.js')],
    description: '测试系统处理大量照片和数据的性能'
  }
];

// 测试结果汇总
const testResults = {
  startTime: new Date(),
  endTime: null,
  tests: []
};

/**
 * 主测试运行脚本
 * 运行所有测试并生成汇总报告
 */

// 导入测试模块
const logger = require('./utils/logger');

// 测试文件路径
const TEST_PATHS = {
  // 单元测试
  unit: [
    '../miniprogram/services/__tests__',
    '../miniprogram/utils/__tests__',
    '../miniprogram/components/__tests__'
  ],
  // 自动化测试脚本
  automation: path.resolve(__dirname, '自动化测试脚本'),
  // 测试报告输出目录
  reports: path.resolve(__dirname, 'test-reports')
};

// 确保测试报告目录存在
if (!fs.existsSync(TEST_PATHS.reports)) {
  fs.mkdirSync(TEST_PATHS.reports, { recursive: true });
}

// 测试运行配置
const runConfig = {
  startTime: new Date(),
  endTime: null,
  results: {
    unit: { passed: 0, failed: 0, total: 0 },
    integration: { passed: 0, failed: 0, total: 0 },
    compatibility: { passed: 0, failed: 0, skipped: 0, total: 0 },
    performance: { passed: 0, failed: 0, total: 0 },
    fuzz: { passed: 0, failed: 0, total: 0 }
  }
};

/**
 * 运行所有测试
 */
async function runAllTests() {
  logger.info('========== 开始执行测试套件 ==========');
  
  try {
    // 运行单元测试
    await runUnitTests();
    
    // 运行集成测试
    await runIntegrationTests();
    
    // 运行兼容性测试
    await runCompatibilityTests();
    
    // 运行性能测试
    await runPerformanceTests();
    
    // 运行模糊测试
    await runFuzzTests();
    
    // 记录测试结束时间
    runConfig.endTime = new Date();
    
    // 生成汇总报告
    generateSummaryReport();
    
    logger.success('========== 所有测试执行完成 ==========');
    logTestSummary();
    
    return true;
  } catch (error) {
    logger.error('测试执行过程中发生错误:', error);
    return false;
  }
}

/**
 * 运行单元测试
 */
async function runUnitTests() {
  logger.info('开始执行单元测试...');
  
  try {
    // 使用Jest运行单元测试
    const jestCmd = 'npx jest --config=jest.config.js';
    
    try {
      const output = execSync(jestCmd, { stdio: 'pipe' }).toString();
      logger.info(output);
      
      // 解析测试结果
      const resultMatch = output.match(/(\d+) passed, (\d+) failed, (\d+) total/);
      if (resultMatch) {
        runConfig.results.unit = {
          passed: parseInt(resultMatch[1]),
          failed: parseInt(resultMatch[2]),
          total: parseInt(resultMatch[3])
        };
      }
      
      logger.success('单元测试执行完成');
    } catch (error) {
      // Jest 返回非零退出码时会抛出异常，但测试结果仍然可用
      logger.warn('单元测试执行过程中有失败的测试:', error.message);
      
      if (error.stdout) {
        const resultMatch = error.stdout.toString().match(/(\d+) passed, (\d+) failed, (\d+) total/);
        if (resultMatch) {
          runConfig.results.unit = {
            passed: parseInt(resultMatch[1]),
            failed: parseInt(resultMatch[2]),
            total: parseInt(resultMatch[3])
          };
        }
      }
    }
  } catch (error) {
    logger.error('单元测试执行失败:', error);
    runConfig.results.unit.failed = 1;
    runConfig.results.unit.total = 1;
  }
}

/**
 * 运行集成测试
 */
async function runIntegrationTests() {
  logger.info('开始执行集成测试...');
  
  try {
    // 导入集成测试模块
    const integrationTest = require('./自动化测试脚本/camera-integration-test');
    
    // 运行集成测试
    const results = await integrationTest.runIntegrationTests();
    
    // 更新结果统计
    runConfig.results.integration = {
      passed: results.summary.passed,
      failed: results.summary.failed,
      total: results.summary.totalTests
    };
    
    logger.success('集成测试执行完成');
  } catch (error) {
    logger.error('集成测试执行失败:', error);
    runConfig.results.integration.failed = 1;
    runConfig.results.integration.total = 1;
  }
}

/**
 * 运行兼容性测试
 */
async function runCompatibilityTests() {
  logger.info('开始执行兼容性测试...');
  
  try {
    // 导入兼容性测试模块
    const compatibilityTest = require('./自动化测试脚本/compatibility-test');
    
    // 运行兼容性测试
    const results = await compatibilityTest.runCompatibilityTests();
    
    // 更新结果统计
    runConfig.results.compatibility = {
      passed: results.summary.passed,
      failed: results.summary.failed,
      skipped: results.summary.skipped,
      total: results.summary.totalTests
    };
    
    logger.success('兼容性测试执行完成');
  } catch (error) {
    logger.error('兼容性测试执行失败:', error);
    runConfig.results.compatibility.failed = 1;
    runConfig.results.compatibility.total = 1;
  }
}

/**
 * 运行性能测试
 */
async function runPerformanceTests() {
  logger.info('开始执行性能测试...');
  
  try {
    // 导入性能测试模块
    const performanceTest = require('./自动化测试脚本/performance-test');
    
    // 运行性能测试
    const results = await performanceTest.runPerformanceTests();
    
    // 更新结果统计
    runConfig.results.performance = {
      passed: results.summary.passedThreshold,
      failed: results.summary.failedThreshold,
      total: results.summary.totalTests
    };
    
    logger.success('性能测试执行完成');
  } catch (error) {
    logger.error('性能测试执行失败:', error);
    runConfig.results.performance.failed = 1;
    runConfig.results.performance.total = 1;
  }
}

/**
 * 运行模糊测试
 */
async function runFuzzTests() {
  logger.info('开始执行模糊测试...');
  
  try {
    // 导入模糊测试模块
    const fuzzTest = require('./自动化测试脚本/fuzz-test');
    
    // 运行模糊测试
    const results = await fuzzTest.runFuzzTests();
    
    // 更新结果统计
    runConfig.results.fuzz = {
      passed: results.summary.passed,
      failed: results.summary.failed,
      total: results.summary.totalTests
    };
    
    logger.success('模糊测试执行完成');
  } catch (error) {
    logger.error('模糊测试执行失败:', error);
    runConfig.results.fuzz.failed = 1;
    runConfig.results.fuzz.total = 1;
  }
}

/**
 * 生成汇总测试报告
 */
function generateSummaryReport() {
  const reportPath = path.join(TEST_PATHS.reports, 'summary-report.json');
  const htmlReportPath = path.join(TEST_PATHS.reports, 'summary-report.html');
  
  // 计算总体测试结果
  const totalResults = {
    passed: Object.values(runConfig.results).reduce((sum, result) => sum + result.passed, 0),
    failed: Object.values(runConfig.results).reduce((sum, result) => sum + result.failed, 0),
    skipped: runConfig.results.compatibility.skipped || 0,
    total: Object.values(runConfig.results).reduce((sum, result) => sum + result.total, 0)
  };
  
  // 计算通过率
  totalResults.passRate = totalResults.total > 0 
    ? ((totalResults.passed / (totalResults.total - totalResults.skipped)) * 100).toFixed(2)
    : 0;
  
  // 创建汇总报告对象
  const summaryReport = {
    startTime: runConfig.startTime,
    endTime: runConfig.endTime,
    duration: runConfig.endTime - runConfig.startTime,
    results: runConfig.results,
    totalResults: totalResults,
    testReports: {
      unit: path.join(TEST_PATHS.reports, 'unit', 'report.html'),
      integration: path.join(TEST_PATHS.reports, 'integration', 'integration-report.html'),
      compatibility: path.join(TEST_PATHS.reports, 'compatibility', 'compatibility-report.html'),
      performance: path.join(TEST_PATHS.reports, 'performance', 'performance-report.html'),
      fuzz: path.join(TEST_PATHS.reports, 'fuzz', 'fuzz-test-report.html')
    }
  };
  
  // 保存JSON报告
  fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2));
  
  // 生成HTML汇总报告
  const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>测试汇总报告 - 照片处理模块</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; }
    .summary-box { 
      background-color: #f7f7f7; 
      padding: 20px; 
      border-radius: 8px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    .results-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .results-table th { 
      background-color: #4CAF50; 
      color: white; 
      text-align: left; 
      padding: 12px 15px;
    }
    .results-table td { 
      padding: 10px 15px; 
      border-bottom: 1px solid #ddd; 
    }
    .results-table tr:hover { background-color: #f5f5f5; }
    .results-table tr:nth-child(even) { background-color: #f9f9f9; }
    .pass-rate { font-size: 24px; font-weight: bold; margin: 15px 0; }
    .high-pass { color: #4CAF50; }
    .medium-pass { color: #FFC107; }
    .low-pass { color: #F44336; }
    .timestamp { color: #777; font-size: 0.9em; }
    .links-section { margin-top: 30px; }
    .report-link {
      display: block;
      padding: 10px;
      margin-bottom: 10px;
      background-color: #e9f5e9;
      border-left: 4px solid #4CAF50;
      text-decoration: none;
      color: #333;
    }
    .report-link:hover { background-color: #d9ecd9; }
    .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #777; }
    .warning-section {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>照片处理模块测试汇总报告</h1>
    <p class="timestamp">生成时间: ${new Date().toLocaleString()}</p>
  </div>
  
  <div class="summary-box">
    <h2>测试摘要</h2>
    <p>开始时间: ${summaryReport.startTime.toLocaleString()}</p>
    <p>结束时间: ${summaryReport.endTime.toLocaleString()}</p>
    <p>总执行时间: ${(summaryReport.duration / 1000).toFixed(2)} 秒</p>
    
    <div class="pass-rate ${
      totalResults.passRate >= 90 ? 'high-pass' : 
      totalResults.passRate >= 70 ? 'medium-pass' : 'low-pass'
    }">
      总体通过率: ${totalResults.passRate}%
    </div>
    
    <p>通过测试: ${totalResults.passed} | 失败测试: ${totalResults.failed} | 跳过测试: ${totalResults.skipped} | 总计: ${totalResults.total}</p>
    
    ${totalResults.failed > 0 ? `
    <div class="warning-section">
      <strong>警告:</strong> 有 ${totalResults.failed} 个测试未通过，请查看详细报告以修复问题。
    </div>
    ` : ''}
  </div>
  
  <h2>各测试类型结果</h2>
  <table class="results-table">
    <tr>
      <th>测试类型</th>
      <th>通过</th>
      <th>失败</th>
      <th>跳过</th>
      <th>总计</th>
      <th>通过率</th>
    </tr>
    <tr>
      <td><strong>单元测试</strong></td>
      <td>${summaryReport.results.unit.passed}</td>
      <td>${summaryReport.results.unit.failed}</td>
      <td>0</td>
      <td>${summaryReport.results.unit.total}</td>
      <td>${summaryReport.results.unit.total > 0 ? ((summaryReport.results.unit.passed / summaryReport.results.unit.total) * 100).toFixed(2) : 0}%</td>
    </tr>
    <tr>
      <td><strong>集成测试</strong></td>
      <td>${summaryReport.results.integration.passed}</td>
      <td>${summaryReport.results.integration.failed}</td>
      <td>0</td>
      <td>${summaryReport.results.integration.total}</td>
      <td>${summaryReport.results.integration.total > 0 ? ((summaryReport.results.integration.passed / summaryReport.results.integration.total) * 100).toFixed(2) : 0}%</td>
    </tr>
    <tr>
      <td><strong>兼容性测试</strong></td>
      <td>${summaryReport.results.compatibility.passed}</td>
      <td>${summaryReport.results.compatibility.failed}</td>
      <td>${summaryReport.results.compatibility.skipped}</td>
      <td>${summaryReport.results.compatibility.total}</td>
      <td>${summaryReport.results.compatibility.total - summaryReport.results.compatibility.skipped > 0 ? 
        ((summaryReport.results.compatibility.passed / (summaryReport.results.compatibility.total - summaryReport.results.compatibility.skipped)) * 100).toFixed(2) : 0}%</td>
    </tr>
    <tr>
      <td><strong>性能测试</strong></td>
      <td>${summaryReport.results.performance.passed}</td>
      <td>${summaryReport.results.performance.failed}</td>
      <td>0</td>
      <td>${summaryReport.results.performance.total}</td>
      <td>${summaryReport.results.performance.total > 0 ? ((summaryReport.results.performance.passed / summaryReport.results.performance.total) * 100).toFixed(2) : 0}%</td>
    </tr>
    <tr>
      <td><strong>模糊测试</strong></td>
      <td>${summaryReport.results.fuzz.passed}</td>
      <td>${summaryReport.results.fuzz.failed}</td>
      <td>0</td>
      <td>${summaryReport.results.fuzz.total}</td>
      <td>${summaryReport.results.fuzz.total > 0 ? ((summaryReport.results.fuzz.passed / summaryReport.results.fuzz.total) * 100).toFixed(2) : 0}%</td>
    </tr>
  </table>
  
  <div class="links-section">
    <h2>详细测试报告链接</h2>
    <a class="report-link" href="${path.relative(TEST_PATHS.reports, summaryReport.testReports.unit)}" target="_blank">单元测试报告</a>
    <a class="report-link" href="${path.relative(TEST_PATHS.reports, summaryReport.testReports.integration)}" target="_blank">集成测试报告</a>
    <a class="report-link" href="${path.relative(TEST_PATHS.reports, summaryReport.testReports.compatibility)}" target="_blank">兼容性测试报告</a>
    <a class="report-link" href="${path.relative(TEST_PATHS.reports, summaryReport.testReports.performance)}" target="_blank">性能测试报告</a>
    <a class="report-link" href="${path.relative(TEST_PATHS.reports, summaryReport.testReports.fuzz)}" target="_blank">模糊测试报告</a>
  </div>
  
  <h2>测试亮点与发现的问题</h2>
  <div>
    <h3>主要发现</h3>
    <ul>
      ${summaryReport.results.unit.failed > 0 ? `<li>单元测试失败：需关注核心功能实现问题</li>` : ''}
      ${summaryReport.results.integration.failed > 0 ? `<li>集成测试失败：需关注组件交互问题</li>` : ''}
      ${summaryReport.results.compatibility.failed > 0 ? `<li>兼容性测试失败：注意低版本微信或低端设备支持问题</li>` : ''}
      ${summaryReport.results.performance.failed > 0 ? `<li>性能测试未达标：关注照片处理和上传性能优化</li>` : ''}
      ${summaryReport.results.fuzz.failed > 0 ? `<li>模糊测试发现输入验证问题：加强输入验证和异常处理</li>` : ''}
      ${totalResults.failed === 0 ? `<li>所有测试通过：照片处理模块运行良好！</li>` : ''}
    </ul>
    
    <h3>优先修复项</h3>
    <ul>
      ${summaryReport.results.unit.failed > 0 ? `<li><strong>核心功能修复</strong>：优先解决单元测试失败的问题</li>` : ''}
      ${summaryReport.results.compatibility.failed > 0 ? `<li><strong>兼容性问题</strong>：解决在低端设备或旧版本微信上的问题</li>` : ''}
      ${summaryReport.results.performance.failed > 0 ? `<li><strong>性能优化</strong>：优化照片处理和上传性能</li>` : ''}
    </ul>
  </div>
  
  <div class="footer">
    <p>照片处理模块自动化测试报告 | ${new Date().toLocaleDateString()}</p>
  </div>
</body>
</html>  
  `;
  
  fs.writeFileSync(htmlReportPath, htmlReport);
  logger.info('汇总测试报告已保存到: ' + htmlReportPath);
}

/**
 * 输出测试摘要
 */
function logTestSummary() {
  // 计算总体测试结果
  const totalResults = {
    passed: Object.values(runConfig.results).reduce((sum, result) => sum + result.passed, 0),
    failed: Object.values(runConfig.results).reduce((sum, result) => sum + result.failed, 0),
    skipped: runConfig.results.compatibility.skipped || 0,
    total: Object.values(runConfig.results).reduce((sum, result) => sum + result.total, 0)
  };
  
  // 计算通过率
  const passRate = totalResults.total > 0 
    ? ((totalResults.passed / (totalResults.total - totalResults.skipped)) * 100).toFixed(2)
    : 0;
  
  logger.info('========== 测试结果摘要 ==========');
  logger.info(`单元测试: ${runConfig.results.unit.passed}/${runConfig.results.unit.total} 通过`);
  logger.info(`集成测试: ${runConfig.results.integration.passed}/${runConfig.results.integration.total} 通过`);
  logger.info(`兼容性测试: ${runConfig.results.compatibility.passed}/${runConfig.results.compatibility.total} 通过, ${runConfig.results.compatibility.skipped} 跳过`);
  logger.info(`性能测试: ${runConfig.results.performance.passed}/${runConfig.results.performance.total} 通过标准`);
  logger.info(`模糊测试: ${runConfig.results.fuzz.passed}/${runConfig.results.fuzz.total} 通过`);
  logger.info(`总计: ${totalResults.passed}/${totalResults.total} 通过, ${totalResults.failed} 失败, ${totalResults.skipped} 跳过`);
  logger.info(`通过率: ${passRate}%`);
  logger.info(`测试报告位置: ${path.join(TEST_PATHS.reports, 'summary-report.html')}`);
}

// 如果直接运行此脚本，执行所有测试
if (require.main === module) {
  runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests
}; 