/**
 * 工作跟踪系统 - 自动化测试运行器
 * 
 * 此脚本用于运行所有工作跟踪系统相关的测试用例
 * 支持单独测试指定的服务或页面，也可以运行全部测试
 * 
 * 使用方法:
 * node run-tests.js [service|page] [name]
 * 
 * 示例:
 * - 运行所有测试: node run-tests.js
 * - 仅测试特定服务: node run-tests.js service trace
 * - 仅测试特定页面: node run-tests.js page trace/index
 */

const jest = require('jest');
const path = require('path');
const fs = require('fs');

// 测试配置
const TEST_CONFIG = {
  // 根目录
  rootDir: path.resolve(__dirname, '..'),
  
  // 测试目录配置
  testPaths: {
    services: '../services/__tests__',
    pages: '../pages/__tests__',
    utils: '../utils/__tests__'
  },
  
  // 测试超时时间
  timeout: 30000,
  
  // 覆盖率报告目录
  coverageDir: '../coverage',
  
  // 测试报告目录
  reportDir: '../test-reports'
};

/**
 * 解析命令行参数
 * @returns {Object} 解析后的参数对象
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const params = {
    type: 'all', // 默认运行所有测试
    name: null,
    options: {
      coverage: args.includes('--coverage'),
      watch: args.includes('--watch'),
      verbose: args.includes('--verbose')
    }
  };
  
  // 如果指定了测试类型
  if (args[0] && !args[0].startsWith('--')) {
    params.type = args[0];
    
    // 如果指定了测试名称
    if (args[1] && !args[1].startsWith('--')) {
      params.name = args[1];
    }
  }
  
  return params;
}

/**
 * 生成测试配置参数
 * @param {Object} args 命令行参数
 * @returns {Object} Jest配置
 */
function buildJestConfig(args) {
  const config = {
    rootDir: TEST_CONFIG.rootDir,
    setupFiles: ['<rootDir>/tests/jest-setup.js'],
    testTimeout: TEST_CONFIG.timeout,
    verbose: args.options.verbose
  };
  
  // 按类型筛选测试
  if (args.type === 'all') {
    // 运行所有测试
    config.testMatch = [
      '<rootDir>/services/__tests__/**/*.test.js',
      '<rootDir>/utils/__tests__/**/*.test.js',
      '<rootDir>/pages/__tests__/**/*.test.js'
    ];
  } else if (args.type === 'service' && args.name) {
    // 运行特定服务的测试
    config.testMatch = [`<rootDir>/services/__tests__/*${args.name}*.test.js`];
  } else if (args.type === 'page' && args.name) {
    // 运行特定页面的测试
    config.testMatch = [`<rootDir>/pages/__tests__/*${args.name}*.test.js`];
  } else if (args.type === 'util' && args.name) {
    // 运行特定工具的测试
    config.testMatch = [`<rootDir>/utils/__tests__/*${args.name}*.test.js`];
  } else if (args.type === 'service') {
    // 运行所有服务测试
    config.testMatch = ['<rootDir>/services/__tests__/**/*.test.js'];
  } else if (args.type === 'page') {
    // 运行所有页面测试
    config.testMatch = ['<rootDir>/pages/__tests__/**/*.test.js'];
  } else if (args.type === 'util') {
    // 运行所有工具测试
    config.testMatch = ['<rootDir>/utils/__tests__/**/*.test.js'];
  }
  
  // 添加覆盖率配置
  if (args.options.coverage) {
    config.collectCoverage = true;
    config.coverageDirectory = TEST_CONFIG.coverageDir;
    config.collectCoverageFrom = [
      '<rootDir>/services/**/*.js',
      '<rootDir>/utils/**/*.js',
      '<rootDir>/pages/**/*.js',
      '!**/__tests__/**',
      '!**/node_modules/**'
    ];
  }
  
  // 添加监视选项
  if (args.options.watch) {
    config.watch = true;
  }
  
  return config;
}

/**
 * 确保测试目录存在
 */
function ensureTestDirectories() {
  // 服务测试目录
  const servicesTestDir = path.resolve(TEST_CONFIG.rootDir, 'services/__tests__');
  if (!fs.existsSync(servicesTestDir)) {
    fs.mkdirSync(servicesTestDir, { recursive: true });
  }
  
  // 页面测试目录
  const pagesTestDir = path.resolve(TEST_CONFIG.rootDir, 'pages/__tests__');
  if (!fs.existsSync(pagesTestDir)) {
    fs.mkdirSync(pagesTestDir, { recursive: true });
  }
  
  // 工具测试目录
  const utilsTestDir = path.resolve(TEST_CONFIG.rootDir, 'utils/__tests__');
  if (!fs.existsSync(utilsTestDir)) {
    fs.mkdirSync(utilsTestDir, { recursive: true });
  }
  
  // 覆盖率报告目录
  if (!fs.existsSync(path.resolve(TEST_CONFIG.rootDir, TEST_CONFIG.coverageDir))) {
    fs.mkdirSync(path.resolve(TEST_CONFIG.rootDir, TEST_CONFIG.coverageDir), { recursive: true });
  }
}

/**
 * 显示脚本帮助信息
 */
function showHelp() {
  console.log(`
工作跟踪系统 - 自动化测试运行器

使用方法:
  node run-tests.js [type] [name] [options]

参数:
  type          测试类型: service, page, util, all (默认为 all)
  name          测试名称: 服务名、页面路径或工具名

选项:
  --coverage    生成测试覆盖率报告
  --watch       监视文件变化并自动重新运行测试
  --verbose     输出详细信息

示例:
  运行所有测试:
    node run-tests.js
  
  仅测试特定服务:
    node run-tests.js service trace
  
  仅测试特定页面:
    node run-tests.js page trace/index
  
  运行服务测试并监视变化:
    node run-tests.js service --watch
  
  运行所有测试并生成覆盖率报告:
    node run-tests.js --coverage
  `);
}

/**
 * 主函数
 */
async function main() {
  // 检查帮助参数
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    return;
  }
  
  // 解析命令行参数
  const args = parseArguments();
  
  // 显示测试配置
  console.log('📋 测试配置:');
  if (args.type === 'all') {
    console.log('  - 运行所有测试');
  } else {
    console.log(`  - 类型: ${args.type}${args.name ? `, 名称: ${args.name}` : ''}`);
  }
  
  Object.entries(args.options).forEach(([key, value]) => {
    if (value) {
      console.log(`  - ${key}: ${value}`);
    }
  });
  
  // 确保测试目录存在
  ensureTestDirectories();
  
  // 生成Jest配置
  const jestConfig = buildJestConfig(args);
  
  try {
    console.log('\n🔍 开始运行测试...\n');
    
    // 运行Jest
    await jest.runCLI(jestConfig, [TEST_CONFIG.rootDir]);
    
    console.log('\n✅ 测试完成');
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error);
    process.exit(1);
  }
}

// 执行主函数
main(); 