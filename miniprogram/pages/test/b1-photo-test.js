/**
 * B1照片捕捉功能测试页面
 * 创建时间: 2025-04-10 11:02:18
 * 创建者: Claude AI 3.7 Sonnet
 */

// 导入测试运行器
var TestRunner = require('../../tests/b1-photo-capture/run-tests');

// 导入测试用例
var ConfigManagerTest = require('../../tests/b1-photo-capture/config-manager.test');
var PhotoProcessorTest = require('../../tests/b1-photo-capture/photo-processor.test');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    testStatus: '准备测试',
    testResults: {
      total: 0,
      passed: 0,
      failed: 0
    },
    testLogs: [],
    isRunning: false,
    testOptions: [
      { id: 'all', name: '运行所有测试', selected: true },
      { id: 'config', name: '配置管理测试', selected: false },
      { id: 'processor', name: '照片处理测试', selected: false }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 重写console方法捕获日志
    this.setupLogCapture();
  },

  /**
   * 设置日志捕获
   */
  setupLogCapture: function() {
    var that = this;
    
    // 保存原始console方法
    var originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };
    
    // 重写console.log
    console.log = function() {
      // 调用原始方法
      originalConsole.log.apply(console, arguments);
      
      // 捕获日志
      that.captureLog('info', Array.prototype.slice.call(arguments).join(' '));
    };
    
    // 重写console.warn
    console.warn = function() {
      // 调用原始方法
      originalConsole.warn.apply(console, arguments);
      
      // 捕获日志
      that.captureLog('warn', Array.prototype.slice.call(arguments).join(' '));
    };
    
    // 重写console.error
    console.error = function() {
      // 调用原始方法
      originalConsole.error.apply(console, arguments);
      
      // 捕获日志
      that.captureLog('error', Array.prototype.slice.call(arguments).join(' '));
    };
  },
  
  /**
   * 捕获日志
   * @param {String} type 日志类型
   * @param {String} message 日志消息
   */
  captureLog: function(type, message) {
    var logs = this.data.testLogs.slice();
    
    // 限制日志数量，防止内存溢出
    if (logs.length > 100) {
      logs = logs.slice(logs.length - 100);
    }
    
    logs.push({
      type: type,
      message: message,
      time: new Date().toLocaleTimeString()
    });
    
    this.setData({
      testLogs: logs
    });
  },

  /**
   * 运行选中的测试
   */
  runTests: function() {
    if (this.data.isRunning) {
      wx.showToast({
        title: '测试正在运行中',
        icon: 'none'
      });
      return;
    }
    
    // 清空日志
    this.setData({
      testLogs: [],
      isRunning: true,
      testStatus: '测试运行中...'
    });
    
    // 根据选项运行测试
    var options = this.data.testOptions;
    var allSelected = options.find(function(opt) { return opt.id === 'all' && opt.selected; });
    
    if (allSelected) {
      this.runAllTests();
    } else {
      var selected = options.filter(function(opt) { return opt.selected; });
      
      if (selected.length === 0) {
        this.setData({
          isRunning: false,
          testStatus: '请至少选择一项测试'
        });
        return;
      }
      
      this.runSelectedTests(selected);
    }
  },
  
  /**
   * 运行所有测试
   */
  runAllTests: function() {
    var that = this;
    
    // 使用测试运行器
    TestRunner.runAllTests();
    
    // 定期检查测试状态
    var checkInterval = setInterval(function() {
      if (!TestRunner._status.running) {
        clearInterval(checkInterval);
        
        that.setData({
          isRunning: false,
          testStatus: TestRunner._status.failed === 0 ? '测试全部通过' : '测试存在失败',
          testResults: {
            total: TestRunner._status.total,
            passed: TestRunner._status.passed,
            failed: TestRunner._status.failed
          }
        });
      }
    }, 500);
  },
  
  /**
   * 运行选中的测试
   * @param {Array} selected 选中的测试
   */
  runSelectedTests: function(selected) {
    var that = this;
    var total = 0;
    var passed = 0;
    var failed = 0;
    var running = 0;
    
    // 运行每个选中的测试
    selected.forEach(function(item) {
      running++;
      
      var testPromise;
      if (item.id === 'config') {
        testPromise = that.runSingleTest(ConfigManagerTest);
      } else if (item.id === 'processor') {
        testPromise = that.runSingleTest(PhotoProcessorTest);
      }
      
      if (testPromise) {
        testPromise.then(function(result) {
          total += result.total;
          passed += result.passed;
          failed += result.failed;
        }).finally(function() {
          running--;
          
          // 所有测试完成
          if (running === 0) {
            that.setData({
              isRunning: false,
              testStatus: failed === 0 ? '测试全部通过' : '测试存在失败',
              testResults: {
                total: total,
                passed: passed,
                failed: failed
              }
            });
          }
        });
      }
    });
  },
  
  /**
   * 运行单个测试套件
   * @param {Object} testSuite 测试套件
   * @returns {Promise} 测试结果Promise
   */
  runSingleTest: function(testSuite) {
    return new Promise(function(resolve) {
      try {
        testSuite.runAllTests();
        resolve({ total: 1, passed: 1, failed: 0 });
      } catch (e) {
        console.error('测试执行出错:', e);
        resolve({ total: 1, passed: 0, failed: 1 });
      }
    });
  },
  
  /**
   * 切换测试选项
   */
  toggleOption: function(e) {
    var index = e.currentTarget.dataset.index;
    var options = this.data.testOptions.slice();
    
    // 当选择"全部"时，取消其他选择
    if (options[index].id === 'all' && !options[index].selected) {
      options.forEach(function(item, i) {
        options[i].selected = i === index;
      });
    } 
    // 当选择其他选项时，取消"全部"
    else if (options[index].id !== 'all') {
      options[index].selected = !options[index].selected;
      
      // 找到"全部"选项并取消选择
      var allIndex = options.findIndex(function(item) { return item.id === 'all'; });
      if (allIndex >= 0) {
        options[allIndex].selected = false;
      }
    }
    // 切换当前选项
    else {
      options[index].selected = !options[index].selected;
    }
    
    this.setData({
      testOptions: options
    });
  },
  
  /**
   * 清空日志
   */
  clearLogs: function() {
    this.setData({
      testLogs: []
    });
  }
}); 