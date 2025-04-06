/**
 * 极端测试主运行文件
 * 测试目标：运行所有极端测试用例，全面验证代码健壮性
 */

// 导入测试模块
const circularDependencyTest = require('./test_cases/circular_dependency_test');
const es6CompatibilityTest = require('./test_cases/es6_compatibility_test');
const eventHandlingTest = require('./test_cases/event_handling_test');
const offlineStorageTest = require('./test_cases/offline_storage_test');

// 辅助函数：格式化测试结果显示
function formatTestResult(result) {
  return result ? '通过 ✓' : '失败 ×';
}

// 辅助函数：汇总多个测试结果
function summarizeResults(results) {
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result).length;
  return {
    totalTests,
    passedTests,
    passRate: (passedTests / totalTests * 100).toFixed(2) + '%'
  };
}

// 辅助函数：延迟执行
function sleep(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
}

// 主函数：运行所有测试
async function runAllTests() {
  console.log('======================================================');
  console.log('               极端测试套件开始执行                    ');
  console.log('======================================================');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('测试环境: Node.js', process.version);
  console.log('======================================================\n');
  
  // 1. 运行循环依赖测试
  console.log('\n🔍 开始执行循环依赖极端测试...');
  const circularResults = circularDependencyTest.runTests();
  console.log('\n循环依赖测试完成:', 
              formatTestResult(Object.values(circularResults).every(result => result)));
  
  // 等待一段时间，避免测试间相互干扰
  await sleep(500);
  
  // 2. 运行ES6兼容性测试
  console.log('\n🔍 开始执行ES6兼容性极端测试...');
  const es6Results = es6CompatibilityTest.testAllFiles();
  console.log('\nES6兼容性测试完成:', formatTestResult(es6Results.allPassed));
  
  // 等待一段时间
  await sleep(500);
  
  // 3. 运行事件处理测试
  console.log('\n🔍 开始执行事件处理极端测试...');
  const eventResults = await eventHandlingTest.runTests();
  console.log('\n事件处理测试完成:', 
              formatTestResult(Object.values(eventResults).every(result => result)));
  
  // 等待一段时间
  await sleep(500);
  
  // 4. 运行离线存储测试
  console.log('\n🔍 开始执行离线存储极端测试...');
  const storageResults = offlineStorageTest.runTests();
  console.log('\n离线存储测试完成:', 
              formatTestResult(Object.values(storageResults).every(result => result)));
  
  // 汇总所有测试结果
  const allResults = {
    circularDependency: Object.values(circularResults).every(result => result),
    es6Compatibility: es6Results.allPassed,
    eventHandling: Object.values(eventResults).every(result => result),
    offlineStorage: Object.values(storageResults).every(result => result)
  };
  
  const summary = summarizeResults(allResults);
  
  // 显示最终汇总结果
  console.log('\n\n======================================================');
  console.log('                  极端测试总体结果                    ');
  console.log('======================================================');
  console.log('循环依赖测试: ' + formatTestResult(allResults.circularDependency));
  console.log('ES6兼容性测试: ' + formatTestResult(allResults.es6Compatibility));
  console.log('事件处理测试: ' + formatTestResult(allResults.eventHandling));
  console.log('离线存储测试: ' + formatTestResult(allResults.offlineStorage));
  console.log('------------------------------------------------------');
  console.log(`总体通过率: ${summary.passedTests}/${summary.totalTests} (${summary.passRate})`);
  console.log('======================================================');
  
  // 根据测试结果给出建议
  console.log('\n📋 测试总结与建议:');
  
  if (summary.passedTests === summary.totalTests) {
    console.log('✅ 所有测试均已通过，代码质量良好，可以提交给资方进行审核。');
  } else {
    console.log('⚠️ 发现部分测试未通过，建议在提交前解决以下问题:');
    
    if (!allResults.circularDependency) {
      console.log('  - 循环依赖问题: 检查懒加载方案实现是否完整，确保模块间依赖关系清晰');
    }
    
    if (!allResults.es6Compatibility) {
      console.log('  - ES6兼容性问题: 代码中仍存在ES6特性，可能导致在低版本微信环境下运行失败');
    }
    
    if (!allResults.eventHandling) {
      console.log('  - 事件处理问题: 事件系统在极端情况下可能不稳定，需检查错误处理和并发处理');
    }
    
    if (!allResults.offlineStorage) {
      console.log('  - 离线存储问题: 存储系统在网络波动或大数据量场景下可能有异常，需加强健壮性');
    }
  }
  
  console.log('\n测试完成时间:', new Date().toLocaleString());
  console.log('======================================================');
  
  return allResults;
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('测试运行过程中发生错误:', error);
    process.exit(1);
  });
} else {
  module.exports = {
    runAllTests
  };
} 