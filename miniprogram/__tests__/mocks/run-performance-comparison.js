/**
 * localStorage性能比较测试运行脚本
 * 
 * 创建时间: 2025年04月09日
 * 创建者: Claude 3.7 Sonnet
 * 更新时间: 2025年04月09日
 */

'use strict';

const jest = require('jest');

// 测试配置
const config = {
  // 专门针对性能比较测试的配置
  testMatch: ['**/__tests__/localStorage-performance.test.js'],
  verbose: true,
  testEnvironment: 'jsdom', // 使用jsdom环境以便能够访问localStorage
  reporters: 'default',
  testTimeout: 60000, // 增加超时时间，因为性能测试可能需要更长时间
};

console.log('开始运行localStorage性能比较测试...');
console.log('测试文件: localStorage-performance.test.js');

// 运行测试
jest.runCLI(config, [process.cwd()])
  .then(({ results }) => {
    console.log(`\n性能比较测试完成!`);
    console.log(`共运行 ${results.numTotalTests} 个测试`);
    console.log(`测试耗时: ${results.startTime ? (Date.now() - results.startTime) / 1000 : '未知'} 秒`);
    
    if (results.success) {
      console.log('所有性能比较测试通过!');
      console.log('\n性能测试结果摘要:');
      console.log('- 模拟localStorage和真实localStorage的性能已比较');
      console.log('- 测试涵盖了不同数据大小和操作类型');
      console.log('- 详细结果请查看测试输出日志');
    } else {
      console.error('部分测试失败，请检查日志获取详细信息');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('测试执行过程中发生错误:', error);
    process.exit(1);
  }); 