import { onNetworkStatusChange, getNetworkStatus, isWeakNetwork } from '../../utils/networkUtils';

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    showDebugInfo: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    isConnected: true,
    networkType: 'unknown',
    syncQueueLength: 0,
    lastSync: null,
    isWeakNetwork: false
  },

  /**
   * 生命周期函数
   */
  lifetimes: {
    attached() {
      this.initNetworkListener();
      this.checkSyncQueue();
    },

    detached() {
      // 清理网络状态监听器
      if (this.unsubscribeNetwork) {
        this.unsubscribeNetwork();
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化网络状态监听
     */
    async initNetworkListener() {
      // 获取初始网络状态
      const networkStatus = await getNetworkStatus();
      
      this.setData({
        isConnected: networkStatus.isConnected,
        networkType: networkStatus.networkType,
        isWeakNetwork: isWeakNetwork()
      });
      
      // 监听网络状态变化
      this.unsubscribeNetwork = onNetworkStatusChange((status) => {
        this.setData({
          isConnected: status.isConnected,
          networkType: status.networkType,
          isWeakNetwork: isWeakNetwork()
        });
        
        // 如果网络恢复，尝试处理同步队列
        if (status.isConnected && !this.data.isConnected) {
          this.triggerEvent('networkRestore', { timestamp: Date.now() });
          this.checkSyncQueue();
        }
      });
    },
    
    /**
     * 检查同步队列状态
     */
    async checkSyncQueue() {
      const app = getApp();
      if (!app.syncQueueStats) return;
      
      const stats = await app.syncQueueStats();
      
      this.setData({
        syncQueueLength: stats.queueLength,
        lastSync: stats.lastSync
      });
    },
    
    /**
     * 手动触发同步
     */
    handleSyncNow() {
      if (!this.data.isConnected) {
        wx.showToast({
          title: '当前无网络连接',
          icon: 'none'
        });
        return;
      }
      
      const app = getApp();
      if (app.processSyncQueue) {
        app.processSyncQueue().then(() => {
          this.checkSyncQueue();
          wx.showToast({
            title: '同步完成',
            icon: 'success'
          });
        }).catch(error => {
          wx.showToast({
            title: '同步失败',
            icon: 'error'
          });
          console.error('同步失败:', error);
        });
      }
    }
  }
}); 