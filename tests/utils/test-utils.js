/**
 * 测试工具函数
 * 提供测试环境初始化、清理和模拟数据生成等功能
 */

// 测试环境配置
const testEnvironment = {
  initialized: false,
  mocks: {},
  cleanupTasks: []
};

/**
 * 初始化测试环境
 * @returns {Promise} 初始化结果
 */
export function initTestEnvironment() {
  console.log('[TestUtils] 初始化测试环境');
  
  return new Promise((resolve) => {
    // 模拟异步初始化
    setTimeout(() => {
      testEnvironment.initialized = true;
      console.log('[TestUtils] 测试环境初始化完成');
      resolve(true);
    }, 100);
  });
}

/**
 * 清理测试环境
 * @returns {Promise} 清理结果
 */
export function cleanupTestEnvironment() {
  console.log('[TestUtils] 清理测试环境');
  
  return new Promise((resolve) => {
    // 执行所有清理任务
    const cleanupPromises = testEnvironment.cleanupTasks.map(task => {
      return task();
    });
    
    // 清理完成后重置环境
    Promise.all(cleanupPromises)
      .then(() => {
        testEnvironment.initialized = false;
        testEnvironment.mocks = {};
        testEnvironment.cleanupTasks = [];
        console.log('[TestUtils] 测试环境清理完成');
        resolve(true);
      })
      .catch(err => {
        console.error('[TestUtils] 清理过程中发生错误:', err);
        resolve(false);
      });
  });
}

/**
 * 注册清理任务
 * @param {Function} task 清理任务函数
 */
export function registerCleanupTask(task) {
  if (typeof task === 'function') {
    testEnvironment.cleanupTasks.push(task);
  }
}

/**
 * 模拟微信接口
 * @param {String} apiName 接口名称
 * @param {Function} mockImplementation 模拟实现
 * @returns {Object} 包含恢复函数的对象
 */
export function mockWxApi(apiName, mockImplementation) {
  if (!global.wx) {
    global.wx = {};
  }
  
  const originalApi = global.wx[apiName];
  global.wx[apiName] = mockImplementation;
  
  // 注册清理任务，恢复原始API
  registerCleanupTask(() => {
    if (originalApi) {
      global.wx[apiName] = originalApi;
    } else {
      delete global.wx[apiName];
    }
  });
  
  return {
    restore: () => {
      if (originalApi) {
        global.wx[apiName] = originalApi;
      } else {
        delete global.wx[apiName];
      }
    }
  };
}

/**
 * 模拟应用实例
 * @param {Object} partialApp 部分应用实例
 * @returns {Function} getApp函数
 */
export function mockApp(partialApp) {
  global.getApp = () => {
    return {
      globalData: {},
      services: {
        photoService: {
          savePhotos: () => Promise.resolve([]),
          uploadPhotos: () => Promise.resolve([]),
          getUploadStatus: () => Promise.resolve([]),
          getPhotos: () => Promise.resolve([])
        },
        storageService: {
          saveFile: () => Promise.resolve({}),
          getFile: () => Promise.resolve({}),
          removeFile: () => Promise.resolve(true)
        },
        ...partialApp?.services
      },
      ...partialApp
    };
  };
  
  // 注册清理任务
  registerCleanupTask(() => {
    delete global.getApp;
  });
  
  return global.getApp;
}

/**
 * 等待指定时间
 * @param {Number} ms 等待毫秒数
 * @returns {Promise} 等待Promise
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 断言测试结果
 * @param {Boolean} condition 断言条件
 * @param {String} message 断言消息
 * @returns {Boolean} 断言结果
 */
export function assert(condition, message) {
  if (!condition) {
    console.error(`[Assertion Error] ${message}`);
    return false;
  }
  return true;
}

// 默认导出，兼容性支持
export default {
  initTestEnvironment,
  cleanupTestEnvironment,
  registerCleanupTask,
  mockWxApi,
  mockApp,
  wait,
  assert
}; 