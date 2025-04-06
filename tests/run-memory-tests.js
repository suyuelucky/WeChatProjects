/**
 * 内存管理优化测试运行器
 * 用于执行TC-B1-02内存管理优化测试
 * 遵循ES5标准，确保在微信小程序环境兼容
 */

var fs = require('fs');
var path = require('path');

// 测试配置
var testConfig = {
  testModulePath: 'tests/测试模块/TC-B1-02内存管理优化测试',
  outputPath: 'tests/测试模块/测试结果',
  verbose: true,
  stopOnError: false,
  retryFailed: true,
  timeout: 120000  // 默认超时时间：2分钟
};

/**
 * 运行测试
 * @param {Object} options 运行选项
 * @returns {Promise} 测试结果Promise
 */
function runTests(options) {
  options = options || {};
  var config = Object.assign({}, testConfig, options);
  
  console.log('-------------------------------------');
  console.log('开始运行内存管理优化测试');
  console.log('测试模块: ' + config.testModulePath);
  console.log('-------------------------------------');
  
  // 确保输出目录存在
  ensureDirectoryExists(config.outputPath);
  
  // 加载测试配置
  var testConfigPath = path.join(config.testModulePath, 'test-config.json');
  var testConfig;
  
  try {
    testConfig = require('../' + testConfigPath);
    console.log('已加载测试配置: ' + testConfig.name);
  } catch (err) {
    console.error('无法加载测试配置:', err);
    return Promise.reject(err);
  }
  
  // 加载测试文件
  var testFile = path.join(config.testModulePath, testConfig.testFiles[0]);
  var test;
  
  try {
    test = require('../' + testFile);
    console.log('已加载测试文件: ' + testFile);
  } catch (err) {
    console.error('无法加载测试文件:', err);
    return Promise.reject(err);
  }
  
  var testStartTime = Date.now();
  var testId = generateTestId();
  
  console.log('开始执行测试 (ID: ' + testId + ')');
  
  // 运行测试
  return runSingleTest(test, testConfig, testId, config)
    .then(function(result) {
      var testDuration = Date.now() - testStartTime;
      console.log('测试执行完成，耗时: ' + testDuration + 'ms');
      
      // 生成报告
      var reportPath = path.join(config.outputPath, testId + '.json');
      saveJsonReport(reportPath, result);
      
      var mdReportPath = path.join(config.outputPath, testId + '.md');
      saveMarkdownReport(mdReportPath, result, testDuration);
      
      return {
        success: result.success,
        testId: testId,
        duration: testDuration,
        reports: {
          json: reportPath,
          markdown: mdReportPath
        }
      };
    })
    .catch(function(err) {
      console.error('测试执行过程中发生错误:', err);
      
      var errorResult = createErrorResult(err, testId);
      var reportPath = path.join(config.outputPath, testId + '_error.json');
      saveJsonReport(reportPath, errorResult);
      
      return Promise.reject(errorResult);
    });
}

/**
 * 运行单个测试
 * @param {Object} test 测试模块
 * @param {Object} testConfig 测试配置
 * @param {String} testId 测试ID
 * @param {Object} options 运行选项
 * @returns {Promise} 测试结果Promise
 */
function runSingleTest(test, testConfig, testId, options) {
  return new Promise(function(resolve, reject) {
    // 设置超时处理
    var timeoutHandler = setTimeout(function() {
      reject(new Error('测试执行超时 (' + options.timeout + 'ms)'));
    }, options.timeout);
    
    try {
      // 执行测试
      var result = test.run({
        testId: testId,
        testConfig: testConfig
      });
      
      // 如果返回Promise，等待完成
      if (result && typeof result.then === 'function') {
        result
          .then(function(testResult) {
            clearTimeout(timeoutHandler);
            logTestResult(testResult, options.verbose);
            resolve(testResult);
          })
          .catch(function(err) {
            clearTimeout(timeoutHandler);
            console.error('测试执行失败:', err);
            reject(err);
          });
      } else {
        // 同步返回结果
        clearTimeout(timeoutHandler);
        logTestResult(result, options.verbose);
        resolve(result);
      }
    } catch (err) {
      clearTimeout(timeoutHandler);
      console.error('测试执行过程中出现异常:', err);
      reject(err);
    }
  });
}

/**
 * 创建错误结果对象
 * @param {Error} error 错误对象
 * @param {String} testId 测试ID
 * @returns {Object} 错误结果
 */
function createErrorResult(error, testId) {
  return {
    testId: testId,
    name: '内存管理优化测试',
    success: false,
    startTime: Date.now(),
    endTime: Date.now(),
    error: error.message || '未知错误',
    stack: error.stack,
    results: []
  };
}

/**
 * 记录测试结果
 * @param {Object} result 测试结果
 * @param {Boolean} verbose 是否详细输出
 */
function logTestResult(result, verbose) {
  console.log('-------------------------------------');
  console.log('测试结果: ' + (result.success ? '成功' : '失败'));
  console.log('测试名称: ' + result.name);
  console.log('执行时间: ' + new Date(result.startTime).toLocaleString());
  console.log('耗时: ' + (result.endTime - result.startTime) + 'ms');
  
  if (verbose) {
    console.log('-------------------------------------');
    console.log('详细结果:');
    
    (result.results || []).forEach(function(step, index) {
      console.log((index + 1) + '. ' + step.step + ' - ' + step.status);
      if (step.details) {
        console.log('   ' + step.details);
      }
    });
  }
  
  if (result.errors && result.errors.length > 0) {
    console.log('-------------------------------------');
    console.log('错误:');
    result.errors.forEach(function(error, index) {
      console.log((index + 1) + '. ' + error);
    });
  }
  
  console.log('-------------------------------------');
}

/**
 * 保存JSON报告
 * @param {String} filePath 文件路径
 * @param {Object} result 测试结果
 */
function saveJsonReport(filePath, result) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log('JSON报告已保存: ' + filePath);
  } catch (err) {
    console.error('保存JSON报告失败:', err);
  }
}

/**
 * 保存Markdown报告
 * @param {String} filePath 文件路径
 * @param {Object} result 测试结果
 * @param {Number} duration 测试持续时间
 */
function saveMarkdownReport(filePath, result, duration) {
  try {
    var content = [
      '# ' + result.name + ' 测试报告',
      '',
      '- **测试ID**: ' + result.testId,
      '- **测试结果**: ' + (result.success ? '✅ 通过' : '❌ 失败'),
      '- **执行时间**: ' + new Date(result.startTime).toLocaleString(),
      '- **耗时**: ' + duration + 'ms',
      '',
      '## 测试步骤结果',
      ''
    ];
    
    (result.results || []).forEach(function(step, index) {
      var statusIcon = step.status === 'success' ? '✅' : 
                       step.status === 'partial' ? '⚠️' : '❌';
      
      content.push('### ' + (index + 1) + '. ' + step.step + ' ' + statusIcon);
      content.push('');
      
      if (step.details) {
        content.push(step.details);
        content.push('');
      }
    });
    
    if (result.errors && result.errors.length > 0) {
      content.push('## 错误信息');
      content.push('');
      
      result.errors.forEach(function(error, index) {
        content.push((index + 1) + '. ' + error);
      });
      
      content.push('');
    }
    
    fs.writeFileSync(filePath, content.join('\n'));
    console.log('Markdown报告已保存: ' + filePath);
  } catch (err) {
    console.error('保存Markdown报告失败:', err);
  }
}

/**
 * 确保目录存在
 * @param {String} dirPath 目录路径
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log('创建目录: ' + dirPath);
    } catch (err) {
      console.error('创建目录失败:', err);
    }
  }
}

/**
 * 生成测试ID
 * @returns {String} 测试ID
 */
function generateTestId() {
  var timestamp = Date.now();
  var random = Math.floor(Math.random() * 10000);
  return 'memory_test_' + timestamp + '_' + random;
}

// 如果直接运行此脚本
if (require.main === module) {
  runTests()
    .then(function(result) {
      console.log('测试完成:', result.success ? '成功' : '失败');
      console.log('报告路径:', result.reports.markdown);
      
      // 退出码
      process.exit(result.success ? 0 : 1);
    })
    .catch(function(err) {
      console.error('测试运行失败:', err);
      process.exit(1);
    });
}

module.exports = {
  runTests: runTests
}; 