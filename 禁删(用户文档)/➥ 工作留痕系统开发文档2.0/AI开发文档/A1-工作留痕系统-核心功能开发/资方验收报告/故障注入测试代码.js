/**
 * 模块依赖管理测试 - 故障注入代码
 * 用于模拟模块故障，测试系统稳定性和错误传播情况
 */

// ================ EventBus故障注入 ================

/**
 * 创建有延迟的eventBus.emit方法
 * @param {number} delayMs 延迟毫秒数
 */
function createDelayedEventBus(delayMs) {
  // 获取原始eventBus模块
  const originalEventBus = require('../../miniprogram/utils/eventBus');
  
  // 保存原始emit方法
  const originalEmit = originalEventBus.emit;
  
  // 替换emit方法，添加延迟
  originalEventBus.emit = function(eventName, data) {
    console.log(`[故障注入] eventBus.emit将延迟${delayMs}毫秒触发: ${eventName}`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // 调用原始方法
          const result = originalEmit.call(this, eventName, data);
          resolve(result);
        } catch (error) {
          console.error('[故障注入] 延迟调用emit时出错:', error);
          resolve(this);
        }
      }, delayMs);
    });
  };
  
  console.log('[故障注入] 已成功注入延迟到eventBus.emit');
  return originalEventBus;
}

/**
 * 创建随机失败的eventBus.emit方法
 * @param {number} errorRate 错误概率(0-1)
 */
function createErrorEventBus(errorRate) {
  // 获取原始eventBus模块
  const originalEventBus = require('../../miniprogram/utils/eventBus');
  
  // 保存原始emit方法
  const originalEmit = originalEventBus.emit;
  
  // 替换emit方法，添加随机错误
  originalEventBus.emit = function(eventName, data) {
    if (Math.random() < errorRate) {
      console.error(`[故障注入] eventBus.emit随机失败: ${eventName}`);
      throw new Error(`[故障注入] 事件触发随机失败: ${eventName}`);
    }
    
    // 正常调用原始方法
    return originalEmit.call(this, eventName, data);
  };
  
  console.log(`[故障注入] 已成功注入随机错误(概率${errorRate})到eventBus.emit`);
  return originalEventBus;
}

// ================ StorageUtils故障注入 ================

/**
 * 创建随机失败的storage.get方法
 * @param {number} errorRate 错误概率(0-1)
 */
function createErrorStorageGet(errorRate) {
  // 获取原始storage模块
  const storageUtils = require('../../miniprogram/utils/storageUtils');
  const storage = storageUtils.storage;
  
  // 保存原始get方法
  const originalGet = storage.get;
  
  // 替换get方法，添加随机错误
  storage.get = function(key, defaultValue) {
    if (Math.random() < errorRate) {
      console.error(`[故障注入] storage.get随机失败: ${key}`);
      return Promise.reject({
        type: 'READ_ERROR',
        message: '[故障注入] 读取存储随机失败',
        key: key
      });
    }
    
    // 正常调用原始方法
    return originalGet.call(this, key, defaultValue);
  };
  
  console.log(`[故障注入] 已成功注入随机错误(概率${errorRate})到storage.get`);
  return storageUtils;
}

/**
 * 创建随机失败的storage.set方法
 * @param {number} errorRate 错误概率(0-1)
 */
function createErrorStorageSet(errorRate) {
  // 获取原始storage模块
  const storageUtils = require('../../miniprogram/utils/storageUtils');
  const storage = storageUtils.storage;
  
  // 保存原始set方法
  const originalSet = storage.set;
  
  // 替换set方法，添加随机错误
  storage.set = function(key, data, options) {
    if (Math.random() < errorRate) {
      console.error(`[故障注入] storage.set随机失败: ${key}`);
      return Promise.reject({
        type: 'WRITE_ERROR',
        message: '[故障注入] 写入存储随机失败',
        key: key
      });
    }
    
    // 正常调用原始方法
    return originalSet.call(this, key, data, options);
  };
  
  console.log(`[故障注入] 已成功注入随机错误(概率${errorRate})到storage.set`);
  return storageUtils;
}

// ================ NetworkUtils故障注入 ================

/**
 * 创建模拟网络故障的networkUtils
 * @param {string} failureType 故障类型: 'offline'|'timeout'|'serverError'
 */
function createNetworkFailure(failureType) {
  // 获取原始网络模块
  const networkUtils = require('../../miniprogram/utils/networkUtils');
  
  // 根据故障类型修改模块行为
  switch (failureType) {
    case 'offline':
      // 模拟离线状态
      networkUtils.hasNetworkConnection = () => false;
      networkUtils.getNetworkStatus = () => Promise.resolve({
        networkType: 'none',
        isConnected: false,
        signalStrength: 'unknown'
      });
      console.log('[故障注入] 已模拟网络离线状态');
      break;
      
    case 'timeout':
      // 模拟请求超时
      const originalRequest = networkUtils.request || (() => {});
      networkUtils.request = (url, options) => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('请求超时'));
          }, 100);
        });
      };
      console.log('[故障注入] 已模拟网络请求超时');
      break;
      
    case 'serverError':
      // 模拟服务器错误
      const originalFetch = networkUtils.fetch || (() => {});
      networkUtils.fetch = (url, options) => {
        return Promise.resolve({
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: '服务器内部错误' })
        });
      };
      console.log('[故障注入] 已模拟服务器错误');
      break;
  }
  
  return networkUtils;
}

// ================ 错误捕获与记录 ================

/**
 * 全局错误监听器，记录错误传播
 */
function setupErrorMonitor() {
  const errors = [];
  
  // 拦截控制台错误
  const originalConsoleError = console.error;
  console.error = function() {
    // 记录错误
    const errorInfo = {
      type: 'consoleError',
      timestamp: new Date().toISOString(),
      message: Array.from(arguments).join(' ')
    };
    errors.push(errorInfo);
    
    // 调用原始方法
    originalConsoleError.apply(console, arguments);
  };
  
  // 拦截Promise错误
  window.addEventListener('unhandledrejection', function(event) {
    const errorInfo = {
      type: 'unhandledPromiseRejection',
      timestamp: new Date().toISOString(),
      message: event.reason ? (event.reason.message || event.reason.toString()) : 'Unknown Promise Error'
    };
    errors.push(errorInfo);
  });
  
  // 拦截全局错误
  window.addEventListener('error', function(event) {
    const errorInfo = {
      type: 'globalError',
      timestamp: new Date().toISOString(),
      message: event.message || 'Unknown Error',
      source: event.filename,
      line: event.lineno
    };
    errors.push(errorInfo);
  });
  
  // 返回错误记录器
  return {
    getErrors: () => [...errors],
    clearErrors: () => { errors.length = 0; }
  };
}

// ================ 测试功能函数 ================

/**
 * 执行标准功能流程测试
 */
async function runStandardFunctionTest() {
  console.log('[测试] 开始执行标准功能流程测试...');
  
  try {
    // 模拟页面加载
    await simulatePageLoad();
    
    // 模拟用户操作
    await simulateUserOperations();
    
    // 模拟数据同步
    await simulateDataSync();
    
    console.log('[测试] 标准功能流程测试完成');
  } catch (error) {
    console.error('[测试] 标准功能流程测试失败:', error);
  }
}

/**
 * 模拟页面加载
 */
async function simulatePageLoad() {
  console.log('[测试] 模拟页面加载...');
  // 这里根据实际项目情况调用相关函数
}

/**
 * 模拟用户操作
 */
async function simulateUserOperations() {
  console.log('[测试] 模拟用户操作...');
  // 这里根据实际项目情况调用相关函数
}

/**
 * 模拟数据同步
 */
async function simulateDataSync() {
  console.log('[测试] 模拟数据同步...');
  // 这里根据实际项目情况调用相关函数
}

// ================ 导出模块 ================

module.exports = {
  // EventBus故障注入
  createDelayedEventBus,
  createErrorEventBus,
  
  // StorageUtils故障注入
  createErrorStorageGet,
  createErrorStorageSet,
  
  // NetworkUtils故障注入
  createNetworkFailure,
  
  // 错误监控
  setupErrorMonitor,
  
  // 测试函数
  runStandardFunctionTest
}; 