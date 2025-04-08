const wx = require('./miniprogram/utils/testing/wx-mock');

// 模拟固定的日期时间
const FIXED_TIMESTAMP = 1672574400000; // 2023-01-01T12:00:00.000Z
const mockDate = new Date(FIXED_TIMESTAMP);

// 全局模拟 Date
const RealDate = Date;
global.Date = class extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      return mockDate;
    }
    return new RealDate(...args);
  }

  static now() {
    return FIXED_TIMESTAMP;
  }
};

// 使用假定时器
jest.useFakeTimers();

// 确保wx对象始终可用
if (!global.wx) {
  global.wx = wx;
}

// 每个测试前重置 wx 模拟
beforeEach(() => {
  wx._reset();
  jest.clearAllMocks();
  
  // 确保每次测试前wx对象都被注入到全局
  global.wx = wx;
});

// 全局辅助函数
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 全局错误处理
process.on('unhandledRejection', (error) => {
  console.error('未处理的Promise拒绝:', error);
});

// 设置测试环境
process.env.NODE_ENV = 'test';

// 扩展预期方法
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// 设置全局超时时间
jest.setTimeout(10000); 