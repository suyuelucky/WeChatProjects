const app = getApp();
const ErrorCollector = require('../../utils/error-collector.js');

Page({
  data: {
    logs: [],
    testResults: [],
    systemInfo: {},
    storageInfo: {},
    isLoading: false
  },

  onLoad: function() {
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.setData({ systemInfo });
    
    // 获取存储信息
    this.updateStorageInfo();
    
    // 记录页面加载
    ErrorCollector.reportWarning('error-test', '错误收集测试页面已加载');
  },
  
  onShow: function() {
    // 获取最新的日志
    this.refreshLogs();
  },
  
  // 刷新日志列表
  refreshLogs: function() {
    const logs = ErrorCollector.getLogs();
    this.setData({ logs: logs.slice(-20).reverse() }); // 最新的20条
  },
  
  // 更新存储信息
  updateStorageInfo: function() {
    try {
      const storageInfo = wx.getStorageInfoSync();
      this.setData({ storageInfo });
    } catch (err) {
      console.error('获取存储信息失败:', err);
      this.addTestResult('获取存储信息', false, err.message);
    }
  },
  
  // 生成普通错误
  generateError: function() {
    try {
      // 故意抛出一个错误
      throw new Error('这是一个测试错误');
    } catch (err) {
      ErrorCollector.reportError('test-error', '测试错误生成', { error: err });
      this.addTestResult('生成普通错误', true, '错误已生成并记录');
      this.refreshLogs();
    }
  },
  
  // 生成警告
  generateWarning: function() {
    ErrorCollector.reportWarning('test-warning', '这是一个测试警告', { time: Date.now() });
    this.addTestResult('生成警告', true, '警告已生成并记录');
    this.refreshLogs();
  },
  
  // 生成功能不可用通知
  generateFeatureUnavailable: function() {
    ErrorCollector.reportFeatureUnavailable('test-feature', '测试功能暂时不可用', { reason: '测试原因' });
    this.addTestResult('功能不可用通知', true, '通知已生成并记录');
    this.refreshLogs();
  },
  
  // 模拟异步错误
  generateAsyncError: function() {
    this.setData({ isLoading: true });
    
    // 包装一个会失败的Promise
    const failingPromise = () => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('异步操作失败'));
        }, 1000);
      });
    };
    
    // 使用错误收集器包装函数
    const wrappedFunction = ErrorCollector.wrapWithErrorHandler(failingPromise, 'async-test');
    
    wrappedFunction()
      .catch(err => {
        this.addTestResult('异步错误测试', true, '异步错误已捕获并记录');
      })
      .finally(() => {
        this.setData({ isLoading: false });
        this.refreshLogs();
      });
  },
  
  // 测试存储清理
  testStorageCleanup: function() {
    try {
      // 先填充一些测试数据
      for (let i = 0; i < 10; i++) {
        wx.setStorageSync(`tmp_test_${i}`, `这是测试数据 ${i}`);
      }
      
      // 更新存储信息
      this.updateStorageInfo();
      
      // 获取存储管理器并清理
      const storageManager = app.storageManager;
      
      if (storageManager && storageManager.STORAGE_TYPES) {
        const result = storageManager.cleanup(storageManager.STORAGE_TYPES.TEMP);
        this.addTestResult('存储清理', result, result ? '临时存储已清理' : '清理失败');
      } else {
        this.addTestResult('存储清理', false, '无法获取存储管理器');
      }
      
      // 更新存储信息
      this.updateStorageInfo();
      this.refreshLogs();
    } catch (err) {
      ErrorCollector.reportError('storage-test', '测试存储清理失败', { error: err });
      this.addTestResult('存储清理', false, err.message);
      this.refreshLogs();
    }
  },
  
  // 测试获取诊断报告
  getDiagnosticReport: function() {
    try {
      // 先检查app.getDiagnosticReport是否存在
      if (!app.getDiagnosticReport) {
        throw new Error('诊断报告功能不可用');
      }
      
      const report = app.getDiagnosticReport();
      console.log('诊断报告:', report);
      this.addTestResult('获取诊断报告', true, '报告已获取，请查看控制台');
      
      // 将报告显示在页面上
      this.setData({
        diagnosticReport: report
      });
    } catch (err) {
      ErrorCollector.reportError('diagnostic-test', '获取诊断报告失败', { error: err.message });
      this.addTestResult('获取诊断报告', false, err.message);
      console.error('获取诊断报告失败:', err);
    }
  },
  
  // 清理所有日志
  clearAllLogs: function() {
    ErrorCollector.clearLogs();
    this.refreshLogs();
    this.addTestResult('清理日志', true, '所有日志已清除');
  },
  
  // 测试文件系统错误
  testFileSystemError: function() {
    try {
      const fs = wx.getFileSystemManager();
      // 尝试读取一个不存在的文件
      fs.readFileSync('/this_file_does_not_exist.txt');
    } catch (err) {
      ErrorCollector.reportError('file-system', '文件系统错误测试', { error: err });
      this.addTestResult('文件系统错误', true, '错误已捕获并记录');
      this.refreshLogs();
    }
  },
  
  // 测试模拟相机错误
  testCameraError: function() {
    ErrorCollector.reportError('camera-mock', '模拟相机错误', {
      code: 10001,
      message: '相机初始化失败',
      detail: '模拟设备不支持指定分辨率'
    });
    
    // 也添加一些相机相关的警告
    ErrorCollector.reportWarning('camera-mock', '相机性能警告', {
      fps: 15,
      expected: 24,
      reason: '设备性能不足'
    });
    
    this.addTestResult('相机错误模拟', true, '相机错误已模拟并记录');
    this.refreshLogs();
  },
  
  // 辅助方法：添加测试结果
  addTestResult: function(name, success, message) {
    const results = this.data.testResults;
    
    // 添加当前结果到顶部
    results.unshift({
      name: name,
      success: success,
      message: message,
      time: new Date().toLocaleTimeString()
    });
    
    // 限制结果列表长度
    if (results.length > 10) {
      results.pop();
    }
    
    this.setData({ testResults: results });
  }
}); 