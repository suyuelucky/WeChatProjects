/**
 * 小程序服务测试运行器
 * 用于执行所有测试套件并输出结果
 */

const path = require('path');
const fs = require('fs');

// 模拟Jest的expect API
const expect = {
  toBeDefined: (value) => {
    if (value === undefined) throw new Error('Expected value to be defined, but it was undefined');
    return { not: { toBeDefined: (value) => { if (value !== undefined) throw new Error('Expected value to be undefined, but it was defined'); } } };
  },
  toBe: (value, expected) => {
    if (value !== expected) throw new Error(`Expected ${value} to be ${expected}`);
    return { not: { toBe: (value, expected) => { if (value === expected) throw new Error(`Expected ${value} not to be ${expected}`); } } };
  },
  toBeNull: (value) => {
    if (value !== null) throw new Error(`Expected value to be null, but got ${value}`);
    return { not: { toBeNull: (value) => { if (value === null) throw new Error('Expected value not to be null'); } } };
  },
  toHaveBeenCalled: (mock) => {
    if (mock.mock && (!mock.mock.calls || mock.mock.calls.length === 0)) {
      throw new Error('Expected mock to have been called, but it was not called');
    }
    return { not: { toHaveBeenCalled: (mock) => {
      if (mock.mock && mock.mock.calls && mock.mock.calls.length > 0) {
        throw new Error('Expected mock not to have been called, but it was called');
      }
    }}};
  }
};

// 模拟Jest的模块
global.jest = {
  fn: () => {
    const mock = function(...args) {
      mock.mock.calls.push(args);
      return mock.mockImplementation ? mock.mockImplementation(...args) : undefined;
    };
    mock.mock = {
      calls: []
    };
    mock.mockImplementation = function(fn) {
      mock.implementation = fn;
      return mock;
    };
    mock.mockReturnValue = function(value) {
      mock.implementation = () => value;
      return mock;
    };
    mock.mockClear = function() {
      mock.mock.calls = [];
    };
    return mock;
  },
  clearAllMocks: () => {
    // 清除所有模拟的统计数据
  },
  spyOn: (obj, method) => {
    const original = obj[method];
    const mock = jest.fn();
    obj[method] = mock;
    mock.mockRestore = () => {
      obj[method] = original;
    };
    return mock;
  },
  restoreAllMocks: () => {
    // 恢复所有模拟
  }
};

// 模拟Jest的测试API
global.describe = (name, fn) => {
  console.log(`\n== 测试组: ${name} ==`);
  fn();
};

global.test = (name, fn) => {
  try {
    console.log(`  测试: ${name}`);
    fn();
    console.log('  ✅ 通过');
    return true;
  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`);
    return false;
  }
};

global.beforeAll = (fn) => {
  try {
    fn();
  } catch (error) {
    console.error(`BeforeAll 失败: ${error.message}`);
  }
};

global.afterAll = (fn) => {
  try {
    fn();
  } catch (error) {
    console.error(`AfterAll 失败: ${error.message}`);
  }
};

global.beforeEach = (fn) => {
  global._beforeEachFn = fn;
};

// 在测试前执行beforeEach
const originalTest = global.test;
global.test = (name, fn) => {
  return originalTest(name, () => {
    if (global._beforeEachFn) global._beforeEachFn();
    fn();
  });
};

// 模拟wx对象
global.wx = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  getNetworkType: jest.fn().mockImplementation((options) => {
    if (options && options.success) options.success({ networkType: 'wifi' });
  }),
  onNetworkStatusChange: jest.fn(),
  onMemoryWarning: jest.fn(),
  cloud: {
    init: jest.fn(),
    inited: false
  },
  getSystemInfoSync: jest.fn().mockReturnValue({
    platform: 'ios',
    model: 'iPhone X',
    system: 'iOS 14.0'
  }),
  removeSavedFile: jest.fn(),
  env: {
    USER_DATA_PATH: '/user/data/path'
  }
};

// 导出expect供测试使用
global.expect = expect;

// 主函数
function runTests() {
  console.log('===== 小程序服务测试执行器 =====');
  console.log('开始时间:', new Date().toLocaleString());
  
  // 获取所有测试文件
  const testDir = __dirname;
  const testFiles = fs.readdirSync(testDir)
    .filter(file => file.includes('测试套件') && (file.endsWith('.js') || file.endsWith('.cjs')));
  
  console.log(`找到 ${testFiles.length} 个测试套件文件\n`);
  
  let passedTests = 0;
  let failedTests = 0;
  
  // 执行测试文件
  testFiles.forEach(file => {
    console.log(`\n>> 执行测试套件: ${file}`);
    try {
      const testModule = require(path.join(testDir, file));
      console.log(`<< 测试套件执行完成: ${file}\n`);
      passedTests++;
    } catch (error) {
      console.error(`<< 测试套件执行失败: ${file}`);
      console.error(error);
      failedTests++;
    }
  });
  
  console.log('\n===== 测试执行结果 =====');
  console.log(`总测试套件: ${testFiles.length}`);
  console.log(`通过: ${passedTests}`);
  console.log(`失败: ${failedTests}`);
  console.log('结束时间:', new Date().toLocaleString());
}

// 执行所有测试
runTests(); 