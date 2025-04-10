/**
 * 图片加载器网络适应性测试
 * 创建时间: 2025-04-11 16:50:22
 * 开发者: Claude AI 3.7 Sonnet
 * 
 * 测试图片加载器在各种网络环境下的适应能力和稳定性
 */

// 模拟微信环境
const WxMock = require('./mocks/wx-mock');
global.wx = new WxMock();

// 导入被测试模块
const OptimizedImageLoader = require('../utils/optimized-image-loader');
const AdaptiveLoadingStrategy = require('../utils/adaptive-loading-strategy');

// 测试配置
const TEST_CONFIG = {
  // 测试图片URL集合
  IMAGES: [
    'https://example.com/images/test1.jpg',
    'https://example.com/images/test2.jpg',
    'https://example.com/images/test3.jpg',
    'https://example.com/images/large1.jpg',
    'https://example.com/images/large2.jpg',
  ],
  // 弱网模拟配置
  WEAK_NETWORK: {
    TIMEOUT_PERCENTAGE: 30,      // 30%的请求会超时
    SLOW_RESPONSE_PERCENTAGE: 40, // 40%的请求会延迟
    MAX_DELAY: 5000,             // 最大延迟5秒
    DISCONNECT_INTERVAL: 8000,   // 每8秒断开一次连接
    RECONNECT_DELAY: 3000        // 断开后3秒重连
  },
  // 测试持续时间
  TEST_DURATION: 60000,          // 测试持续60秒
  NETWORK_TYPES: ['wifi', '4g', '3g', '2g', 'none'] // 测试的网络类型
};

/**
 * 颜色输出助手
 */
const color = {
  red: text => `\x1b[31m${text}\x1b[0m`,
  green: text => `\x1b[32m${text}\x1b[0m`,
  yellow: text => `\x1b[33m${text}\x1b[0m`,
  blue: text => `\x1b[34m${text}\x1b[0m`,
  magenta: text => `\x1b[35m${text}\x1b[0m`,
  cyan: text => `\x1b[36m${text}\x1b[0m`,
  bold: text => `\x1b[1m${text}\x1b[0m`
};

/**
 * 打印标题
 * @param {string} title - 标题文本
 */
function printTitle(title) {
  console.log('\n' + color.bold(color.cyan('====================================================')));
  console.log(color.bold(color.cyan(title)));
  console.log(color.bold(color.cyan('====================================================')) + '\n');
}

/**
 * 打印子标题
 * @param {string} subtitle - 子标题文本
 */
function printSubtitle(subtitle) {
  console.log('\n' + color.bold(color.yellow('>> ' + subtitle)));
}

/**
 * 打印结果
 * @param {string} label - 结果标签
 * @param {any} value - 结果值
 * @param {boolean} isSuccess - 是否成功
 */
function printResult(label, value, isSuccess = true) {
  const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;
  console.log(`${isSuccess ? color.green('√') : color.red('✗')} ${label}: ${isSuccess ? color.green(valueStr) : color.red(valueStr)}`);
}

/**
 * 网络波动模拟器
 */
class NetworkFluctuationSimulator {
  constructor(options = {}) {
    this.options = Object.assign({}, TEST_CONFIG.WEAK_NETWORK, options);
    this.enabled = false;
    this.currentNetworkType = 'wifi';
    this.disconnectTimerId = null;
    this.originalWxRequest = null;
    this.originalGetNetworkType = null;
  }

  /**
   * 启动模拟器
   */
  start() {
    if (this.enabled) return;
    this.enabled = true;
    
    // 备份原始wx.request和getNetworkType函数
    this.originalWxRequest = global.wx.request;
    this.originalGetNetworkType = global.wx.getNetworkType;
    
    // 模拟请求
    global.wx.request = this._mockRequest.bind(this);
    
    // 模拟网络类型获取
    global.wx.getNetworkType = this._mockGetNetworkType.bind(this);
    
    // 启动断网模拟
    this._startNetworkDisconnects();
    
    console.log(color.yellow('网络波动模拟器已启动'));
  }

  /**
   * 停止模拟器
   */
  stop() {
    if (!this.enabled) return;
    
    // 恢复原始函数
    if (this.originalWxRequest) {
      global.wx.request = this.originalWxRequest;
    }
    
    if (this.originalGetNetworkType) {
      global.wx.getNetworkType = this.originalGetNetworkType;
    }
    
    // 清除定时器
    if (this.disconnectTimerId) {
      clearInterval(this.disconnectTimerId);
      this.disconnectTimerId = null;
    }
    
    this.enabled = false;
    console.log(color.yellow('网络波动模拟器已停止'));
  }

  /**
   * 设置当前网络类型
   * @param {string} type - 网络类型
   */
  setNetworkType(type) {
    if (TEST_CONFIG.NETWORK_TYPES.includes(type)) {
      this.currentNetworkType = type;
      console.log(color.yellow(`网络类型已切换为: ${type}`));
    } else {
      console.log(color.red(`无效的网络类型: ${type}`));
    }
  }

  /**
   * 启动断网模拟
   * @private
   */
  _startNetworkDisconnects() {
    // 清除现有定时器
    if (this.disconnectTimerId) {
      clearInterval(this.disconnectTimerId);
    }
    
    // 创建新的断网模拟定时器
    this.disconnectTimerId = setInterval(() => {
      // 切换到断网状态
      const previousNetwork = this.currentNetworkType;
      this.currentNetworkType = 'none';
      console.log(color.yellow(`模拟断网: 从 ${previousNetwork} 切换到 ${this.currentNetworkType}`));
      
      // 设置重连定时器
      setTimeout(() => {
        this.currentNetworkType = previousNetwork;
        console.log(color.yellow(`模拟重连: 恢复到 ${previousNetwork}`));
      }, this.options.RECONNECT_DELAY);
      
    }, this.options.DISCONNECT_INTERVAL);
  }

  /**
   * 模拟请求
   * @param {Object} options - 请求选项
   * @private
   */
  _mockRequest(options) {
    if (!this.enabled || !options) {
      return this.originalWxRequest(options);
    }
    
    // 如果当前是断网状态
    if (this.currentNetworkType === 'none') {
      setTimeout(() => {
        if (options.fail) {
          options.fail({ errMsg: 'request:fail network disconnected' });
        }
        if (options.complete) {
          options.complete({ errMsg: 'request:fail network disconnected' });
        }
      }, 100);
      return;
    }
    
    // 随机确定是否超时
    const shouldTimeout = Math.random() * 100 < this.options.TIMEOUT_PERCENTAGE;
    if (shouldTimeout) {
      setTimeout(() => {
        if (options.fail) {
          options.fail({ errMsg: 'request:fail timeout' });
        }
        if (options.complete) {
          options.complete({ errMsg: 'request:fail timeout' });
        }
      }, 10000); // 10秒超时
      return;
    }
    
    // 随机确定是否慢响应
    const shouldDelay = Math.random() * 100 < this.options.SLOW_RESPONSE_PERCENTAGE;
    const delay = shouldDelay ? 
                 Math.floor(Math.random() * this.options.MAX_DELAY) : 
                 Math.floor(Math.random() * 300);
    
    // 根据网络类型增加额外延迟
    let networkDelay = 0;
    switch (this.currentNetworkType) {
      case '2g': networkDelay = 2000; break;
      case '3g': networkDelay = 800; break;
      case '4g': networkDelay = 200; break;
      case 'wifi': networkDelay = 50; break;
    }
    
    // 延迟后调用原始请求
    setTimeout(() => {
      // 创建一个修改过的options，修改success回调
      const modifiedOptions = {...options};
      
      const originalSuccess = options.success;
      modifiedOptions.success = (res) => {
        if (originalSuccess) {
          originalSuccess(res);
        }
      };
      
      this.originalWxRequest(modifiedOptions);
    }, delay + networkDelay);
  }

  /**
   * 模拟获取网络类型
   * @param {Object} options - 选项
   * @private
   */
  _mockGetNetworkType(options) {
    if (!this.enabled || !options) {
      return this.originalGetNetworkType(options);
    }
    
    setTimeout(() => {
      if (options.success) {
        options.success({
          networkType: this.currentNetworkType,
          isConnected: this.currentNetworkType !== 'none'
        });
      }
      if (options.complete) {
        options.complete({
          networkType: this.currentNetworkType,
          isConnected: this.currentNetworkType !== 'none'
        });
      }
    }, 50);
  }
}

/**
 * 测试网络环境切换时的加载器适应性能力
 */
async function testNetworkSwitching() {
  printSubtitle('网络环境切换适应性测试');
  
  // 创建网络波动模拟器
  const networkSimulator = new NetworkFluctuationSimulator();
  
  // 统计变量
  const stats = {
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    cacheHits: 0,
    avgLoadTimeByNetwork: {
      wifi: [],
      '4g': [],
      '3g': [],
      '2g': [],
      none: []
    }
  };
  
  // 创建图片加载器
  const loader = new OptimizedImageLoader({
    maxCacheSize: 20 * 1024 * 1024, // 20MB
    logLevel: 'info',
    adaptiveLoadingEnabled: true,
    networkStrategies: {
      // 为每种网络类型自定义策略
      wifi: {
        quality: { quality: 90, maxWidth: 0 },
        preload: { enabled: true, maxConcurrent: 5 },
        cache: { priority: 'speed' }
      },
      '4g': {
        quality: { quality: 80, maxWidth: 1200 },
        preload: { enabled: true, maxConcurrent: 3 },
        cache: { priority: 'balance' }
      },
      '3g': {
        quality: { quality: 70, maxWidth: 800 },
        preload: { enabled: false, maxConcurrent: 2 },
        cache: { priority: 'size' }
      },
      '2g': {
        quality: { quality: 60, maxWidth: 480 },
        preload: { enabled: false, maxConcurrent: 1 },
        cache: { priority: 'size' }
      }
    }
  });
  
  // 初始化加载器
  await loader.init();
  console.log('图片加载器初始化完成');
  
  // 启动网络波动模拟
  networkSimulator.start();
  
  // 记录网络切换和策略变更
  let strategySwitches = 0;
  const strategyUnsubscribe = loader.adaptiveStrategy.onStrategyChange((newStrategy, oldStrategy, networkInfo) => {
    strategySwitches++;
    console.log(color.yellow(`策略变更: ${networkInfo.type} - 并发数: ${newStrategy.preload.maxConcurrent}, 图片质量: ${newStrategy.quality.quality}`));
  });
  
  // 测试函数
  const testRequest = async (networkType) => {
    // 设置网络类型
    networkSimulator.setNetworkType(networkType);
    console.log(color.cyan(`测试网络环境: ${networkType}`));
    
    // 等待网络策略适应
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 加载一批图片
    const promises = TEST_CONFIG.IMAGES.map(url => {
      stats.totalRequests++;
      return loader.loadImage({ url })
        .then(result => {
          stats.successRequests++;
          if (result.fromCache) stats.cacheHits++;
          
          // 记录加载时间
          if (stats.avgLoadTimeByNetwork[networkType]) {
            stats.avgLoadTimeByNetwork[networkType].push(result.loadTime);
          }
          
          return result;
        })
        .catch(err => {
          stats.failedRequests++;
          console.log(color.red(`加载失败 [${networkType}]: ${url} - ${err.message}`));
          return { success: false, error: err };
        });
    });
    
    return Promise.all(promises);
  };
  
  // 按顺序测试不同网络环境
  for (const networkType of TEST_CONFIG.NETWORK_TYPES) {
    await testRequest(networkType);
    // 网络间隔
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // 随机切换网络进行压力测试
  printSubtitle('随机网络切换压力测试');
  
  const startTime = Date.now();
  let testIterations = 0;
  
  // 测试持续指定时间
  while (Date.now() - startTime < TEST_CONFIG.TEST_DURATION / 2) {
    testIterations++;
    
    // 随机选择网络类型
    const randomIndex = Math.floor(Math.random() * TEST_CONFIG.NETWORK_TYPES.length);
    const networkType = TEST_CONFIG.NETWORK_TYPES[randomIndex];
    
    await testRequest(networkType);
    
    // 间隔
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 清理
  strategyUnsubscribe();
  networkSimulator.stop();
  await loader.destroy();
  
  // 计算平均加载时间
  const avgLoadTimes = {};
  Object.keys(stats.avgLoadTimeByNetwork).forEach(network => {
    const times = stats.avgLoadTimeByNetwork[network];
    avgLoadTimes[network] = times.length ? 
                           times.reduce((sum, time) => sum + time, 0) / times.length : 
                           null;
  });
  
  // 输出统计结果
  console.log('\n' + color.bold('网络适应性测试结果:'));
  printResult('总请求数', stats.totalRequests);
  printResult('成功请求数', stats.successRequests);
  printResult('失败请求数', stats.failedRequests);
  printResult('缓存命中数', stats.cacheHits);
  printResult('策略切换次数', strategySwitches);
  printResult('测试迭代次数', testIterations);
  
  console.log('\n' + color.bold('按网络类型的平均加载时间(ms):'));
  Object.keys(avgLoadTimes).forEach(network => {
    if (avgLoadTimes[network] !== null) {
      const isAcceptable = network === 'none' || avgLoadTimes[network] < 1000;
      printResult(network, Math.round(avgLoadTimes[network]), isAcceptable);
    }
  });
  
  // 测试结果评估
  const successRate = (stats.successRequests / stats.totalRequests) * 100;
  const cacheHitRate = (stats.cacheHits / stats.successRequests) * 100;
  
  console.log('\n' + color.bold('测试总结:'));
  printResult('成功率', `${successRate.toFixed(2)}%`, successRate > 70);
  printResult('缓存命中率', `${cacheHitRate.toFixed(2)}%`, cacheHitRate > 30);
  
  return {
    successRate,
    cacheHitRate,
    avgLoadTimes,
    strategySwitches
  };
}

/**
 * 测试弱网环境下的持久性加载
 */
async function testWeakNetworkPersistence() {
  printSubtitle('弱网环境持久性测试');
  
  // 创建网络波动模拟器
  const networkSimulator = new NetworkFluctuationSimulator({
    TIMEOUT_PERCENTAGE: 50,       // 更高的超时率
    SLOW_RESPONSE_PERCENTAGE: 70, // 更多的慢响应
    MAX_DELAY: 8000,              // 更长的最大延迟
    DISCONNECT_INTERVAL: 5000,    // 更频繁的断网
    RECONNECT_DELAY: 4000         // 更长的重连延迟
  });
  
  // 创建图片加载器
  const loader = new OptimizedImageLoader({
    maxCacheSize: 20 * 1024 * 1024,
    logLevel: 'info',
    adaptiveLoadingEnabled: true,
    maxRetries: 5,               // 增加重试次数
    retryInterval: 1000,         // 重试间隔
  });
  
  // 初始化加载器
  await loader.init();
  
  // 启动网络波动模拟
  networkSimulator.start();
  
  // 设置为非常弱的网络
  networkSimulator.setNetworkType('2g');
  
  // 统计变量
  const stats = {
    startTime: Date.now(),
    totalRequests: 0,
    successRequests: 0,
    failedRequests: 0,
    retryCount: 0,
    averageLoadTime: 0,
    loadTimes: []
  };
  
  // 生成更多的测试图片
  const testImages = [];
  for (let i = 0; i < 20; i++) {
    testImages.push(`https://example.com/images/weak_test_${i}.jpg`);
  }
  
  console.log('开始弱网环境持久性测试，将持续测试图片加载能力...');
  
  // 测试持续指定时间
  const testDuration = TEST_CONFIG.TEST_DURATION / 2; // 测试持续30秒
  const startTime = Date.now();
  
  // 定义异步测试函数
  const runTestIteration = async () => {
    // 随机选择一张图片
    const randomIndex = Math.floor(Math.random() * testImages.length);
    const url = testImages[randomIndex];
    
    stats.totalRequests++;
    
    try {
      // 记录加载开始时间
      const loadStartTime = Date.now();
      
      // 加载图片，设置更长的超时时间
      const result = await loader.loadImage({
        url,
        timeout: 12000, // 12秒超时
      });
      
      // 计算加载时间
      const loadTime = Date.now() - loadStartTime;
      stats.loadTimes.push(loadTime);
      
      // 更新统计
      stats.successRequests++;
      stats.retryCount += result.retryCount || 0;
      
      if (stats.successRequests % 5 === 0) {
        console.log(color.green(`成功加载第 ${stats.successRequests} 张图片，耗时: ${loadTime}ms`));
      }
    } catch (error) {
      stats.failedRequests++;
      console.log(color.red(`加载失败: ${url} - ${error.message}`));
    }
  };
  
  // 并发执行测试
  while (Date.now() - startTime < testDuration) {
    // 并发运行3个测试实例
    await Promise.all([
      runTestIteration(),
      runTestIteration(),
      runTestIteration()
    ]);
    
    // 短暂暂停
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 清理
  networkSimulator.stop();
  await loader.destroy();
  
  // 计算平均加载时间
  if (stats.loadTimes.length) {
    stats.averageLoadTime = stats.loadTimes.reduce((sum, time) => sum + time, 0) / stats.loadTimes.length;
  }
  
  // 输出统计结果
  const totalDuration = (Date.now() - stats.startTime) / 1000;
  
  console.log('\n' + color.bold('弱网环境持久性测试结果:'));
  printResult('测试持续时间', `${totalDuration.toFixed(2)}秒`);
  printResult('总请求数', stats.totalRequests);
  printResult('成功请求数', stats.successRequests);
  printResult('失败请求数', stats.failedRequests);
  printResult('平均加载时间', `${Math.round(stats.averageLoadTime)}ms`, stats.averageLoadTime < 3000);
  printResult('重试次数', stats.retryCount);
  
  // 测试结果评估
  const successRate = (stats.successRequests / stats.totalRequests) * 100;
  
  console.log('\n' + color.bold('弱网测试总结:'));
  printResult('弱网成功率', `${successRate.toFixed(2)}%`, successRate > 50);
  printResult('平均加载性能', `${Math.round(stats.averageLoadTime)}ms`, stats.averageLoadTime < 3000);
  
  return {
    successRate,
    averageLoadTime: stats.averageLoadTime,
    totalRequests: stats.totalRequests,
    retryCount: stats.retryCount
  };
}

/**
 * 运行所有网络适应性测试
 */
async function runAllNetworkTests() {
  printTitle('图片加载器网络适应性测试');
  
  console.log(color.bold(`开始时间: ${new Date().toLocaleString()}`));
  console.log(color.cyan('测试环境: WeChat 小程序'));
  console.log(color.cyan(`测试持续时间: ${TEST_CONFIG.TEST_DURATION / 1000}秒`));
  
  const startTime = Date.now();
  
  // 运行网络切换测试
  const switchingResults = await testNetworkSwitching();
  
  // 运行弱网持久性测试
  const weakNetworkResults = await testWeakNetworkPersistence();
  
  // 计算总测试时间
  const totalTestTime = (Date.now() - startTime) / 1000;
  
  // 打印总结
  printTitle('网络适应性测试总结');
  console.log(`测试总耗时: ${totalTestTime.toFixed(2)}秒`);
  
  // 整体测试结果评估
  const overallSuccess = (
    switchingResults.successRate > 70 &&
    weakNetworkResults.successRate > 50 &&
    switchingResults.avgLoadTimes.wifi < 500 &&
    switchingResults.avgLoadTimes['4g'] < 800 &&
    weakNetworkResults.averageLoadTime < 3000
  );
  
  if (overallSuccess) {
    console.log('\n' + color.bold(color.green('✓ 网络适应性测试通过')));
    console.log(color.green('图片加载器在各种网络环境下表现良好，包括网络切换和弱网环境'));
  } else {
    console.log('\n' + color.bold(color.red('✗ 网络适应性测试不通过')));
    console.log(color.red('图片加载器在某些网络环境下性能不佳，需要进一步优化'));
  }
  
  return {
    switchingResults,
    weakNetworkResults,
    overallSuccess,
    testTime: totalTestTime
  };
}

// 导出测试函数
module.exports = {
  runAllNetworkTests,
  testNetworkSwitching,
  testWeakNetworkPersistence,
  NetworkFluctuationSimulator
}; 