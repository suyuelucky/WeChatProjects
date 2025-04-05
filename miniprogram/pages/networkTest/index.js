import { 
  testOfflineMode, 
  testWeakNetwork, 
  runNetworkAdaptationTests 
} from '../../utils/networkTester';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isTestRunning: false,
    testResults: null,
    networkStatus: {
      isConnected: true,
      networkType: 'unknown'
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.updateNetworkStatus();
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
  }
}); 