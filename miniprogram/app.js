// app.js
import { 
  initNetworkListener, 
  onNetworkStatusChange, 
  hasNetworkConnection 
} from './utils/networkUtils';
import { syncQueue } from './utils/storageUtils';
import apiService from './utils/apiService';

App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        console.log('登录成功', res);
      }
    });

    // 初始化网络监听
    this.initNetwork();
    
    // 记录同步状态
    this.syncStatus = {
      lastSync: null,
      inProgress: false,
      retryCount: 0
    };
  },

  // 初始化网络状态监听
  async initNetwork() {
    const networkStatus = await initNetworkListener();
    
    // 更新全局网络状态
    this.globalData.networkType = networkStatus.networkType;
    this.globalData.isConnected = networkStatus.isConnected;
    
    // 网络恢复时处理同步队列
    onNetworkStatusChange((status) => {
      this.globalData.networkType = status.networkType;
      this.globalData.isConnected = status.isConnected;
      
      if (status.isConnected && !this.globalData.wasConnected) {
        // 网络恢复，处理同步队列
        this.processSyncQueue();
      }
      
      this.globalData.wasConnected = status.isConnected;
    });
    
    console.log('网络状态初始化完成:', networkStatus);
  },

  getNetworkType() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success(res) {
          resolve(res.networkType);
        },
        fail() {
          resolve('unknown');
        }
      });
    });
  },
  
  onNetworkStatusChange(cb) {
    wx.onNetworkStatusChange(cb);
  },
  
  /**
   * 获取同步队列统计信息
   * @returns {Promise<Object>} 同步队列状态
   */
  async syncQueueStats() {
    const queue = await syncQueue.getAll();
    
    return {
      queueLength: queue.length,
      lastSync: this.syncStatus.lastSync 
        ? new Date(this.syncStatus.lastSync).toLocaleString() 
        : null,
      inProgress: this.syncStatus.inProgress
    };
  },
  
  /**
   * 处理同步队列
   * @returns {Promise<Array>} 处理结果
   */
  async processSyncQueue() {
    // 如果当前没有网络连接或同步正在进行中，则不处理
    if (!hasNetworkConnection() || this.syncStatus.inProgress) {
      return [];
    }
    
    this.syncStatus.inProgress = true;
    
    try {
      const results = await apiService.processSyncQueue();
      
      // 更新同步状态
      this.syncStatus.lastSync = Date.now();
      this.syncStatus.inProgress = false;
      this.syncStatus.retryCount = 0;
      
      // 发送同步成功的事件通知
      if (results.length > 0) {
        this.globalData.syncEvent = {
          type: 'success',
          count: results.length,
          timestamp: Date.now()
        };
      }
      
      return results;
    } catch (error) {
      console.error('处理同步队列失败:', error);
      
      // 更新同步状态
      this.syncStatus.inProgress = false;
      this.syncStatus.retryCount += 1;
      
      // 发送同步失败的事件通知
      this.globalData.syncEvent = {
        type: 'error',
        error: error.message,
        timestamp: Date.now()
      };
      
      // 如果重试次数小于最大重试次数，则稍后重试
      if (this.syncStatus.retryCount < 3 && hasNetworkConnection()) {
        setTimeout(() => {
          this.processSyncQueue();
        }, this.syncStatus.retryCount * 5000); // 递增重试时间间隔
      }
      
      return [];
    }
  },
  
  globalData: {
    userInfo: null,
    networkType: 'wifi',
    isConnected: true,
    wasConnected: true,
    syncEvent: null
  }
}); 