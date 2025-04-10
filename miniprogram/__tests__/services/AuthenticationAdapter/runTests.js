/**
 * AuthenticationAdapter测试运行脚本
 * 
 * 创建时间: 2025-04-09 15:06:22 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 测试运行脚本
 */

// 测试运行器
var testRunner = require('../../test-runner');
var testIndex = require('./index.test');

/**
 * 运行所有测试
 * @param {Object} options 运行选项
 * @param {boolean} options.verbose 是否显示详细日志
 * @param {string} options.filter 测试过滤条件
 * @param {string} options.priority 按优先级过滤 (P0/P1/P2)
 * @param {string} options.category 按类别过滤
 */
function runAllTests(options) {
  options = options || {};
  
  console.log('=====================================');
  console.log('开始运行 AuthenticationAdapter 测试套件');
  console.log('=====================================');
  
  // 导入并运行测试
  testRunner.runTestSuite('./index.test.js', {
    filter: options.filter,
    priority: options.priority,
    category: options.category,
    verbose: options.verbose
  });
}

/**
 * 运行单个测试文件
 * @param {string} testFile 测试文件名
 * @param {Object} options 运行选项
 */
function runSingleTest(testFile, options) {
  options = options || {};
  
  console.log('=====================================');
  console.log('运行测试文件: ' + testFile);
  console.log('=====================================');
  
  testRunner.runTestFile(testFile, {
    verbose: options.verbose
  });
}

/**
 * 按优先级运行测试
 * @param {string} priority 优先级 (P0/P1/P2)
 * @param {Object} options 运行选项
 */
function runByPriority(priority, options) {
  options = options || {};
  options.priority = priority;
  
  console.log('=====================================');
  console.log('运行优先级为 ' + priority + ' 的测试');
  console.log('描述: ' + testIndex.priorities[priority]);
  console.log('=====================================');
  
  runAllTests(options);
}

/**
 * 按类别运行测试
 * @param {string} category 测试类别
 * @param {Object} options 运行选项
 */
function runByCategory(category, options) {
  options = options || {};
  options.category = category;
  
  console.log('=====================================');
  console.log('运行类别为 "' + category + '" 的测试');
  console.log('描述: ' + testIndex.categories[category]);
  console.log('=====================================');
  
  runAllTests(options);
}

/**
 * 按覆盖范围运行测试
 * @param {string} coverage 覆盖范围
 * @param {Object} options 运行选项
 */
function runByCoverage(coverage, options) {
  options = options || {};
  
  console.log('=====================================');
  console.log('运行覆盖范围为 "' + coverage + '" 的测试');
  console.log('=====================================');
  
  var testFiles = testIndex.coverage[coverage];
  if (!testFiles || testFiles.length === 0) {
    console.error('未找到覆盖范围为 "' + coverage + '" 的测试文件');
    return;
  }
  
  testFiles.forEach(function(file) {
    runSingleTest(file, options);
  });
}

// 导出函数
module.exports = {
  runAllTests: runAllTests,
  runSingleTest: runSingleTest,
  runByPriority: runByPriority,
  runByCategory: runByCategory,
  runByCoverage: runByCoverage
};

// 如果直接运行此脚本，则运行所有测试
if (require.main === module) {
  // 解析命令行参数
  var args = process.argv.slice(2);
  var options = {};
  
  // 查找选项
  for (var i = 0; i < args.length; i++) {
    if (args[i] === '--verbose' || args[i] === '-v') {
      options.verbose = true;
    } else if (args[i] === '--filter' || args[i] === '-f') {
      options.filter = args[i + 1];
      i++;
    } else if (args[i] === '--priority' || args[i] === '-p') {
      options.priority = args[i + 1];
      i++;
    } else if (args[i] === '--category' || args[i] === '-c') {
      options.category = args[i + 1];
      i++;
    } else if (args[i] === '--coverage' || args[i] === '-cov') {
      options.coverage = args[i + 1];
      i++;
    } else if (args[i] === '--file') {
      options.file = args[i + 1];
      i++;
    }
  }
  
  // 根据不同选项执行不同运行方式
  if (options.file) {
    runSingleTest(options.file, options);
  } else if (options.coverage) {
    runByCoverage(options.coverage, options);
  } else if (options.priority) {
    runByPriority(options.priority, options);
  } else if (options.category) {
    runByCategory(options.category, options);
  } else {
    runAllTests(options);
  }
}

// 运行示例:
// 运行所有测试: node runTests.js
// 运行关键功能: node runTests.js --priority P0
// 运行安全测试: node runTests.js --category 安全测试
// 运行令牌管理相关测试: node runTests.js --coverage 令牌管理
// 运行单个测试文件: node runTests.js --file basicAuth.test.js
// 使用详细输出: node runTests.js --verbose 