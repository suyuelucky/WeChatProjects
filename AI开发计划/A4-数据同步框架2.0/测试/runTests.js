/**
 * 测试运行入口
 * 
 * 创建时间: 2025-04-08 21:55:51
 * 创建者: Claude-3.7-Sonnet
 * 文档分类: 测试入口
 */

'use strict';

// 加载测试运行器
var TestRunner = require('./测试工具/TestRunner');

// 加载所有测试套件
require('./冲突解决/冲突解决器测试套件');

/**
 * 命令行参数处理
 */
function parseArguments() {
  var args = process.argv.slice(2);
  var options = {
    suiteNames: [],
    verbose: false
  };
  
  for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--suite' || arg === '-s') {
      if (i + 1 < args.length) {
        options.suiteNames.push(args[++i]);
      }
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else {
      options.suiteNames.push(arg);
    }
  }
  
  return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log('使用方法: node runTests.js [options] [suite names]');
  console.log('');
  console.log('选项:');
  console.log('  --verbose, -v       显示详细输出');
  console.log('  --suite, -s NAME    指定要运行的测试套件');
  console.log('  --help, -h          显示帮助信息');
  console.log('');
  console.log('示例:');
  console.log('  node runTests.js                      运行所有测试套件');
  console.log('  node runTests.js -s ConflictResolver  运行指定的测试套件');
  console.log('  node runTests.js -v                   显示详细输出');
}

/**
 * 程序入口
 */
function main() {
  var options = parseArguments();
  
  // 设置全局日志级别
  console.level = options.verbose ? 'debug' : 'info';
  
  // 运行测试
  TestRunner.runTests(options.suiteNames.length > 0 ? options.suiteNames : null)
    .then(function(results) {
      // 根据测试结果设置退出码
      var exitCode = results.failed > 0 || results.errors > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(function(error) {
      console.error('测试运行失败:', error);
      process.exit(1);
    });
}

// 运行主程序
main(); 