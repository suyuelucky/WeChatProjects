/**
 * localStorage模拟实现性能测试运行脚本
 * 
 * 创建时间: 2025年04月09日
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

const jest = require('jest');

// 设置Jest配置
const jestConfig = {
  testMatch: [
    '**/localStorage.mock.test.js'
  ],
  verbose: true,
  testEnvironment: 'node',
  reporters: ['default']
};

// 运行测试
console.log('开始运行LocalStorageMock性能测试...');
jest.runCLI(jestConfig, [__dirname])
  .then(({ results }) => {
    if (results.success) {
      console.log('所有性能测试通过！');
      console.log(`测试结果摘要: 运行了 ${results.numTotalTests} 个测试用例，耗时 ${results.startTime}ms`);
    } else {
      console.error('性能测试失败！');
      console.error(`失败测试数量: ${results.numFailedTests}/${results.numTotalTests}`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('测试执行过程中发生错误:', error);
    process.exit(1);
  }); 