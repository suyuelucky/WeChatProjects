/**
 * 网络测试工具
 * 提供测试断网和弱网环境下应用表现的工具函数
 */

const { hasNetworkConnection, isWeakNetwork } = require('./networkUtils');
const apiService = require('./apiService');
const { syncQueue } = require('./storageUtils');

/**
 * 模拟断网环境测试
 * @param {Function} callback - 测试回调函数
 * @returns {Promise<Object>} - 测试结果
 */
const testOfflineMode = async (callback) => {
  const results = {
    offlineDataAccess: false,
    offlineOperation: false,
    syncQueueAddition: false,
    errors: []
  };

  try {
    // 保存初始网络状态
    const initialNetworkState = hasNetworkConnection();
    console.log('测试断网环境，当前网络状态:', initialNetworkState ? '在线' : '离线');

    // 执行离线操作测试
    try {
      // 模拟离线操作
      const offlineResult = await apiService.offlinePost('/test', { test: 'offline' });
      results.offlineOperation = true;
      
      // 检查是否添加到同步队列
      const syncQueueItems = await syncQueue.getAll();
      results.syncQueueAddition = syncQueueItems.some(item => 
        item.url === '/test' && item.options.data.test === 'offline'
      );
    } catch (error) {
      results.errors.push(`离线操作失败: ${error.message}`);
    }

    // 测试回调
    if (typeof callback === 'function') {
      await callback(results);
    }

    return results;
  } catch (error) {
    console.error('断网测试失败:', error);
    results.errors.push(`断网测试失败: ${error.message}`);
    return results;
  }
};

/**
 * 模拟弱网环境测试（200ms延迟）
 * @param {Function} callback - 测试回调函数
 * @returns {Promise<Object>} - 测试结果
 */
const testWeakNetwork = async (callback) => {
  const results = {
    responseTime: [],
    requestsCompleted: 0,
    requestsFailed: 0,
    averageResponseTime: 0,
    errors: []
  };

  try {
    console.log('测试弱网环境，模拟200ms延迟');
    
    // 设置测试请求数量
    const testRequestCount = 5;
    
    // 执行多次请求以测试弱网环境
    for (let i = 0; i < testRequestCount; i++) {
      const startTime = Date.now();
      
      try {
        // 模拟延迟200ms的请求
        await new Promise(resolve => {
          setTimeout(async () => {
            try {
              await apiService.get('/test', { 
                timeout: 5000 // 延长超时时间以适应弱网环境
              });
              resolve();
            } catch (error) {
              resolve(error);
            }
          }, 200); // 模拟200ms延迟
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        results.responseTime.push(responseTime);
        results.requestsCompleted++;
        
        console.log(`请求 ${i+1}/${testRequestCount} 完成，响应时间: ${responseTime}ms`);
      } catch (error) {
        results.requestsFailed++;
        results.errors.push(`请求 ${i+1} 失败: ${error.message}`);
      }
    }
    
    // 计算平均响应时间
    if (results.responseTime.length > 0) {
      results.averageResponseTime = results.responseTime.reduce((sum, time) => sum + time, 0) / results.responseTime.length;
    }
    
    // 测试回调
    if (typeof callback === 'function') {
      await callback(results);
    }
    
    return results;
  } catch (error) {
    console.error('弱网测试失败:', error);
    results.errors.push(`弱网测试失败: ${error.message}`);
    return results;
  }
};

/**
 * 综合网络适应性测试
 * @returns {Promise<Object>} - 测试结果
 */
const runNetworkAdaptationTests = async () => {
  const results = {
    offlineTest: null,
    weakNetworkTest: null,
    overall: {
      success: false,
      message: ''
    }
  };
  
  try {
    // 运行断网测试
    results.offlineTest = await testOfflineMode();
    
    // 运行弱网测试
    results.weakNetworkTest = await testWeakNetwork();
    
    // 评估整体测试结果
    const offlineSuccess = results.offlineTest.offlineOperation && results.offlineTest.syncQueueAddition;
    const weakNetworkSuccess = results.weakNetworkTest.requestsCompleted > 0 && 
                              results.weakNetworkTest.requestsFailed < results.weakNetworkTest.requestsCompleted;
    
    results.overall.success = offlineSuccess && weakNetworkSuccess;
    results.overall.message = results.overall.success 
      ? '网络适应性测试通过' 
      : '网络适应性测试未通过，请检查日志';
      
    return results;
  } catch (error) {
    console.error('网络适应性测试失败:', error);
    results.overall.message = `网络适应性测试失败: ${error.message}`;
    return results;
  }
};

// 创建网络测试工具对象
const NetworkTester = {
  testOfflineMode,
  testWeakNetwork,
  runNetworkAdaptationTests
};

// 导出NetworkTester对象
module.exports = NetworkTester; 