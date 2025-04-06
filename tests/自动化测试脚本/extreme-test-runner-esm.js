/**
 * A1基础应用架构模块极端测试运行器 (ESM封装)
 * 
 * 这个文件是对CommonJS格式测试运行器的ES模块封装
 * 
 * 版本: 1.0
 * 创建日期: 2024-04-07
 */

// 使用动态导入CommonJS模块
const importModule = async () => {
  try {
    // 使用createRequire方法导入CommonJS模块
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    
    // 导入CommonJS格式的测试运行器
    const testRunner = require('./extreme-test-runner.cjs');
    
    return testRunner;
  } catch (error) {
    console.error('导入测试运行器失败:', error);
    throw error;
  }
};

// 导出函数
export const runAllTests = async (options = {}) => {
  const testRunner = await importModule();
  return testRunner.runAllTests(options);
};

export const runCircularDependencyTests = async (options = {}) => {
  const testRunner = await importModule();
  return testRunner.runCircularDependencyTests(options);
};

export const runES6CompatibilityTests = async () => {
  const testRunner = await importModule();
  return testRunner.runES6CompatibilityTests();
};

export const runEventHandlingTests = async () => {
  const testRunner = await importModule();
  return testRunner.runEventHandlingTests();
};

export const runStorageTests = async () => {
  const testRunner = await importModule();
  return testRunner.runStorageTests();
};

export const generateTestReport = async () => {
  const testRunner = await importModule();
  return testRunner.generateTestReport();
};

// 如果直接运行此脚本，执行所有测试
if (import.meta.url === new URL(import.meta.url).href) {
  runAllTests().then(report => {
    console.log('测试完成');
  }).catch(err => {
    console.error('测试运行错误:', err);
  });
}

