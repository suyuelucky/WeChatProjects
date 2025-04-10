// app.js
var networkUtils = require('./utils/networkUtils');
var initNetworkListener = networkUtils.initNetworkListener;
var onNetworkStatusChange = networkUtils.onNetworkStatusChange;
var hasNetworkConnection = networkUtils.hasNetworkConnection;

var storageUtils = require('./utils/storageUtils');
var syncQueue = storageUtils.syncQueue;

var apiService = require('./utils/apiService');
var EventBus = require('./utils/eventBus');
var SystemUtils = require('./utils/systemUtils'); // 导入系统工具
var ErrorCollector = require('./utils/error-collector.js');

// 导入存储管理器构造函数
var StorageManager = require('./utils/storage');

// 导入服务容器
var ServiceContainer = require('./services/container');

// 确保先初始化错误收集器
ErrorCollector.init();

App({
  onLaunch: function() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      ErrorCollector.reportError('cloud-init', '云环境不可用：基础库版本过低');
    } else {
      try {
        wx.cloud.init({
          // env 参数说明：
          //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
          //   此处填入环境 ID，环境 ID 可打开云控制台查看
          //   如不填则使用默认环境（第一个创建的环境）
          env: 'cloudbase-5giucop314e2cd87',
          traceUser: true,
        });
        console.log('云开发初始化成功');
        
        // 设置云函数超时和重试
        var callCloudFunction = function(options, retryCount) {
          retryCount = retryCount || 0;
          
          return new Promise(function(resolve, reject) {
            wx.cloud.callFunction({
              name: options.name,
              data: options.data,
              config: {
                timeout: 30000 // 增加云函数超时时间到30秒
              },
              success: function(res) {
                resolve(res);
              },
              fail: function(err) {
                console.error('云函数调用失败:', err, options);
                // 检查是否为超时错误
                var isTimeoutError = err.errMsg && (
                  err.errMsg.includes('timeout') || 
                  err.errMsg.includes('超时')
                );
                
                // 如果环境ID无效，记录更详细的信息
                if (err.errMsg && err.errMsg.includes('env check invalid')) {
                  console.error('云环境ID无效:', err.errMsg);
                  ErrorCollector.reportError('cloud-env', '云环境ID无效', { error: err });
                }
                
                // 如果是超时错误且未达到最大重试次数，则重试
                if ((isTimeoutError || err.errCode === -100002) && retryCount < 2) {
                  console.log('云函数调用超时，重试中...', options.name);
                  // 延时后重试
                  setTimeout(function() {
                    callCloudFunction(options, retryCount + 1)
                      .then(resolve)
                      .catch(reject);
                  }, 1000 * (retryCount + 1));
                } else {
                  reject(err);
                }
              }
            });
          });
        };
        
        // 测试云环境连接
        callCloudFunction({
          name: 'getOpenId',
          data: { msg: 'cloudInit' }
        }).then(function(res) {
          console.log('云环境连接测试成功:', res);
          ErrorCollector.reportWarning('cloud-init', '云环境测试成功');
        }).catch(function(err) {
          console.error('云环境连接测试失败:', err);
          ErrorCollector.reportError('cloud-init', '云环境测试失败', { error: err });
        });
        
        // 保存云函数调用方法到全局
        this.callCloudFunction = callCloudFunction;
      } catch (err) {
        console.error('云环境初始化失败:', err);
        ErrorCollector.reportError('cloud-init', '云环境初始化失败', { error: err });
      }
    }

    // 初始化全局数据
    if (!this.globalData) {
      this.globalData = {};
    }

    // 初始化存储管理器
    this.initStorageManager();

    // 记录应用启动
    ErrorCollector.reportWarning('app', '应用启动');
    
    // 获取设备信息并记录
    try {
      var systemInfo = wx.getSystemInfoSync();
      this.globalData.systemInfo = systemInfo;
      
      // 记录设备信息
      ErrorCollector.reportWarning('device', '设备信息', {
        brand: systemInfo.brand,
        model: systemInfo.model,
        system: systemInfo.system,
        platform: systemInfo.platform,
        SDKVersion: systemInfo.SDKVersion,
        screenWidth: systemInfo.screenWidth,
        screenHeight: systemInfo.screenHeight,
        windowWidth: systemInfo.windowWidth,
        windowHeight: systemInfo.windowHeight,
        pixelRatio: systemInfo.pixelRatio
      });
      
      // 根据设备性能级别设置应用参数
      this._adjustAppSettingsByDevice(systemInfo);
    } catch (err) {
      ErrorCollector.reportError('app-launch', '获取系统信息失败', { error: err });
      console.error('获取系统信息失败:', err);
    }
    
    // 检查并清理临时存储
    try {
      if (this.storageManager) {
        this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.TEMP);
      }
    } catch (err) {
      ErrorCollector.reportError('app-launch', '清理临时存储失败', { error: err });
      console.error('清理临时存储失败:', err);
    }
    
    // 监听全局未捕获错误和Promise异常
    this._setupGlobalErrorHandling();
    
    // 网络状态监听
    this._setupNetworkMonitoring();

    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('logs', logs);

    // 登录
    wx.login({
      success: function(res) {
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
    
    // 立即检查存储空间
    this.checkStorageSpace();
  },

  onShow: function(options) {
    // 记录应用恢复场景
    ErrorCollector.reportWarning('app', '应用恢复前台', {
      scene: options.scene,
      path: options.path,
      query: options.query
    });
    
    // 确保ErrorCollector已初始化
    if (!ErrorCollector.initialized) {
      console.warn('ErrorCollector未完全初始化');
    }
    
    // 检查存储状态（使用try-catch防止错误中断后续流程）
    try {
      this._checkStorageStatus();
    } catch (err) {
      console.error('检查存储状态失败:', err);
    }
  },

  onHide: function() {
    // 记录应用切后台
    ErrorCollector.reportWarning('app', '应用切换到后台');
    
    // 应用切换到后台时清理缓存存储
    try {
      if (this.storageManager) {
        this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.CACHE);
      }
    } catch (err) {
      ErrorCollector.reportError('app-hide', '切后台清理缓存失败', { error: err });
      console.error('切后台清理缓存失败:', err);
    }
  },

  onError: function(error) {
    // 记录全局错误
    ErrorCollector.reportError('app-global', '全局错误', { error: error });
    console.error('发生全局错误:', error);
    
    // 在发生严重错误时尝试清理存储空间
    this._performEmergencyCleanup();
  },

  onPageNotFound: function(res) {
    // 记录页面未找到
    ErrorCollector.reportError('app-navigation', '页面未找到', {
      path: res.path,
      query: res.query
    });
    
    // 重定向到首页
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 初始化存储管理器
  initStorageManager: function() {
    try {
      // 创建存储管理器实例
      this.storageManager = new StorageManager({
        maxStorageSize: 50 * 1024 * 1024, // 50MB
        warningThreshold: 0.8,
        criticalThreshold: 0.9,
        autoCleanup: true
      });
      
      // 同时设置到globalData中
      this.globalData.storageManager = this.storageManager;
      
      console.log('存储管理器初始化成功');
      
      // 监听存储空间事件
      var self = this;
      EventBus.on('storage:warning', function(data) {
        console.warn('存储空间警告:', data);
        wx.showToast({
          title: '存储空间不足，已自动清理',
          icon: 'none'
        });
      });
    } catch (err) {
      console.error('初始化存储管理器失败:', err);
      
      // 创建一个简单的备用存储管理器
      this.storageManager = {
        getQuotaInfo: function() {
          try {
            var res = wx.getStorageInfoSync();
            return {
              currentSize: res.currentSize || 0,
              maxSize: res.limitSize || 50 * 1024 * 1024,
              usageRatio: res.limitSize ? (res.currentSize / res.limitSize) : 0,
              freeSpace: res.limitSize ? (res.limitSize - res.currentSize) : 50 * 1024 * 1024,
              keys: res.keys || []
            };
          } catch (err) {
            console.error('获取存储信息失败:', err);
            return {
              currentSize: 0,
              maxSize: 50 * 1024 * 1024,
              usageRatio: 0,
              freeSpace: 50 * 1024 * 1024,
              keys: []
            };
          }
        },
        STORAGE_TYPES: {
          TEMP: 'temp',
          USER: 'user',
          SYSTEM: 'system',
          CACHE: 'cache'
        },
        cleanup: function(storageType) {
          console.log('清理存储:', storageType);
          return true;
        },
        set: function(key, data, storageType) {
          try {
            wx.setStorageSync(key, data);
            return true;
          } catch (e) {
            console.error('存储数据失败:', e);
            return false;
          }
        },
        get: function(key, storageType, defaultValue) {
          try {
            var data = wx.getStorageSync(key);
            return data || defaultValue;
          } catch (e) {
            console.error('获取数据失败:', e);
            return defaultValue;
          }
        },
        remove: function(key, storageType) {
          try {
            wx.removeStorageSync(key);
            return true;
          } catch (e) {
            console.error('删除数据失败:', e);
            return false;
          }
        }
      };
      
      // 同时设置到globalData中
      this.globalData.storageManager = this.storageManager;
    }
  },

  // 检查存储空间
  checkStorageSpace: function() {
    if (!this.globalData.storageManager) return;
    
    try {
      // 根据storageManager可能存在的两个不同实现提供兼容处理
      var quotaInfo = null;
      
      if (typeof this.globalData.storageManager.getQuotaInfo === 'function') {
        quotaInfo = this.globalData.storageManager.getQuotaInfo();
      } else if (typeof this.storageManager.getStorageInfo === 'function') {
        // 使用getStorageInfo替代
        this.storageManager.getStorageInfo().then(function(info) {
          // 将结果转换为预期格式
          var usageRatio = info.usedSize / info.limitSize;
          if (usageRatio > 0.9) {
            console.warn('存储空间严重不足，执行紧急清理');
            self.emergencyStorageCleanup();
          } else if (usageRatio > 0.8) {
            console.warn('存储空间即将不足，执行常规清理');
            if (this.storageManager.cleanup) {
              this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.TEMP);
              this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.CACHE);
            }
          }
        });
        return; // 异步处理，直接返回
      } else {
        // 尝试使用wx.getStorageInfo替代
        var res = wx.getStorageInfoSync();
        quotaInfo = {
          currentSize: res.currentSize || 0,
          maxSize: res.limitSize || 50 * 1024 * 1024,
          usageRatio: res.limitSize ? (res.currentSize / res.limitSize) : 0,
          freeSpace: res.limitSize ? (res.limitSize - res.currentSize) : 50 * 1024 * 1024,
          keys: res.keys || []
        };
      }
      
      // 判断存储使用情况
      if (quotaInfo) {
        console.log('存储空间使用情况:', quotaInfo);
        
        // 当使用率超过90%时，执行紧急清理
        if (quotaInfo.usageRatio > 0.9) {
          console.warn('存储空间严重不足，执行紧急清理');
          this.emergencyStorageCleanup();
        }
        // 当使用率超过80%时，执行常规清理
        else if (quotaInfo.usageRatio > 0.8) {
          console.warn('存储空间即将不足，执行常规清理');
          if (typeof this.globalData.storageManager.cleanupByStrategy === 'function') {
            this.globalData.storageManager.cleanupByStrategy();
          } else if (this.storageManager && this.storageManager.cleanup) {
            this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.TEMP);
            this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.CACHE);
          }
        }
      }
    } catch (err) {
      console.error('检查存储空间失败:', err);
    }
  },

  // 紧急存储空间清理
  emergencyStorageCleanup: function() {
    try {
      console.warn('执行紧急存储空间清理');
      
      // 使用SystemUtils清理系统存储
      SystemUtils.cleanupSystemStorage()
        .then(function(freedBytes) {
          console.log('已清理系统存储，释放空间:', (freedBytes / 1024).toFixed(2), 'KB');
          
          // 通知用户已清理
          wx.showToast({
            title: '已清理存储空间',
            icon: 'success'
          });
        })
        .catch(function(err) {
          console.error('清理系统存储失败:', err);
          
          // 如果清理失败，仍然尝试通知用户
          wx.showToast({
            title: '部分清理成功',
            icon: 'none'
          });
        });
    } catch (err) {
      console.error('紧急清理存储空间失败:', err);
      
      wx.showToast({
        title: '清理失败',
        icon: 'none'
      });
    }
  },

  // 初始化网络状态监听
  initNetwork: function() {
    try {
      var self = this;
      
      // 初始化网络监听器
      initNetworkListener().then(function(status) {
        self.globalData.networkStatus = status;
        
        // 记录网络状态
        ErrorCollector.reportWarning('network', '初始网络状态', status);
      });
      
      // 监听网络状态变化
      this.networkStatusListener = onNetworkStatusChange(function(status) {
        self.globalData.networkStatus = status;
        
        // 记录网络状态变化
        ErrorCollector.reportWarning('network', '网络状态变化', status);
        
        // 网络恢复时尝试同步队列
        if (status.isConnected && !self.globalData.networkStatus.isConnected) {
          self.processSyncQueue();
        }
        
        // 触发网络状态变化事件
        EventBus.emit('network:change', status);
      });
    } catch (err) {
      ErrorCollector.reportError('app-network', '初始化网络监听失败', { error: err });
      console.error('初始化网络监听失败:', err);
    }
  },

  // 初始化服务容器和各服务
  initServices: function() {
    try {
      // 重置服务容器
      ServiceContainer.reset();
      
      // 注册存储服务
      var self = this;
      ServiceContainer.register('storage', function(container) {
        var StorageServiceModule = require('./services/storageService');
        return StorageServiceModule.init(container);
      });
      
      // 注册同步服务
      ServiceContainer.register('sync', function(container) {
        var SyncService = require('./services/syncService');
        var storageService = container.get('storage');
        return new SyncService(storageService);
      });
      
      // 注册追踪服务
      ServiceContainer.register('trace', function(container) {
        var TraceService = require('./services/traceService');
        var storageService = container.get('storage');
        var syncService = container.get('sync');
        return new TraceService(storageService, syncService);
      });
      
      // 注册照片服务
      ServiceContainer.register('photo', function(container) {
        var PhotoService = require('./services/photoService');
        var storageService = container.get('storage');
        return PhotoService.init(container);
      });
      
      // 注册错误服务
      ServiceContainer.register('error', function(container) {
        var ErrorService = require('./services/errorService');
        return new ErrorService(ErrorCollector);
      });
      
      // 注册云服务
      ServiceContainer.register('cloud', function(container) {
        var CloudService = require('./services/cloudService');
        return CloudService.init(container);
      });
      
      console.log('服务容器初始化完成');
    } catch (err) {
      ErrorCollector.reportError('app-services', '初始化服务容器失败', { error: err });
      console.error('初始化服务容器失败:', err);
    }
  },
  
  // 设置内存监控和定期清理
  setupMemoryMonitoring: function() {
    var self = this; // 添加self变量引用
    
    // 记录启动时的性能数据
    this.globalData.performanceData = {
      startupTime: Date.now(),
      memoryWarnings: 0,
      lastCleanup: null
    };
    
    // 监听内存警告事件
    wx.onMemoryWarning(function(res) {
      console.warn('内存警告', res.level);
      self.globalData.performanceData.memoryWarnings++;
      
      // 内存警告时立即清理缓存
      self.cleanupMemory(true);
      
      // 记录事件
      if (self.services && self.services.errorService) {
        self.services.errorService.reportWarning('memory', '内存警告', {
          level: res.level,
          count: self.globalData.performanceData.memoryWarnings
        });
      }
    });
    
    // 定期清理内存
    // 后台停留10分钟后自动清理一次
    this.backgroundCleanupTimer = null;
    
    // 监听应用进入后台
    wx.onAppHide(function() {
      // 记录进入后台的时间
      self.globalData.backgroundEnterTime = Date.now();
      
      // 设置定时器，10分钟后如果应用还在后台，则执行清理
      self.backgroundCleanupTimer = setTimeout(function() {
        self.cleanupMemory(false);
      }, 10 * 60 * 1000); // 10分钟
    });
    
    // 监听应用回到前台
    wx.onAppShow(function() {
      // 清除后台定时器
      if (self.backgroundCleanupTimer) {
        clearTimeout(self.backgroundCleanupTimer);
        self.backgroundCleanupTimer = null;
      }
      
      // 如果在后台停留超过30分钟，回到前台时执行清理
      var backgroundTime = Date.now() - (self.globalData.backgroundEnterTime || 0);
      if (backgroundTime > 30 * 60 * 1000) { // 30分钟
        self.cleanupMemory(false);
      }
    });
    
    // 每小时执行一次常规清理
    setInterval(function() {
      self.cleanupMemory(false);
    }, 60 * 60 * 1000); // 1小时
  },
  
  // 清理内存
  cleanupMemory: function(isUrgent) {
    console.log('执行' + (isUrgent ? '紧急' : '常规') + '内存清理');
    
    // 同时检查存储空间
    if (isUrgent) {
      this.checkStorageSpace();
    }
    
    var photoService = this.getService('photo');
    if (photoService) {
      photoService.cleanupCache();
    }
    
    // 记录最后清理时间
    this.globalData.performanceData.lastCleanup = Date.now();
    
    // 打印内存使用情况
    if (photoService && photoService.getMemoryStats) {
      var stats = photoService.getMemoryStats();
      console.log('内存使用统计:', stats);
    }
  },

  getNetworkType: function() {
    return new Promise(function(resolve) {
      wx.getNetworkType({
        success: function(res) {
          resolve(res.networkType);
        },
        fail: function() {
          resolve('unknown');
        }
      });
    });
  },
  
  onNetworkStatusChange: function(cb) {
    wx.onNetworkStatusChange(cb);
  },
  
  /**
   * 获取同步队列统计信息
   * @returns {Promise<Object>} 同步队列状态
   */
  syncQueueStats: function() {
    var self = this;
    return syncQueue.getAll().then(function(queue) {
      return {
        queueLength: queue.length,
        lastSync: self.syncStatus.lastSync 
          ? new Date(self.syncStatus.lastSync).toLocaleString() 
          : null,
        inProgress: self.syncStatus.inProgress
      };
    });
  },
  
  /**
   * 处理同步队列
   * @returns {Promise<Array>} 处理结果
   */
  processSyncQueue: function() {
    // 使用新的同步服务
    if (this.services && this.services.sync) {
      return this.services.sync.processSyncQueue();
    }
    
    // 如果当前没有网络连接或同步正在进行中，则不处理
    if (!hasNetworkConnection() || this.syncStatus.inProgress) {
      return [];
    }
    
    this.syncStatus.inProgress = true;
    
    try {
      var results = apiService.processSyncQueue();
      
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
        setTimeout(function() {
          self.processSyncQueue();
        }, this.syncStatus.retryCount * 5000); // 递增重试时间间隔
      }
      
      return [];
    }
  },

  /**
   * 获取服务实例
   * @param {String} name 服务名称
   * @return {Object} 服务实例
   */
  getService: function(name) {
    return ServiceContainer.get(name);
  },
  
  // 记录错误
  logError: function(error, extra) {
    var errorService = this.getService('error');
    if (errorService) {
      return errorService.reportError('app', error, extra);
    }
    
    // 如果错误服务未初始化，使用默认处理
    console.error('应用错误:', error, extra);
    return null;
  },
  
  /**
   * 设置全局错误处理
   * @private
   */
  _setupGlobalErrorHandling: function() {
    var self = this;
    
    // 捕获未处理的Promise异常
    wx.onUnhandledRejection && wx.onUnhandledRejection(function(res) {
      ErrorCollector.reportError('promise-rejection', res.reason || '未处理的Promise异常', {
        message: res.reason && res.reason.message,
        stack: res.reason && res.reason.stack
      });
    });
    
    // 设置全局错误处理
    window && window.addEventListener && window.addEventListener('error', function(event) {
      ErrorCollector.reportError('global-js', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
      return false;
    });
  },
  
  /**
   * 设置网络监听
   * @private
   */
  _setupNetworkMonitoring: function() {
    var self = this; // 添加self变量引用
    
    wx.getNetworkType({
      success: function(res) {
        self.globalData.networkType = res.networkType;
        ErrorCollector.reportWarning('network', '网络状态', { type: res.networkType });
      }
    });
    
    wx.onNetworkStatusChange(function(res) {
      self.globalData.networkType = res.networkType;
      self.globalData.isConnected = res.isConnected;
      
      ErrorCollector.reportWarning('network', '网络状态变化', {
        type: res.networkType,
        isConnected: res.isConnected
      });
      
      // 网络恢复连接时，尝试上传错误日志
      if (res.isConnected) {
        self._uploadErrorLogs();
      }
    });
  },
  
  /**
   * 调整应用参数适应设备性能
   * @param {Object} systemInfo 系统信息
   * @private
   */
  _adjustAppSettingsByDevice: function(systemInfo) {
    // 根据设备性能水平调整应用参数
    var performanceLevel = 'medium'; // 默认中等
    
    // 评估设备性能
    if (systemInfo.benchmarkLevel) {
      // benchmarkLevel通常在1-10之间，越高代表性能越好
      var benchmark = parseInt(systemInfo.benchmarkLevel);
      if (benchmark > 7) {
        performanceLevel = 'high';
      } else if (benchmark > 4) {
        performanceLevel = 'medium';
      } else {
        performanceLevel = 'low';
      }
    } else {
      // 没有benchmark时，使用其他方式评估
      if (systemInfo.platform === 'ios' || 
          (systemInfo.platform === 'android' && systemInfo.system.includes('10'))) {
        performanceLevel = 'medium';
      } else {
        performanceLevel = 'low';
      }
    }
    
    this.globalData.performanceLevel = performanceLevel;
    
    // 根据性能水平设置参数
    switch (performanceLevel) {
      case 'high':
        this.globalData.settings = {
          enableAnimation: true,
          imageQuality: 'high',
          maxContinuousPhotos: 20,
          enableBackgroundEffects: true,
          cacheExpiration: 7 * 24 * 60 * 60 * 1000  // 7天
        };
        break;
      case 'medium':
        this.globalData.settings = {
          enableAnimation: true,
          imageQuality: 'medium',
          maxContinuousPhotos: 10,
          enableBackgroundEffects: false,
          cacheExpiration: 3 * 24 * 60 * 60 * 1000  // 3天
        };
        break;
      case 'low':
        this.globalData.settings = {
          enableAnimation: false,
          imageQuality: 'low',
          maxContinuousPhotos: 5,
          enableBackgroundEffects: false,
          cacheExpiration: 1 * 24 * 60 * 60 * 1000  // 1天
        };
        break;
    }
    
    // 记录性能级别和设置
    ErrorCollector.reportWarning('performance', '设备性能级别', {
      level: performanceLevel,
      settings: this.globalData.settings
    });
  },
  
  /**
   * 检查存储状态
   * @private
   */
  _checkStorageStatus: function() {
    try {
      // 确保存在storageManager
      if (!this.storageManager) {
        if (this.globalData && this.globalData.storageManager) {
          this.storageManager = this.globalData.storageManager;
        } else {
          console.error('存储管理器未初始化');
          return;
        }
      }
      
      // 获取存储报告
      var report = null;
      
      // 使用兼容方式获取存储报告
      if (typeof this.storageManager.getStorageReport === 'function') {
        report = this.storageManager.getStorageReport();
      } else if (typeof this.storageManager.getStorageInfo === 'function') {
        // 异步方式处理
        this.storageManager.getStorageInfo().then(function(info) {
          if (!info) return;
          
          var needsCleanup = info.percentUsed > 80;
          var isCritical = info.percentUsed > 90;
          
          if (needsCleanup) {
            // 记录警告
            ErrorCollector.reportWarning('storage', '存储空间不足，执行清理', {
              usagePercent: info.percentUsed
            });
            
            // 按优先级清理
            if (this.storageManager.cleanup && this.storageManager.STORAGE_TYPES) {
              this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.TEMP);
              this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.CACHE);
              
              if (isCritical) {
                // 空间严重不足时，进一步清理
                this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.USER, null, 50);
              }
            }
          }
        });
        return; // 异步处理，直接返回
      } else {
        // 使用wx原生API
        var res = wx.getStorageInfoSync();
        var usagePercent = res.limitSize ? (res.currentSize / res.limitSize) * 100 : 0;
        
        report = {
          needsCleanup: usagePercent > 80,
          isCritical: usagePercent > 90,
          storage: {
            usagePercent: usagePercent
          }
        };
      }
      
      // 同步方式处理存储报告
      if (report && report.needsCleanup) {
        ErrorCollector.reportWarning('storage', '存储空间不足，执行清理', {
          usagePercent: report.storage.usagePercent
        });
        
        // 按优先级清理
        if (this.storageManager.cleanup && this.storageManager.STORAGE_TYPES) {
          this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.TEMP);
          this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.CACHE);
          
          if (report.isCritical) {
            // 空间严重不足时，进一步清理
            this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.USER, null, 50);
          }
        } else if (typeof this.storageManager.cleanupByStrategy === 'function') {
          this.storageManager.cleanupByStrategy('priority');
          
          if (report.isCritical) {
            this.storageManager.cleanupByStrategy('aggressive');
          }
        } else {
          // 最后兜底：使用自带的cleanupCache方法
          this._performEmergencyCleanup();
        }
      }
    } catch (err) {
      ErrorCollector.reportError('storage-check', '检查存储状态失败', { error: err });
      console.error('检查存储状态失败:', err);
    }
  },
  
  /**
   * 尝试上传错误日志
   * @private
   */
  _uploadErrorLogs: function() {
    try {
      var logs = ErrorCollector.getLogs();
      
      // 如果有错误日志且网络连接，上传日志
      if (logs.length > 0 && this.globalData.isConnected) {
        // TODO: 具体的上传URL根据实际情况设置
        var uploadUrl = 'https://api.example.com/logs'; // 替换为实际的日志上传地址
        
        ErrorCollector.uploadLogs(uploadUrl)
          .then(function(result) {
            console.log('错误日志上传成功:', result);
          })
          .catch(function(err) {
            console.error('错误日志上传失败:', err);
          });
      }
    } catch (err) {
      console.error('准备上传错误日志时发生异常:', err);
    }
  },
  
  /**
   * 在发生严重错误时执行紧急清理
   * @private
   */
  _performEmergencyCleanup: function() {
    try {
      // 清理所有临时存储
      this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.TEMP, 0, 90);
      this.storageManager.cleanup(this.storageManager.STORAGE_TYPES.CACHE, 0, 90);
    } catch (err) {
      console.error('紧急清理失败:', err);
    }
  },
  
  /**
   * 获取错误诊断报告
   * 可以在开发环境调用此方法查看应用的健康状态
   */
  getDiagnosticReport: function() {
    try {
      // 获取系统信息
      var systemInfo = this.globalData.systemInfo || wx.getSystemInfoSync();
      
      // 获取存储报告
      var storageReport = this.storageManager.getStorageReport();
      
      // 获取错误日志
      var errorLogs = ErrorCollector.getLogs().filter(function(log) {
        return log.type === 'error';
      });
      var warningLogs = ErrorCollector.getLogs().filter(function(log) {
        return log.type === 'warning';
      });
      
      // 构建完整报告
      var report = {
        timestamp: Date.now(),
        appVersion: this.version || '1.0.0',
        performanceLevel: this.globalData.performanceLevel,
        device: {
          brand: systemInfo.brand,
          model: systemInfo.model,
          system: systemInfo.system,
          platform: systemInfo.platform,
          SDKVersion: systemInfo.SDKVersion
        },
        network: {
          type: this.globalData.networkType,
          isConnected: this.globalData.isConnected
        },
        storage: storageReport,
        errors: {
          count: errorLogs.length,
          recent: errorLogs.slice(-5) // 最近5条错误
        },
        warnings: {
          count: warningLogs.length,
          recent: warningLogs.slice(-5) // 最近5条警告
        }
      };
      
      return report;
    } catch (err) {
      console.error('获取诊断报告失败:', err);
      return {
        error: true,
        message: '获取诊断报告失败: ' + (err.message || err)
      };
    }
  },
  
  globalData: {
    userInfo: null,
    systemInfo: null,
    performanceLevel: 'medium',
    networkType: 'unknown',
    isConnected: true,
    settings: {
      enableAnimation: true,
      imageQuality: 'medium',
      maxContinuousPhotos: 10,
      enableBackgroundEffects: false,
      cacheExpiration: 3 * 24 * 60 * 60 * 1000  // 3天
    },
    syncEvent: null,
    performanceData: {},
    backgroundEnterTime: null,
    storageManager: null  // 存储管理器实例
  },
  
  // 应用版本
  version: '1.0.0'
}); 