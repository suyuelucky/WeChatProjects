/**
 * 内存管理优化测试页面
 * 用于在微信小程序环境中运行内存管理优化测试
 */

// 导入所需模块
var memoryTest = require('../../../tests/测试模块/TC-B1-02内存管理优化测试/memory-management-test');
var testUtils = require('../../../tests/utils/test-utils');
var mockPhotoData = require('../../../tests/utils/mock-photo-data');

Page({
  /**
   * 页面数据
   */
  data: {
    testStatus: '准备中',
    testResults: [],
    testStarted: false,
    testCompleted: false,
    testSuccess: false,
    memoryStats: {},
    testDuration: 0,
    testId: '',
    showDetails: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    // 初始化服务
    this.setupServices();
    
    // 更新内存统计信息
    this.updateMemoryStats();
    
    // 设置定时刷新
    this.statsTimer = setInterval(this.updateMemoryStats.bind(this), 5000);
  },
  
  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    // 清理定时器
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
  },
  
  /**
   * 设置服务
   */
  setupServices: function() {
    var app = getApp();
    
    // 确保服务已初始化
    if (!app.services || !app.services.photoService) {
      wx.showToast({
        title: '服务未初始化',
        icon: 'none'
      });
    }
    
    this.photoService = app.services.photoService;
    this.storageService = app.services.storageService;
  },
  
  /**
   * 更新内存统计信息
   */
  updateMemoryStats: function() {
    if (!this.photoService) {
      return;
    }
    
    var stats = this.photoService.getMemoryStats();
    
    this.setData({
      memoryStats: {
        jsHeapSize: stats.memory ? stats.memory.jsHeapSizeMB + 'MB' : '未知',
        usedPercentage: stats.memory ? stats.memory.usedPercentage + '%' : '未知',
        imageCount: stats.cache ? stats.cache.images : 0,
        totalCacheSize: stats.cache ? stats.cache.totalSizeMB + 'MB' : '0MB',
        isLowMemoryMode: stats.status ? (stats.status.lowMemoryMode ? '是' : '否') : '否'
      }
    });
  },
  
  /**
   * 运行内存测试
   */
  runMemoryTest: function() {
    var self = this;
    
    // 更新状态
    this.setData({
      testStatus: '测试运行中...',
      testStarted: true,
      testCompleted: false,
      testResults: []
    });
    
    // 生成测试ID
    var testId = 'mem_test_' + Date.now();
    
    // 开始计时
    var startTime = Date.now();
    
    // 运行测试
    memoryTest.run({
      testId: testId
    })
    .then(function(results) {
      // 计算测试持续时间
      var duration = Date.now() - startTime;
      
      // 更新结果
      self.setData({
        testStatus: results.success ? '测试通过' : '测试失败',
        testResults: results.results || [],
        testErrors: results.errors || [],
        testCompleted: true,
        testSuccess: results.success,
        testDuration: (duration / 1000).toFixed(1),
        testId: testId
      });
      
      // 将结果保存到存储中
      self.saveTestResults(results, testId);
      
      // 显示结果
      wx.showToast({
        title: results.success ? '测试成功' : '测试失败',
        icon: results.success ? 'success' : 'none',
        duration: 2000
      });
    })
    .catch(function(error) {
      console.error('测试执行错误:', error);
      
      self.setData({
        testStatus: '测试执行错误',
        testCompleted: true,
        testSuccess: false,
        testErrors: [error.message || '未知错误']
      });
      
      wx.showToast({
        title: '测试执行出错',
        icon: 'none',
        duration: 2000
      });
    });
  },
  
  /**
   * 保存测试结果
   * @param {Object} results 测试结果
   * @param {String} testId 测试ID
   */
  saveTestResults: function(results, testId) {
    if (!this.storageService) {
      console.error('存储服务不可用，无法保存测试结果');
      return;
    }
    
    var testRecord = {
      id: testId,
      date: new Date().toISOString(),
      success: results.success,
      duration: results.endTime - results.startTime,
      results: results
    };
    
    this.storageService.saveItem('memoryTests', testId, testRecord)
      .then(function() {
        console.log('测试结果已保存');
      })
      .catch(function(err) {
        console.error('保存测试结果失败:', err);
      });
  },
  
  /**
   * 清理内存缓存
   */
  cleanupMemory: function() {
    var self = this;
    
    if (!this.photoService) {
      wx.showToast({
        title: '服务未初始化',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      testStatus: '正在清理内存...'
    });
    
    this.photoService.cleanupCache({ force: true })
      .then(function(result) {
        self.setData({
          testStatus: '内存清理完成，释放: ' + result.memoryReductionMB + 'MB'
        });
        
        self.updateMemoryStats();
        
        wx.showToast({
          title: '内存清理完成',
          icon: 'success'
        });
      })
      .catch(function(err) {
        console.error('内存清理失败:', err);
        
        self.setData({
          testStatus: '内存清理失败'
        });
        
        wx.showToast({
          title: '内存清理失败',
          icon: 'none'
        });
      });
  },
  
  /**
   * 创建测试照片
   */
  createTestPhotos: function() {
    var self = this;
    
    // 创建10张测试照片
    mockPhotoData.createMockPhotos(10, {
      randomProps: true,
      size: 1024 * 1024  // 每张1MB
    })
    .then(function(photos) {
      self.setData({
        testStatus: '已创建' + photos.length + '张测试照片'
      });
      
      self.updateMemoryStats();
      
      wx.showToast({
        title: '已创建测试照片',
        icon: 'success'
      });
    })
    .catch(function(error) {
      console.error('创建测试照片失败:', error);
      
      self.setData({
        testStatus: '创建测试照片失败'
      });
      
      wx.showToast({
        title: '创建照片失败',
        icon: 'none'
      });
    });
  },
  
  /**
   * 切换详细信息显示
   */
  toggleDetails: function() {
    this.setData({
      showDetails: !this.data.showDetails
    });
  }
}); 