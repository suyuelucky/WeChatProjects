/**
 * B1功能云存储测试运行脚本
 * 运行照片云存储上传相关测试用例
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 测试配置
 */
const testConfig = {
  // 测试模块路径
  testModulePath: './测试模块/TC-B1-01云存储上传测试',
  
  // 测试报告输出路径
  reportOutputPath: './测试报告/B1云存储测试',
  
  // 是否显示详细日志
  verbose: true,
  
  // 是否在测试失败时继续运行
  continueOnError: true
};

/**
 * 运行测试
 */
async function runTests() {
  console.log('开始运行B1云存储测试...');
  
  // 确保输出目录存在
  ensureDirectoryExists(testConfig.reportOutputPath);
  
  // 加载测试配置
  const testModuleConfigPath = path.join(__dirname, testConfig.testModulePath, 'test-config.json');
  const testModuleConfig = JSON.parse(fs.readFileSync(testModuleConfigPath, 'utf8'));
  console.log('加载测试配置:', testModuleConfig.name);
  
  // 加载测试文件
  const testFiles = testModuleConfig.testFiles.map(function(file) {
    return path.join(__dirname, testConfig.testModulePath, file);
  });
  
  console.log('即将运行以下测试:');
  testFiles.forEach(function(file, index) {
    console.log((index + 1) + '. ' + path.basename(file));
  });
  
  // 运行测试
  const testPromises = [];
  for (const file of testFiles) {
    testPromises.push(runSingleTest(file));
  }
  
  try {
    const results = await Promise.all(testPromises);
    const successCount = results.filter(function(r) { return r.success; }).length;
    const failCount = results.length - successCount;
    
    console.log('\n测试完成!');
    console.log('共运行: ' + results.length + ' 个测试');
    console.log('成功: ' + successCount + ', 失败: ' + failCount);
    
    // 生成报告
    generateReport(results);
  } catch (err) {
    console.error('测试执行过程中发生错误:', err);
  }
}

/**
 * 运行单个测试
 * @param {String} testFile 测试文件路径
 * @returns {Promise<Object>} 测试结果
 */
async function runSingleTest(testFile) {
  try {
    console.log('\n执行测试:', path.basename(testFile));
    
    // 加载测试模块
    const testModule = await import(testFile);
    
    // 运行测试
    const testResult = testModule.default.run({
      verbose: testConfig.verbose
    });
    
    // 处理同步和异步测试结果
    if (testResult instanceof Promise) {
      try {
        const result = await testResult;
        logTestResult(testFile, result);
        return result;
      } catch (err) {
        const result = createErrorResult(testFile, err);
        logTestResult(testFile, result);
        return result;
      }
    } else {
      logTestResult(testFile, testResult);
      return testResult;
    }
  } catch (err) {
    const result = createErrorResult(testFile, err);
    logTestResult(testFile, result);
    return result;
  }
}

/**
 * 创建错误结果对象
 * @param {String} testFile 测试文件
 * @param {Error} err 错误
 * @returns {Object} 错误结果
 */
function createErrorResult(testFile, err) {
  return {
    name: path.basename(testFile),
    description: '测试执行出错',
    startTime: Date.now(),
    endTime: Date.now(),
    success: false,
    results: [],
    errors: [err.message || '未知错误']
  };
}

/**
 * 记录测试结果
 * @param {String} testFile 测试文件
 * @param {Object} result 测试结果
 */
function logTestResult(testFile, result) {
  var statusText = result.success ? '成功' : '失败';
  var duration = (result.endTime - result.startTime) / 1000;
  
  console.log('测试 [' + path.basename(testFile) + '] ' + statusText + 
              ' (用时: ' + duration.toFixed(2) + 's)');
  
  if (testConfig.verbose) {
    if (result.results && result.results.length > 0) {
      console.log('测试步骤:');
      result.results.forEach(function(step, index) {
        console.log('  ' + (index + 1) + '. ' + step.step + ' - ' + step.status);
        if (step.details) {
          console.log('     ' + step.details);
        }
      });
    }
    
    if (result.errors && result.errors.length > 0) {
      console.log('错误:');
      result.errors.forEach(function(error, index) {
        console.log('  ' + (index + 1) + '. ' + error);
      });
    }
  }
}

/**
 * 确保目录存在
 * @param {String} dirPath 目录路径
 */
function ensureDirectoryExists(dirPath) {
  const absolutePath = path.resolve(__dirname, dirPath);
  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath, { recursive: true });
  }
}

/**
 * 生成测试报告
 * @param {Array} results 测试结果数组
 */
function generateReport(results) {
  var timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  var reportFilePath = path.join(__dirname, testConfig.reportOutputPath, 'report-' + timestamp + '.json');
  
  var report = {
    timestamp: timestamp,
    totalTests: results.length,
    successCount: results.filter(function(r) { return r.success; }).length,
    failCount: results.filter(function(r) { return !r.success; }).length,
    results: results
  };
  
  // 写入JSON报告
  fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2));
  console.log('测试报告已保存至:', reportFilePath);
  
  // 生成Markdown报告
  generateMarkdownReport(report, reportFilePath.replace('.json', '.md'));
}

/**
 * 生成Markdown格式测试报告
 * @param {Object} report 测试报告
 * @param {String} outputPath 输出路径
 */
function generateMarkdownReport(report, outputPath) {
  var content = [
    '# B1照片云存储功能测试报告',
    '',
    '## 测试概览',
    '',
    '- **时间**: ' + new Date(report.timestamp).toLocaleString(),
    '- **测试总数**: ' + report.totalTests,
    '- **成功**: ' + report.successCount,
    '- **失败**: ' + report.failCount,
    '- **成功率**: ' + (report.successCount / report.totalTests * 100).toFixed(2) + '%',
    '',
    '## 测试详情',
    ''
  ];
  
  report.results.forEach(function(result, index) {
    var statusEmoji = result.success ? '✅' : '❌';
    var duration = (result.endTime - result.startTime) / 1000;
    
    content.push('### ' + (index + 1) + '. ' + result.name + ' ' + statusEmoji);
    content.push('');
    content.push('- **描述**: ' + result.description);
    content.push('- **耗时**: ' + duration.toFixed(2) + '秒');
    content.push('- **状态**: ' + (result.success ? '成功' : '失败'));
    content.push('');
    
    if (result.results && result.results.length > 0) {
      content.push('#### 测试步骤');
      content.push('');
      content.push('| 步骤 | 状态 | 详情 |');
      content.push('|------|------|------|');
      
      result.results.forEach(function(step) {
        var stepStatus = '';
        switch (step.status) {
          case 'success': stepStatus = '✅ 成功'; break;
          case 'partial': stepStatus = '⚠️ 部分成功'; break;
          case 'error': stepStatus = '❌ 错误'; break;
          default: stepStatus = step.status;
        }
        
        content.push('| ' + step.step + ' | ' + stepStatus + ' | ' + (step.details || '') + ' |');
      });
      
      content.push('');
    }
    
    if (result.errors && result.errors.length > 0) {
      content.push('#### 错误');
      content.push('');
      result.errors.forEach(function(error, errorIndex) {
        content.push((errorIndex + 1) + '. ' + error);
      });
      content.push('');
    }
  });
  
  // 写入Markdown报告
  fs.writeFileSync(outputPath, content.join('\n'));
  console.log('Markdown测试报告已保存至:', outputPath);
}

// 确保目录结构
ensureDirectoryExists(testConfig.reportOutputPath);

// 执行测试
runTests(); 