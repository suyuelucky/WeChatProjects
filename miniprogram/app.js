// app.js
const { 
  initNetworkListener, 
  onNetworkStatusChange, 
  hasNetworkConnection 
} = require('./utils/networkUtils');
const { syncQueue } = require('./utils/storageUtils');
const apiService = require('./utils/apiService');
const EventBus = require('./utils/eventBus');

// 导入服务容器
const ServiceContainer = require('./services/container');

// 导入服务
const StorageService = require('./services/storageService');
const SyncService = require('./services/syncService');
const TraceService = require('./services/traceService');
const PhotoService = require('./services/photoService');
const ErrorService = require('./services/errorService');
const CloudService = require('./services/cloudService');

App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env 参数说明：
        //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
        //   此处填入环境 ID，环境 ID 可打开云控制台查看
        //   如不填则使用默认环境（第一个创建的环境）
        env: 'xiuhuazhenMiniProGram',
        traceUser: true,
      });
      console.log('云开发初始化成功');
    }

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

    // 初始化服务容器
    this.initServices();
    
    // 设置内存监控和清理
    this.setupMemoryMonitoring();
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
      
      // 发布网络状态变化事件
      EventBus.emit('network:status:changed', {
        isConnected: status.isConnected,
        wasConnected: this.globalData.wasConnected,
        networkType: status.networkType
      });
      
      if (status.isConnected && !this.globalData.wasConnected) {
        // 网络恢复，处理同步队列
        this.processSyncQueue();
      }
      
      this.globalData.wasConnected = status.isConnected;
    });
    
    console.log('网络状态初始化完成:', networkStatus);
  },

  // 初始化服务容器和各服务
  initServices() {
    try {
      // 注册服务
      ServiceContainer
        .register('storageService', (container) => {
          try {
            return StorageService.init(container);
          } catch (err) {
            console.error('初始化storageService失败:', err);
            return null;
          }
        })
        .register('syncService', (container) => {
          try {
            return SyncService.init(container);
          } catch (err) {
            console.error('初始化syncService失败:', err);
            return null;
          }
        })
        .register('traceService', (container) => {
          try {
            return TraceService.init(container);
          } catch (err) {
            console.error('初始化traceService失败:', err);
            return null;
          }
        })
        .register('photoService', (container) => {
          try {
            return PhotoService.init(container);
          } catch (err) {
            console.error('初始化photoService失败:', err);
            return null;
          }
        })
        .register('errorService', (container) => {
          try {
            return ErrorService.init(container);
          } catch (err) {
            console.error('初始化errorService失败:', err);
            return null;
          }
        })
        .register('cloudService', (container) => {
          try {
            return CloudService.init(container);
          } catch (err) {
            console.error('初始化cloudService失败:', err);
            return null;
          }
        });
      
      // 初始化服务
      this.services = {
        storageService: ServiceContainer.get('storageService'),
        syncService: ServiceContainer.get('syncService'),
        traceService: ServiceContainer.get('traceService'),
        photoService: ServiceContainer.get('photoService'),
        errorService: ServiceContainer.get('errorService'),
        cloudService: ServiceContainer.get('cloudService')
      };
      
      console.log('所有服务初始化完成');
    } catch (error) {
      console.error('初始化服务失败:', error);
    }
  },
  
  // 设置内存监控和定期清理
  setupMemoryMonitoring() {
    // 记录启动时的性能数据
    this.globalData.performanceData = {
      startupTime: Date.now(),
      memoryWarnings: 0,
      lastCleanup: null
    };
    
    // 监听内存警告事件
    wx.onMemoryWarning(res => {
      console.warn('内存警告', res.level);
      this.globalData.performanceData.memoryWarnings++;
      
      // 内存警告时立即清理缓存
      this.cleanupMemory(true);
      
      // 记录事件
      if (this.services.errorService) {
        this.services.errorService.reportWarning('memory', '内存警告', {
          level: res.level,
          count: this.globalData.performanceData.memoryWarnings
        });
      }
    });
    
    // 定期清理内存
    // 后台停留10分钟后自动清理一次
    this.backgroundCleanupTimer = null;
    
    // 监听应用进入后台
    wx.onAppHide(() => {
      // 记录进入后台的时间
      this.globalData.backgroundEnterTime = Date.now();
      
      // 设置定时器，10分钟后如果应用还在后台，则执行清理
      this.backgroundCleanupTimer = setTimeout(() => {
        this.cleanupMemory(false);
      }, 10 * 60 * 1000); // 10分钟
    });
    
    // 监听应用回到前台
    wx.onAppShow(() => {
      // 清除后台定时器
      if (this.backgroundCleanupTimer) {
        clearTimeout(this.backgroundCleanupTimer);
        this.backgroundCleanupTimer = null;
      }
      
      // 如果在后台停留超过30分钟，回到前台时执行清理
      const backgroundTime = Date.now() - (this.globalData.backgroundEnterTime || 0);
      if (backgroundTime > 30 * 60 * 1000) { // 30分钟
        this.cleanupMemory(false);
      }
    });
    
    // 每小时执行一次常规清理
    setInterval(() => {
      this.cleanupMemory(false);
    }, 60 * 60 * 1000); // 1小时
  },
  
  // 清理内存
  cleanupMemory(isUrgent) {
    console.log(`执行${isUrgent ? '紧急' : '常规'}内存清理`);
    
    const photoService = this.getService('photoService');
    if (photoService) {
      photoService.cleanupCache();
    }
    
    // 记录最后清理时间
    this.globalData.performanceData.lastCleanup = Date.now();
    
    // 打印内存使用情况
    if (photoService && photoService.getMemoryStats) {
      const stats = photoService.getMemoryStats();
      console.log('内存使用统计:', stats);
    }
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
    // 使用新的同步服务
    if (this.services && this.services.syncService) {
      return this.services.syncService.processSyncQueue();
    }
    
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

  // 获取服务实例
  getService(serviceName) {
    if (this.services && this.services[serviceName]) {
      return this.services[serviceName];
    }
    return ServiceContainer.get(serviceName);
  },
  
  // 记录错误
  logError(error, extra = {}) {
    const errorService = this.getService('errorService');
    if (errorService) {
      return errorService.reportError('app', error, extra);
    }
    
    // 如果错误服务未初始化，使用默认处理
    console.error('应用错误:', error, extra);
    return null;
  },
  
  globalData: {
    userInfo: null,
    networkType: 'wifi',
    isConnected: true,
    wasConnected: true,
    syncEvent: null,
    performanceData: null,
    backgroundEnterTime: null
  }
}); 