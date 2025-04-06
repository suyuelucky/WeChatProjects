/**
 * 云开发极端测试套件 - 入口文件
 * 集中管理和执行各类极端测试
 */

// 导入各个测试模块
const batchOperations = require('./batch-operations');
const dataIntegrity = require('./data-integrity');
const errorHandling = require('./error-handling');

// 获取应用实例
const app = getApp();

// 页面对象
Page({
  data: {
    // 测试状态
    testing: false,
    currentTest: '',
    
    // 测试结果
    batchResults: null,
    dataIntegrityResults: null,
    errorHandlingResults: null,
    
    // 测试统计
    testStats: {
      total: 0,
      success: 0,
      failed: 0,
      running: false,
      startTime: null,
      endTime: null,
      duration: null
    },
    
    // 测试配置
    config: {
      // 全局配置
      runParallel: false, // 是否并行运行所有测试
      runCleanupAfterEach: true, // 是否在每次测试后清理数据
      
      // 批量操作测试配置
      batchOperations: {
        enabled: true,
        batchSize: batchOperations.config.batchSize,
        concurrentLimit: batchOperations.config.concurrentLimit,
        fileSize: batchOperations.config.fileSize / 1024 // 显示为KB
      },
      
      // 数据完整性测试配置
      dataIntegrity: {
        enabled: true,
        longStringLength: dataIntegrity.config.longStringLength / 1024 / 1024, // 显示为MB
        objectNestingDepth: dataIntegrity.config.objectNestingDepth,
        largeObjectFieldCount: dataIntegrity.config.largeObjectFieldCount
      },
      
      // 错误处理测试配置
      errorHandling: {
        enabled: true,
        testRuns: errorHandling.config.testRuns,
        networkErrorProbability: errorHandling.config.networkErrorProbability,
        concurrentOperations: errorHandling.config.concurrentOperations
      }
    }
  },
  
  /**
   * 页面加载时
   */
  onLoad: function() {
    // 初始化云环境
    if (!wx.cloud) {
      wx.showToast({
        title: '请使用2.2.3以上的基础库以使用云能力',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载完成
    wx.showToast({
      title: '极端测试套件已加载',
      icon: 'none'
    });
  },
  
  /**
   * 更新测试配置
   */
  updateConfig: function(e) {
    const { field, value, category } = e.currentTarget.dataset;
    
    if (category) {
      this.setData({
        [`config.${category}.${field}`]: value
      });
    } else {
      this.setData({
        [`config.${field}`]: value
      });
    }
  },
  
  /**
   * 切换测试模块启用状态
   */
  toggleTestModule: function(e) {
    const { module } = e.currentTarget.dataset;
    
    this.setData({
      [`config.${module}.enabled`]: !this.data.config[module].enabled
    });
  },
  
  /**
   * 重置测试结果
   */
  resetTestResults: function() {
    this.setData({
      batchResults: null,
      dataIntegrityResults: null,
      errorHandlingResults: null,
      testing: false,
      currentTest: '',
      testStats: {
        total: 0,
        success: 0,
        failed: 0,
        running: false,
        startTime: null,
        endTime: null,
        duration: null
      }
    });
  },
  
  /**
   * 运行批量操作测试
   */
  runBatchTests: async function() {
    if (this.data.testing) {
      wx.showToast({
        title: '已有测试正在运行',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      testing: true,
      currentTest: 'batch',
      batchResults: null,
      testStats: {
        ...this.data.testStats,
        running: true,
        startTime: new Date()
      }
    });
    
    try {
      // 更新批量操作测试的配置
      batchOperations.config.batchSize = this.data.config.batchOperations.batchSize;
      batchOperations.config.concurrentLimit = this.data.config.batchOperations.concurrentLimit;
      batchOperations.config.fileSize = this.data.config.batchOperations.fileSize * 1024; // 转为KB
      
      // 运行批量操作测试
      wx.showLoading({ title: '运行批量操作测试...' });
      const results = await batchOperations.runAllTests();
      wx.hideLoading();
      
      console.log('[极端测试] 批量操作测试结果:', results);
      
      this.setData({
        batchResults: results,
        testing: false,
        currentTest: '',
        testStats: {
          ...this.data.testStats,
          running: false,
          endTime: new Date(),
          duration: (new Date() - this.data.testStats.startTime) / 1000,
          total: 3, // 批量文件上传、批量数据查询、批量云函数调用
          success: results.success ? 3 : 0,
          failed: results.success ? 0 : 3
        }
      });
      
      wx.showToast({
        title: results.success ? '批量操作测试完成' : '批量操作测试失败',
        icon: results.success ? 'success' : 'none'
      });
    } catch (err) {
      wx.hideLoading();
      console.error('[极端测试] 批量操作测试出错:', err);
      
      this.setData({
        testing: false,
        currentTest: '',
        testStats: {
          ...this.data.testStats,
          running: false,
          endTime: new Date(),
          duration: (new Date() - this.data.testStats.startTime) / 1000,
          total: 3,
          success: 0,
          failed: 3
        }
      });
      
      wx.showToast({
        title: '测试执行错误: ' + (err.message || err.errMsg || '未知错误'),
        icon: 'none',
        duration: 3000
      });
    }
  },
  
  /**
   * 运行数据完整性测试
   */
  runDataIntegrityTests: async function() {
    if (this.data.testing) {
      wx.showToast({
        title: '已有测试正在运行',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      testing: true,
      currentTest: 'dataIntegrity',
      dataIntegrityResults: null,
      testStats: {
        ...this.data.testStats,
        running: true,
        startTime: new Date()
      }
    });
    
    try {
      // 更新数据完整性测试的配置
      dataIntegrity.config.longStringLength = this.data.config.dataIntegrity.longStringLength * 1024 * 1024; // 转为MB
      dataIntegrity.config.objectNestingDepth = this.data.config.dataIntegrity.objectNestingDepth;
      dataIntegrity.config.largeObjectFieldCount = this.data.config.dataIntegrity.largeObjectFieldCount;
      
      // 运行数据完整性测试
      wx.showLoading({ title: '运行数据完整性测试...' });
      const results = await dataIntegrity.runAllTests();
      wx.hideLoading();
      
      console.log('[极端测试] 数据完整性测试结果:', results);
      
      // 计算成功和失败的测试数量
      const testCount = 4; // 特殊字符、大量字段、深度嵌套、超长字符串
      let successCount = 0;
      
      if (results.success && results.summary) {
        if (results.summary.specialChar.success) successCount++;
        if (results.summary.largeObject.success) successCount++;
        if (results.summary.nestedObject.success) successCount++;
        if (results.summary.longString.success) successCount++;
      }
      
      this.setData({
        dataIntegrityResults: results,
        testing: false,
        currentTest: '',
        testStats: {
          ...this.data.testStats,
          running: false,
          endTime: new Date(),
          duration: (new Date() - this.data.testStats.startTime) / 1000,
          total: testCount,
          success: successCount,
          failed: testCount - successCount
        }
      });
      
      wx.showToast({
        title: results.success ? '数据完整性测试完成' : '数据完整性测试失败',
        icon: results.success ? 'success' : 'none'
      });
    } catch (err) {
      wx.hideLoading();
      console.error('[极端测试] 数据完整性测试出错:', err);
      
      this.setData({
        testing: false,
        currentTest: '',
        testStats: {
          ...this.data.testStats,
          running: false,
          endTime: new Date(),
          duration: (new Date() - this.data.testStats.startTime) / 1000,
          total: 4,
          success: 0,
          failed: 4
        }
      });
      
      wx.showToast({
        title: '测试执行错误: ' + (err.message || err.errMsg || '未知错误'),
        icon: 'none',
        duration: 3000
      });
    }
  },
  
  /**
   * 运行错误处理测试
   */
  runErrorHandlingTests: async function() {
    if (this.data.testing) {
      wx.showToast({
        title: '已有测试正在运行',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      testing: true,
      currentTest: 'errorHandling',
      errorHandlingResults: null,
      testStats: {
        ...this.data.testStats,
        running: true,
        startTime: new Date()
      }
    });
    
    try {
      // 更新错误处理测试的配置
      errorHandling.config.testRuns = this.data.config.errorHandling.testRuns;
      errorHandling.config.networkErrorProbability = this.data.config.errorHandling.networkErrorProbability;
      errorHandling.config.concurrentOperations = this.data.config.errorHandling.concurrentOperations;
      
      // 运行错误处理测试
      wx.showLoading({ title: '运行错误处理测试...' });
      const results = await errorHandling.runAllTests();
      wx.hideLoading();
      
      console.log('[极端测试] 错误处理测试结果:', results);
      
      // 计算成功和失败的测试数量
      const testCount = 5; // 无效输入、边界条件、并发错误、网络恢复、权限错误
      let successCount = 0;
      
      if (results.success && results.summary) {
        // 无效输入测试成功条件
        if (results.summary.invalidInput.errorsProperlyHandled > 0) successCount++;
        
        // 边界条件测试成功条件
        if (results.summary.edgeCases.successes > 0) successCount++;
        
        // 并发错误测试成功条件
        if (results.summary.concurrentErrors.successRate > 0) successCount++;
        
        // 网络恢复测试成功条件
        if (results.summary.networkRecovery.successRate > 0) successCount++;
        
        // 权限错误测试成功条件
        if (results.summary.permissionErrors.nonExistentCollectionHandled ||
            results.summary.permissionErrors.nonExistentFunctionHandled) {
          successCount++;
        }
      }
      
      this.setData({
        errorHandlingResults: results,
        testing: false,
        currentTest: '',
        testStats: {
          ...this.data.testStats,
          running: false,
          endTime: new Date(),
          duration: (new Date() - this.data.testStats.startTime) / 1000,
          total: testCount,
          success: successCount,
          failed: testCount - successCount
        }
      });
      
      wx.showToast({
        title: results.success ? '错误处理测试完成' : '错误处理测试失败',
        icon: results.success ? 'success' : 'none'
      });
    } catch (err) {
      wx.hideLoading();
      console.error('[极端测试] 错误处理测试出错:', err);
      
      this.setData({
        testing: false,
        currentTest: '',
        testStats: {
          ...this.data.testStats,
          running: false,
          endTime: new Date(),
          duration: (new Date() - this.data.testStats.startTime) / 1000,
          total: 5,
          success: 0,
          failed: 5
        }
      });
      
      wx.showToast({
        title: '测试执行错误: ' + (err.message || err.errMsg || '未知错误'),
        icon: 'none',
        duration: 3000
      });
    }
  },
  
  /**
   * 运行所有测试
   */
  runAllTests: async function() {
    if (this.data.testing) {
      wx.showToast({
        title: '已有测试正在运行',
        icon: 'none'
      });
      return;
    }
    
    this.resetTestResults();
    
    this.setData({
      testStats: {
        ...this.data.testStats,
        running: true,
        startTime: new Date()
      }
    });
    
    const testModules = [];
    
    // 检查启用的测试模块
    if (this.data.config.batchOperations.enabled) {
      testModules.push({
        name: 'batchOperations',
        runner: this.runBatchTests.bind(this)
      });
    }
    
    if (this.data.config.dataIntegrity.enabled) {
      testModules.push({
        name: 'dataIntegrity',
        runner: this.runDataIntegrityTests.bind(this)
      });
    }
    
    if (this.data.config.errorHandling.enabled) {
      testModules.push({
        name: 'errorHandling',
        runner: this.runErrorHandlingTests.bind(this)
      });
    }
    
    // 运行测试
    if (this.data.config.runParallel) {
      // 并行运行所有测试
      try {
        wx.showLoading({ title: '并行运行所有测试...' });
        await Promise.all(testModules.map(module => module.runner()));
        wx.hideLoading();
      } catch (err) {
        wx.hideLoading();
        console.error('[极端测试] 并行运行测试出错:', err);
      }
    } else {
      // 串行运行所有测试
      for (const module of testModules) {
        try {
          wx.showLoading({ title: `运行${module.name}测试...` });
          await module.runner();
          wx.hideLoading();
        } catch (err) {
          wx.hideLoading();
          console.error(`[极端测试] 运行${module.name}测试出错:`, err);
        }
      }
    }
    
    // 计算总体测试统计
    const totalTests = (this.data.testStats.total || 0);
    const successTests = (this.data.testStats.success || 0);
    const failedTests = (this.data.testStats.failed || 0);
    
    this.setData({
      testStats: {
        ...this.data.testStats,
        running: false,
        endTime: new Date(),
        duration: (new Date() - this.data.testStats.startTime) / 1000,
        total: totalTests,
        success: successTests,
        failed: failedTests
      }
    });
    
    wx.showToast({
      title: `测试完成: ${successTests}/${totalTests} 成功`,
      icon: 'none',
      duration: 2000
    });
  },
  
  /**
   * 查看测试详情
   */
  viewTestDetails: function(e) {
    const { type } = e.currentTarget.dataset;
    let details;
    
    switch (type) {
      case 'batch':
        details = this.data.batchResults;
        break;
      case 'dataIntegrity':
        details = this.data.dataIntegrityResults;
        break;
      case 'errorHandling':
        details = this.data.errorHandlingResults;
        break;
      default:
        details = null;
    }
    
    if (!details) {
      wx.showToast({
        title: '无测试详情可查看',
        icon: 'none'
      });
      return;
    }
    
    // 详情展示逻辑（这里简单用控制台输出，页面上可以展开显示）
    console.log(`[极端测试] ${type}测试详情:`, details);
    
    wx.showModal({
      title: '测试详情',
      content: '详细结果已输出到控制台',
      showCancel: false
    });
  },
  
  /**
   * 清理所有测试数据
   */
  cleanupAllTestData: async function() {
    try {
      wx.showLoading({ title: '清理测试数据...' });
      
      const promises = [];
      
      if (this.data.config.batchOperations.enabled) {
        promises.push(batchOperations.cleanupTestData());
      }
      
      if (this.data.config.dataIntegrity.enabled) {
        promises.push(dataIntegrity.cleanupTestData());
      }
      
      if (this.data.config.errorHandling.enabled) {
        promises.push(errorHandling.cleanupTestData());
      }
      
      await Promise.all(promises);
      
      wx.hideLoading();
      wx.showToast({
        title: '测试数据清理完成',
        icon: 'success'
      });
    } catch (err) {
      wx.hideLoading();
      console.error('[极端测试] 清理测试数据出错:', err);
      
      wx.showToast({
        title: '清理数据出错: ' + (err.message || err.errMsg || '未知错误'),
        icon: 'none'
      });
    }
  }
}); 