/**
 * 离线存储适配器测试启动文件
 * 
 * 用于初始化和运行离线存储适配器的测试，验证其实现是否符合要求
 * 遵循ES5标准，确保与微信小程序兼容
 * 
 * 作者：AI助手
 * 创建日期：2025-04-07
 */

// 导入依赖
var testAdapterWrapper = require('./testAdapterWrapper');
var storageAdapterFactory = require('./storageAdapterFactory');
var storageConfig = require('./storageConfig');

// 测试运行器
var TestRunner;

/**
 * 初始化测试
 */
function initTest() {
  console.log('初始化离线存储适配器测试...');
  
  try {
    // 尝试加载测试运行器
    try {
      TestRunner = require('../../AI-测试验收/离线存储适配器测试套件/测试运行器');
    } catch (e) {
      console.error('加载测试运行器失败：', e);
      return false;
    }
    
    // 获取测试适配器
    var factory = storageAdapterFactory.getStorageAdapterFactoryInstance();
    var offlineAdapter = factory.getAdapter('offline', {
      prefix: 'test_offline_',
      maxRetryCount: 3,
      syncInterval: 5000,
      conflictStrategy: 'client-wins'
    });
    
    // 使用测试适配器包装器包装真实适配器
    var testAdapter = testAdapterWrapper.createTestAdapter(offlineAdapter, {
      simulateErrors: false,
      logOperations: true
    });
    
    console.log('离线存储适配器测试初始化成功');
    return {
      adapter: testAdapter,
      runner: TestRunner
    };
  } catch (error) {
    console.error('测试初始化失败：', error);
    return false;
  }
}

/**
 * 运行测试
 */
function runTest() {
  var test = initTest();
  if (!test) {
    console.error('无法初始化测试，请检查测试环境');
    return false;
  }
  
  console.log('开始运行离线存储适配器测试...');
  
  try {
    // 运行全部测试
    var results = test.runner.runAllTests({
      adapter: test.adapter,
      verbose: true, // 详细日志
      timeout: 60000  // 测试超时时间（毫秒）
    });
    
    // 输出测试结果
    console.log('测试完成，总测试数：' + results.totalTests);
    console.log('通过：' + results.passedTests + '，失败：' + results.failedTests);
    
    return results;
  } catch (error) {
    console.error('测试执行异常：', error);
    return false;
  }
}

/**
 * 运行指定测试套件
 * @param {string} suiteName 测试套件名称 ('network', 'storage', 'conflict', 'sync')
 */
function runTestSuite(suiteName) {
  var test = initTest();
  if (!test) {
    console.error('无法初始化测试，请检查测试环境');
    return false;
  }
  
  console.log('开始运行 ' + suiteName + ' 测试套件...');
  
  try {
    // 根据套件名称选择运行方法
    var suiteRunner;
    switch (suiteName) {
      case 'network':
        suiteRunner = test.runner._runNetworkTests;
        break;
      case 'storage':
        suiteRunner = test.runner._runStorageTests;
        break;
      case 'conflict':
        suiteRunner = test.runner._runConflictTests;
        break;
      case 'sync':
        suiteRunner = test.runner._runSyncTests;
        break;
      default:
        throw new Error('未知的测试套件：' + suiteName);
    }
    
    // 运行指定套件
    suiteRunner.call(test.runner, test.adapter, {
      verbose: true,
      timeout: 30000
    });
    
    // 返回测试结果
    return test.runner.testReports[suiteName];
  } catch (error) {
    console.error('测试执行异常：', error);
    return false;
  }
}

// 导出测试接口
module.exports = {
  initTest: initTest,
  runTest: runTest,
  runTestSuite: runTestSuite
}; 