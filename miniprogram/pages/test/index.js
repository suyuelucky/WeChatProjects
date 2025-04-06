var testUtils = require('../../utils/testUtils');
var extremeTestHelper = require('../../utils/extremeTestHelper');

Page({
  data: {
    testStatus: '待测试',
    summaries: {},
    logs: [],
    expandedSection: '',
    isTestRunning: false,
    extremeTestResults: null
  },

  onLoad: function() {
    console.log('测试页面已加载');
  },

  /**
   * 运行所有测试
   */
  runAllTests: function() {
    if (this.data.isTestRunning) {
      return wx.showToast({
        title: '测试正在运行中',
        icon: 'none'
      });
    }

    this.setData({
      testStatus: '测试进行中...',
      isTestRunning: true,
      summaries: {},
      logs: []
    });

    var self = this;
    
    // 使用setTimeout让界面可以先刷新
    setTimeout(function() {
      try {
        var results = testUtils.runAllTests();
        
        self.setData({
          testStatus: results.failed > 0 ? '测试完成，有失败项' : '测试全部通过',
          summaries: results,
          isTestRunning: false,
          logs: testUtils.results.logs || []
        });
        
        wx.showToast({
          title: results.failed > 0 ? '测试存在失败项' : '测试全部通过',
          icon: results.failed > 0 ? 'error' : 'success'
        });
      } catch (error) {
        self.setData({
          testStatus: '测试执行错误',
          isTestRunning: false,
          logs: [{
            name: '执行错误',
            passed: false,
            message: error.message,
            timestamp: new Date().toISOString()
          }]
        });
        
        wx.showToast({
          title: '测试执行出错',
          icon: 'error'
        });
        
        console.error('测试执行错误:', error);
      }
    }, 100);
  },

  /**
   * 运行单个模块测试
   */
  runModuleTest: function(e) {
    if (this.data.isTestRunning) {
      return wx.showToast({
        title: '测试正在运行中',
        icon: 'none'
      });
    }
    
    var module = e.currentTarget.dataset.module;
    if (!module) return;
    
    var self = this;
    
    self.setData({
      testStatus: '正在测试 ' + module + '...',
      isTestRunning: true
    });
    
    // 使用setTimeout确保界面可以先更新
    setTimeout(function() {
      try {
        var testMethod = 'test' + module.charAt(0).toUpperCase() + module.slice(1);
        
        if (typeof testUtils[testMethod] !== 'function') {
          throw new Error('找不到测试方法: ' + testMethod);
        }
        
        // 重置测试utils
        testUtils.init();
        
        // 执行测试
        var result = testUtils[testMethod]();
        
        self.setData({
          ['summaries.' + module]: result,
          testStatus: result.failed > 0 ? module + ' 测试有失败项' : module + ' 测试通过',
          isTestRunning: false,
          logs: testUtils.results.logs || []
        });
        
        wx.showToast({
          title: result.failed > 0 ? '测试存在失败项' : '测试通过',
          icon: result.failed > 0 ? 'error' : 'success'
        });
      } catch (error) {
        self.setData({
          testStatus: '测试执行错误',
          isTestRunning: false,
          logs: [{
            name: '执行错误',
            passed: false,
            message: error.message,
            timestamp: new Date().toISOString()
          }]
        });
        
        wx.showToast({
          title: '测试执行出错',
          icon: 'error'
        });
        
        console.error('测试执行错误:', error);
      }
    }, 100);
  },

  /**
   * 运行极端测试
   */
  runExtremeTest: function() {
    if (this.data.isTestRunning) {
      return wx.showToast({
        title: '测试正在运行中',
        icon: 'none'
      });
    }
    
    var self = this;
    
    self.setData({
      testStatus: '正在运行极端测试...',
      isTestRunning: true,
      extremeTestResults: null
    });
    
    // 使用setTimeout确保界面可以先更新
    setTimeout(function() {
      try {
        // 执行极端测试
        var results = extremeTestHelper.runExtremeSuite();
        
        self.setData({
          extremeTestResults: results,
          testStatus: '极端测试完成',
          isTestRunning: false
        });
        
        wx.showToast({
          title: '极端测试完成',
          icon: 'success'
        });
      } catch (error) {
        self.setData({
          testStatus: '极端测试执行错误',
          isTestRunning: false,
          logs: self.data.logs.concat([{
            name: '极端测试错误',
            passed: false,
            message: error.message,
            timestamp: new Date().toISOString()
          }])
        });
        
        wx.showToast({
          title: '极端测试出错',
          icon: 'error'
        });
        
        console.error('极端测试执行错误:', error);
      }
    }, 100);
  },

  /**
   * 切换展开的部分
   */
  toggleSection: function(e) {
    var section = e.currentTarget.dataset.section;
    
    if (this.data.expandedSection === section) {
      this.setData({
        expandedSection: ''
      });
    } else {
      this.setData({
        expandedSection: section
      });
    }
  },

  /**
   * 清空测试结果
   */
  clearResults: function() {
    this.setData({
      testStatus: '待测试',
      summaries: {},
      logs: [],
      extremeTestResults: null
    });
  },

  /**
   * 复制测试日志到剪贴板
   */
  copyLogs: function() {
    var logsText = JSON.stringify(this.data.logs, null, 2);
    
    wx.setClipboardData({
      data: logsText,
      success: function() {
        wx.showToast({
          title: '日志已复制',
          icon: 'success'
        });
      }
    });
  },
  
  /**
   * 导航到其他页面
   */
  navigateTo: function(e) {
    var url = e.currentTarget.dataset.url;
    if (!url) return;
    
    wx.navigateTo({
      url: url
    });
  }
}); 