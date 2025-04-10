/**
 * SyncManager - 同步管理器
 * 负责协调同步相关组件的工作
 * 
 * 创建时间: 2025年4月9日 10时08分22秒 CST
 * 创建者: Claude 3.7 Sonnet
 */

'use strict';

var EventBus = require('../utils/eventBus.js');

/**
 * 同步管理器
 * @namespace SyncManager
 */
var SyncManager = {
  /**
   * 初始化同步管理器
   * @param {Object} options 初始化选项
   * @param {Object} options.container 依赖容器
   * @param {Object} options.config 配置参数
   * @return {Object} 当前实例
   */
  init: function(options) {
    // 处理参数
    options = options || {};
    this.container = options.container || null;
    this.config = this._initConfig(options.config || {});
    
    // 初始化组件
    this._initComponents();
    
    // 注册事件监听
    this._registerEventListeners();
    
    console.log('同步管理器初始化完成，应用ID:', this.config.appId);
    
    return this;
  },
  
  /**
   * 初始化配置
   * @private
   * @param {Object} config 传入的配置
   * @return {Object} 标准化后的配置
   */
  _initConfig: function(config) {
    return {
      appId: config.appId || '',
      autoStart: typeof config.autoStart !== 'undefined' ? config.autoStart : true,
      collections: config.collections || [],
      adapter: {
        local: {
          type: 'local',
          config: config.localAdapter || {}
        },
        cloud: {
          type: 'cloud',
          config: config.cloudAdapter || {}
        }
      },
      scheduler: {
        maxConcurrent: config.maxConcurrent || 3,
        retryLimit: config.retryLimit || 3,
        retryDelay: config.retryDelay || 5000,
        networkAware: typeof config.networkAware !== 'undefined' ? config.networkAware : true
      }
    };
  },
  
  /**
   * 初始化组件
   * @private
   */
  _initComponents: function() {
    // 检查依赖容器
    if (!this.container) {
      throw new Error('未提供依赖容器');
    }
    
    // 引入依赖组件
    var SyncAdapter = require('./SyncAdapter.js');
    var SyncService = require('./syncService.js');
    var SyncScheduler = require('./SyncScheduler.js');
    
    // 初始化本地适配器
    var localAdapter = SyncAdapter.create();
    localAdapter.init(this.config.adapter.local);
    
    // 初始化云端适配器
    var cloudAdapter = SyncAdapter.create();
    cloudAdapter.init(this.config.adapter.cloud);
    
    // 注册适配器
    this.container.register('localAdapter', localAdapter);
    this.container.register('cloudAdapter', cloudAdapter);
    
    // 初始化同步服务
    SyncService.init(this.container);
    
    // 注册同步服务
    this.container.register('syncService', SyncService);
    
    // 初始化调度器
    var scheduler = SyncScheduler.init({
      syncService: SyncService,
      config: this.config.scheduler
    });
    
    // 注册调度器
    this.container.register('syncScheduler', scheduler);
    
    // 保存组件引用
    this.syncService = SyncService;
    this.localAdapter = localAdapter;
    this.cloudAdapter = cloudAdapter;
    this.scheduler = scheduler;
    
    // 如果配置为自动启动，启动服务
    if (this.config.autoStart) {
      this.start();
    }
  },
  
  /**
   * 注册事件监听
   * @private
   */
  _registerEventListeners: function() {
    // 监听同步相关事件
    EventBus.on('sync:completed', this._handleSyncCompleted.bind(this));
    EventBus.on('sync:failed', this._handleSyncFailed.bind(this));
    EventBus.on('scheduler:task:completed', this._handleTaskCompleted.bind(this));
    EventBus.on('scheduler:task:failed', this._handleTaskFailed.bind(this));
    
    // 监听网络状态变化
    EventBus.on('network:status:changed', this._handleNetworkChange.bind(this));
    
    // 监听应用状态变化
    EventBus.on('app:show', this._handleAppShow.bind(this));
    EventBus.on('app:hide', this._handleAppHide.bind(this));
  },
  
  /**
   * 处理同步完成事件
   * @private
   * @param {Object} data 事件数据
   */
  _handleSyncCompleted: function(data) {
    // 记录同步完成
    console.log('同步完成:', data.timestamp);
    
    // 触发管理器事件
    EventBus.emit('syncManager:sync:completed', {
      result: data.results,
      timestamp: data.timestamp
    });
  },
  
  /**
   * 处理同步失败事件
   * @private
   * @param {Object} data 事件数据
   */
  _handleSyncFailed: function(data) {
    // 记录同步失败
    console.error('同步失败:', data.error);
    
    // 触发管理器事件
    EventBus.emit('syncManager:sync:failed', {
      error: data.error,
      timestamp: data.timestamp
    });
  },
  
  /**
   * 处理任务完成事件
   * @private
   * @param {Object} data 事件数据
   */
  _handleTaskCompleted: function(data) {
    // 记录任务完成
    console.log('任务完成:', data.taskId);
    
    // 触发管理器事件
    EventBus.emit('syncManager:task:completed', {
      taskId: data.taskId,
      result: data.result,
      timestamp: data.timestamp
    });
  },
  
  /**
   * 处理任务失败事件
   * @private
   * @param {Object} data 事件数据
   */
  _handleTaskFailed: function(data) {
    // 记录任务失败
    console.error('任务失败:', data.taskId, data.error);
    
    // 触发管理器事件
    EventBus.emit('syncManager:task:failed', {
      taskId: data.taskId,
      error: data.error,
      willRetry: data.willRetry,
      retryCount: data.retryCount,
      timestamp: data.timestamp
    });
  },
  
  /**
   * 处理网络状态变化
   * @private
   * @param {Object} data 事件数据
   */
  _handleNetworkChange: function(data) {
    // 网络状态变化处理逻辑
    console.log('网络状态变化:', data.isConnected ? data.networkType : 'disconnected');
    
    // 触发管理器事件
    EventBus.emit('syncManager:network:changed', {
      isConnected: data.isConnected,
      networkType: data.networkType,
      timestamp: new Date().toISOString()
    });
  },
  
  /**
   * 处理应用显示
   * @private
   */
  _handleAppShow: function() {
    console.log('应用进入前台');
    
    // 触发管理器事件
    EventBus.emit('syncManager:app:show', {
      timestamp: new Date().toISOString()
    });
  },
  
  /**
   * 处理应用隐藏
   * @private
   */
  _handleAppHide: function() {
    console.log('应用进入后台');
    
    // 触发管理器事件
    EventBus.emit('syncManager:app:hide', {
      timestamp: new Date().toISOString()
    });
  },
  
  /**
   * 启动同步服务
   * @return {Promise<Object>} 启动结果
   */
  start: function() {
    var self = this;
    console.log('启动同步服务');
    
    // 启动调度器
    return this.scheduler.start()
      .then(function() {
        // 触发事件
        EventBus.emit('syncManager:started', {
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          timestamp: new Date().toISOString()
        };
      })
      .catch(function(err) {
        console.error('启动同步服务失败:', err);
        
        // 触发事件
        EventBus.emit('syncManager:start:failed', {
          error: err,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          error: err,
          timestamp: new Date().toISOString()
        };
      });
  },
  
  /**
   * 停止同步服务
   * @return {Promise<Object>} 停止结果
   */
  stop: function() {
    var self = this;
    console.log('停止同步服务');
    
    // 停止调度器
    return this.scheduler.stop()
      .then(function() {
        // 触发事件
        EventBus.emit('syncManager:stopped', {
          timestamp: new Date().toISOString()
        });
        
        return {
          success: true,
          timestamp: new Date().toISOString()
        };
      })
      .catch(function(err) {
        console.error('停止同步服务失败:', err);
        
        // 触发事件
        EventBus.emit('syncManager:stop:failed', {
          error: err,
          timestamp: new Date().toISOString()
        });
        
        return {
          success: false,
          error: err,
          timestamp: new Date().toISOString()
        };
      });
  },
  
  /**
   * 执行同步操作
   * @param {Object} options 同步选项
   * @param {String|Array} options.collections 指定要同步的集合
   * @param {String|Array} options.ids 指定要同步的数据ID
   * @param {Boolean} options.force 是否强制同步
   * @return {Promise<Object>} 同步结果
   */
  sync: function(options) {
    return this.syncService.sync(options);
  },
  
  /**
   * 添加同步任务
   * @param {String} collection 集合名称
   * @param {String} id 数据ID
   * @param {Object} data 数据对象
   * @param {Object} options 可选参数
   * @return {Promise<Object>} 任务对象
   */
  addSyncTask: function(collection, id, data, options) {
    options = options || {};
    
    // 创建任务ID
    var taskId = 'task_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    
    // 添加任务到调度器
    return this.scheduler.addTask({
      id: taskId,
      collection: collection,
      itemId: id,
      data: data,
      priority: options.priority || 5
    });
  },
  
  /**
   * 保存本地数据
   * @param {String} collection 集合名称
   * @param {String} id 数据ID
   * @param {Object} data 数据对象
   * @param {Object} options 可选参数
   * @param {Boolean} options.sync 是否同步到云端
   * @return {Promise<Object>} 保存结果
   */
  saveData: function(collection, id, data, options) {
    var self = this;
    options = options || {};
    
    // 保存到本地
    return this.localAdapter.save(collection, id, data)
      .then(function(savedData) {
        // 如果需要同步到云端
        if (options.sync) {
          // 添加同步任务
          return self.addSyncTask(collection, id, savedData, {
            priority: options.priority
          })
          .then(function() {
            return savedData;
          });
        }
        
        return savedData;
      });
  },
  
  /**
   * 获取本地数据
   * @param {String} collection 集合名称
   * @param {String} id 数据ID
   * @return {Promise<Object>} 数据对象
   */
  getData: function(collection, id) {
    return this.localAdapter.get(collection, id);
  },
  
  /**
   * 删除数据
   * @param {String} collection 集合名称
   * @param {String} id 数据ID
   * @param {Object} options 可选参数
   * @param {Boolean} options.sync 是否同步到云端
   * @param {Boolean} options.softDelete 是否软删除
   * @return {Promise<Boolean>} 删除结果
   */
  removeData: function(collection, id, options) {
    var self = this;
    options = options || {};
    
    // 本地删除
    return this.localAdapter.remove(collection, id, {
      softDelete: options.softDelete
    })
    .then(function(result) {
      // 如果需要同步到云端
      if (options.sync) {
        // 添加同步任务
        return self.addSyncTask(collection, id, {
          _meta: {
            deleted: true,
            deletedAt: new Date().toISOString()
          }
        }, {
          priority: options.priority
        })
        .then(function() {
          return result;
        });
      }
      
      return result;
    });
  },
  
  /**
   * 获取同步状态
   * @return {Object} 同步状态信息
   */
  getSyncStatus: function() {
    var serviceStatus = this.syncService.getSyncStatus();
    var schedulerStatus = {
      isRunning: this.scheduler.status.isRunning,
      isPaused: this.scheduler.status.isPaused,
      currentStrategy: this.scheduler.status.currentStrategy,
      taskCount: this.scheduler.status.taskCount,
      runningTasks: this.scheduler.status.runningTasks
    };
    
    return {
      service: serviceStatus,
      scheduler: schedulerStatus,
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * 设置调度策略
   * @param {String} strategyName 策略名称
   * @param {Object} options 策略选项
   * @return {Promise<Boolean>} 设置结果
   */
  setStrategy: function(strategyName, options) {
    return this.scheduler.setStrategy(strategyName, options);
  },
  
  /**
   * 获取监控指标
   * @return {Object} 监控指标
   */
  getMonitorMetrics: function() {
    return this.syncService.getMonitorMetrics();
  },
  
  /**
   * 获取日志
   * @param {Number} limit 最大条数
   * @return {Array} 日志列表
   */
  getLogs: function(limit) {
    return this.syncService.getLogs(limit);
  }
};

module.exports = SyncManager; 