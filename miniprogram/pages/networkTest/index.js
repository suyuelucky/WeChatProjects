import { 
  testOfflineMode, 
  testWeakNetwork, 
  runNetworkAdaptationTests 
} from '../../utils/networkTester';

// 网络状态诊断页面
var networkUtils = require('../../utils/networkUtils');
var timeoutHandler = require('../../utils/timeoutHandler');
var ErrorCollector = require('../../utils/error-collector');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isTestRunning: false,
    testResults: null,
    networkStatus: {
      type: 'unknown',
      connected: false,
      strength: 'unknown'
    },
    timeoutStats: {
      total: 0,
      byHost: {},
      byAPI: {},
      byNetwork: {}
    },
    latencyTest: {
      running: false,
      results: [],
      average: 0
    },
    diagnosticResults: {
      overall: '未诊断',
      details: [],
      suggestions: []
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.updateNetworkStatus();
    this.updateTimeoutStats();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.updateNetworkStatus();
    this.unsubscribeNetworkChange = networkUtils.onNetworkStatusChange(this.handleNetworkChange.bind(this));
  },
  
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    if (this.unsubscribeNetworkChange) {
      this.unsubscribeNetworkChange();
      this.unsubscribeNetworkChange = null;
    }
  },

  /**
   * 处理网络状态变化
   */
  handleNetworkChange: function (status) {
    this.setData({
      networkStatus: status
    });
    
    ErrorCollector.reportWarning('network', '网络状态变化', status);
    
    this.runSimpleDiagnostic();
  },

  /**
   * 更新网络状态
   */
  updateNetworkStatus() {
    wx.getNetworkType({
      success: (res) => {
        this.setData({
          'networkStatus.isConnected': res.networkType !== 'none',
          'networkStatus.networkType': res.networkType
        });
      }
    });
  },

  /**
   * 更新超时统计
   */
  updateTimeoutStats: function () {
    var stats = timeoutHandler.getTimeoutStats();
    this.setData({
      timeoutStats: stats
    });
  },

  /**
   * 运行离线测试
   */
  async runOfflineTest() {
    this.setData({ isTestRunning: true, testResults: null });
    
    try {
      const results = await testOfflineMode((progress) => {
        console.log('离线测试进度:', progress);
      });
      
      this.setData({
        isTestRunning: false,
        testResults: {
          type: 'offline',
          results,
          success: results.offlineOperation && results.syncQueueAddition,
          timestamp: new Date().toLocaleString()
        }
      });
      
      wx.showToast({
        title: results.offlineOperation ? '离线测试通过' : '离线测试失败',
        icon: results.offlineOperation ? 'success' : 'error'
      });
    } catch (error) {
      console.error('离线测试异常:', error);
      this.setData({ 
        isTestRunning: false,
        testResults: {
          type: 'offline',
          error: error.message,
          success: false,
          timestamp: new Date().toLocaleString()
        }
      });
      
      wx.showToast({
        title: '测试执行异常',
        icon: 'error'
      });
    }
  },

  /**
   * 运行弱网测试
   */
  async runWeakNetworkTest() {
    this.setData({ isTestRunning: true, testResults: null });
    
    try {
      const results = await testWeakNetwork((progress) => {
        console.log('弱网测试进度:', progress);
      });
      
      this.setData({
        isTestRunning: false,
        testResults: {
          type: 'weakNetwork',
          results,
          success: results.requestsCompleted > 0,
          timestamp: new Date().toLocaleString()
        }
      });
      
      wx.showToast({
        title: results.requestsCompleted > 0 ? '弱网测试通过' : '弱网测试失败',
        icon: results.requestsCompleted > 0 ? 'success' : 'error'
      });
    } catch (error) {
      console.error('弱网测试异常:', error);
      this.setData({ 
        isTestRunning: false,
        testResults: {
          type: 'weakNetwork',
          error: error.message,
          success: false,
          timestamp: new Date().toLocaleString()
        }
      });
      
      wx.showToast({
        title: '测试执行异常',
        icon: 'error'
      });
    }
  },

  /**
   * 运行综合测试
   */
  async runFullTest() {
    this.setData({ isTestRunning: true, testResults: null });
    
    try {
      const results = await runNetworkAdaptationTests();
      
      this.setData({
        isTestRunning: false,
        testResults: {
          type: 'full',
          results,
          success: results.overall.success,
          message: results.overall.message,
          timestamp: new Date().toLocaleString()
        }
      });
      
      wx.showToast({
        title: results.overall.success ? '综合测试通过' : '综合测试失败',
        icon: results.overall.success ? 'success' : 'error'
      });
    } catch (error) {
      console.error('综合测试异常:', error);
      this.setData({ 
        isTestRunning: false,
        testResults: {
          type: 'full',
          error: error.message,
          success: false,
          timestamp: new Date().toLocaleString()
        }
      });
      
      wx.showToast({
        title: '测试执行异常',
        icon: 'error'
      });
    }
  },

  /**
   * 运行网络延迟测试
   */
  runLatencyTest: function () {
    var self = this;
    var testUrls = [
      'https://api.example.com/ping',
      'https://weixin.qq.com',
      'https://qq.com'
    ];
    
    this.setData({
      'latencyTest.running': true,
      'latencyTest.results': []
    });

    var promises = testUrls.map(function (url) {
      return self.testLatency(url);
    });

    Promise.all(promises).then(function (results) {
      var validResults = results.filter(function (r) {
        return r.latency > 0;
      });
      
      var totalLatency = validResults.reduce(function (sum, item) {
        return sum + item.latency;
      }, 0);
      
      var averageLatency = validResults.length > 0 ? 
        Math.round(totalLatency / validResults.length) : 0;
      
      self.setData({
        'latencyTest.running': false,
        'latencyTest.results': results,
        'latencyTest.average': averageLatency
      });
      
      self.runFullDiagnostic();
    });
  },

  /**
   * 测试单个URL的延迟
   */
  testLatency: function (url) {
    var self = this;
    return new Promise(function (resolve) {
      var startTime = Date.now();
      
      wx.request({
        url: url,
        method: 'HEAD',
        timeout: 10000,
        success: function () {
          var latency = Date.now() - startTime;
          resolve({
            url: url,
            latency: latency,
            status: 'success'
          });
          
          var currentResults = self.data.latencyTest.results.slice();
          currentResults.push({
            url: url,
            latency: latency,
            status: 'success'
          });
          
          self.setData({
            'latencyTest.results': currentResults
          });
        },
        fail: function (err) {
          resolve({
            url: url,
            latency: -1,
            status: 'fail',
            error: err.errMsg
          });
          
          var currentResults = self.data.latencyTest.results.slice();
          currentResults.push({
            url: url,
            latency: -1,
            status: 'fail',
            error: err.errMsg
          });
          
          self.setData({
            'latencyTest.results': currentResults
          });
        }
      });
    });
  },

  /**
   * 运行简单诊断
   */
  runSimpleDiagnostic: function () {
    var status = this.data.networkStatus;
    var diagnosticResults = {
      overall: '良好',
      details: [],
      suggestions: []
    };
    
    if (!status.connected) {
      diagnosticResults.overall = '无网络连接';
      diagnosticResults.details.push('当前无网络连接，请检查网络设置');
      diagnosticResults.suggestions.push('打开设备网络设置，确认WiFi或移动数据已启用');
    }
    else if (status.type === '2g') {
      diagnosticResults.overall = '网络较差';
      diagnosticResults.details.push('当前使用2G网络，网速较慢');
      diagnosticResults.suggestions.push('建议切换到更好的网络环境');
    }
    else if (status.type === '3g') {
      diagnosticResults.overall = '网络一般';
      diagnosticResults.details.push('当前使用3G网络，部分功能可能较慢');
    }
    else if (status.type === 'wifi' && status.signalStrength !== 'excellent') {
      diagnosticResults.overall = '网络良好';
      diagnosticResults.details.push('WiFi信号强度不是最佳');
      diagnosticResults.suggestions.push('尝试靠近路由器以获得更好的信号');
    }
    
    if (this.data.timeoutStats.total > 0) {
      diagnosticResults.details.push('有' + this.data.timeoutStats.total + '次网络请求超时记录');
      
      if (this.data.timeoutStats.total > 5) {
        diagnosticResults.overall = '网络不稳定';
        diagnosticResults.suggestions.push('建议运行完整网络诊断');
      }
    }
  }
}); 