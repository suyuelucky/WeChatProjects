/**
 * 同步服务
 * 负责管理本地数据与云端数据同步，处理同步冲突
 * 
 * 创建时间: 2025年04月09日 10时40分12秒 CST
 * 创建者: Claude 3.7 Sonnet
 */
var EventBus = require('../utils/eventBus.js');

/**
 * 监控指标收集器
 * @private
 */
var Monitor = {
  metrics: {
    // 同步次数统计
    syncCount: 0,
    // 成功同步次数
    successCount: 0,
    // 失败同步次数
    failCount: 0,
    // 冲突数量
    conflictCount: 0,
    // 平均同步时间(毫秒)
    avgSyncTime: 0,
    // 最近一次同步时间(毫秒)
    lastSyncTime: 0,
    // 同步队列最大长度
    maxQueueLength: 0,
    // 同步开始时间戳记录
    syncStartTimes: {},
    // 成功率
    successRate: 1.0,
    // 网络错误计数
    networkErrors: 0,
    // 服务器错误计数
    serverErrors: 0,
    // 客户端错误计数
    clientErrors: 0
  },
  
  /**
   * 记录同步开始
   * @param {String} id 同步ID
   */
  startSync: function(id) {
    this.metrics.syncStartTimes[id] = Date.now();
    this.metrics.syncCount++;
    
    // 记录队列最大长度
    if (SyncService.syncStatus.queue.length > this.metrics.maxQueueLength) {
      this.metrics.maxQueueLength = SyncService.syncStatus.queue.length;
    }
  },
  
  /**
   * 记录同步完成
   * @param {String} id 同步ID
   * @param {Boolean} success 是否成功
   * @param {String} errorType 错误类型(如果有)
   * @param {Number} conflictCount 冲突数量
   */
  endSync: function(id, success, errorType, conflictCount) {
    var startTime = this.metrics.syncStartTimes[id];
    if (!startTime) return;
    
    // 计算耗时
    var duration = Date.now() - startTime;
    this.metrics.lastSyncTime = duration;
    
    // 更新平均同步时间
    this.metrics.avgSyncTime = ((this.metrics.avgSyncTime * (this.metrics.successCount + this.metrics.failCount)) + duration) / 
                              (this.metrics.successCount + this.metrics.failCount + 1);
    
    // 更新成功/失败计数
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.failCount++;
      
      // 记录错误类型
      if (errorType === 'network') {
        this.metrics.networkErrors++;
      } else if (errorType === 'server') {
        this.metrics.serverErrors++;
      } else {
        this.metrics.clientErrors++;
      }
    }
    
    // 更新成功率
    this.metrics.successRate = this.metrics.syncCount > 0 ? 
                              this.metrics.successCount / this.metrics.syncCount : 1.0;
    
    // 更新冲突数量
    if (conflictCount) {
      this.metrics.conflictCount += conflictCount;
    }
    
    // 清理开始时间记录
    delete this.metrics.syncStartTimes[id];
  },
  
  /**
   * 获取监控指标
   * @return {Object} 监控指标
   */
  getMetrics: function() {
    return Object.assign({}, this.metrics);
  },
  
  /**
   * 重置监控指标
   */
  reset: function() {
    this.metrics = {
      syncCount: 0,
      successCount: 0,
      failCount: 0,
      conflictCount: 0,
      avgSyncTime: 0,
      lastSyncTime: 0,
      maxQueueLength: 0,
      syncStartTimes: {},
      successRate: 1.0,
      networkErrors: 0,
      serverErrors: 0,
      clientErrors: 0
    };
  }
};

/**
 * 日志记录器
 * @private
 */
var Logger = {
  // 最大日志条数
  maxLogs: 100,
  
  // 日志级别
  levels: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  },
  
  // 当前日志级别
  currentLevel: 1, // INFO
  
  // 日志存储
  logs: [],
  
  /**
   * 添加日志
   * @param {String} level 日志级别
   * @param {String} message 日志消息
   * @param {Object} data 附加数据
   */
  log: function(level, message, data) {
    // 检查日志级别
    if (this.levels[level] < this.currentLevel) {
      return;
    }
    
    // 创建日志条目
    var entry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message,
      data: data || null
    };
    
    // 添加到日志
    this.logs.push(entry);
    
    // 限制日志条数
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // 控制台输出
    var consoleMsg = '[SyncService] ' + level + ': ' + message;
    
    if (level === 'ERROR') {
      console.error(consoleMsg, data || '');
    } else if (level === 'WARN') {
      console.warn(consoleMsg, data || '');
    } else {
      console.log(consoleMsg, data || '');
    }
    
    // 触发日志事件
    EventBus.emit('sync:log', entry);
  },
  
  /**
   * DEBUG级别日志
   * @param {String} message 日志消息
   * @param {Object} data 附加数据
   */
  debug: function(message, data) {
    this.log('DEBUG', message, data);
  },
  
  /**
   * INFO级别日志
   * @param {String} message 日志消息
   * @param {Object} data 附加数据
   */
  info: function(message, data) {
    this.log('INFO', message, data);
  },
  
  /**
   * WARN级别日志
   * @param {String} message 日志消息
   * @param {Object} data 附加数据
   */
  warn: function(message, data) {
    this.log('WARN', message, data);
  },
  
  /**
   * ERROR级别日志
   * @param {String} message 日志消息
   * @param {Object} data 附加数据
   */
  error: function(message, data) {
    this.log('ERROR', message, data);
  },
  
  /**
   * 获取所有日志
   * @return {Array} 日志列表
   */
  getLogs: function() {
    return this.logs.slice();
  },
  
  /**
   * 清空日志
   */
  clear: function() {
    this.logs = [];
  },
  
  /**
   * 设置日志级别
   * @param {String} level 日志级别
   */
  setLevel: function(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    }
  }
};

var SyncService = {
  /**
   * 初始化服务
   * @return {object} 当前实例
   */
  init: function(container) {
    this.container = container;
    
    // 初始化状态
    this.syncStatus = {
      inProgress: false,
      lastSync: null,
      queue: []
    };
    
    // 从本地存储恢复同步队列
    this.restoreSyncQueue();
    
    // 监听网络状态变化
    EventBus.on('network:status:changed', this.handleNetworkChange.bind(this));
    
    Logger.info('同步服务初始化完成');
    return this;
  },

  /**
   * 添加数据到同步队列
   * @param {string} collection 集合名称
   * @param {string} id 数据ID
   * @param {object} data 数据对象
   * @return {Promise<object>} 同步状态
   */
  addToSyncQueue: function(collection, id, data) {
    return new Promise((resolve, reject) => {
      try {
        // 创建同步任务
        const syncTask = {
          id: 'sync_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
          collection: collection,
          itemId: id,
          data: data,
          status: 'pending', // pending, syncing, done, failed
          createdAt: new Date().toISOString(),
          retries: 0
        };
        
        // 添加到队列
        this.syncStatus.queue.push(syncTask);
        
        // 保存队列到本地
        this.saveSyncQueue();
        
        // 触发事件
        EventBus.emit('sync:queue:updated', {
          queue: this.syncStatus.queue,
          task: syncTask
        });
        
        Logger.debug('添加到同步队列', { collection: collection, id: id });
        
        // 尝试同步
        if (this.getNetworkState()) {
          this.processSyncQueue();
        }
        
        resolve(syncTask);
      } catch (err) {
        Logger.error('添加到同步队列失败', { error: err.message, collection: collection, id: id });
        reject(err);
      }
    });
  },

  /**
   * 处理同步队列
   * @return {Promise<Array>} 处理结果
   */
  processSyncQueue: function() {
    // 如果当前没有网络连接或同步正在进行中，则不处理
    if (!this.getNetworkState() || this.syncStatus.inProgress) {
      return Promise.resolve([]);
    }
    
    this.syncStatus.inProgress = true;
    
    // 过滤出所有pending状态的任务
    const pendingTasks = this.syncStatus.queue.filter(task => task.status === 'pending');
    
    if (pendingTasks.length === 0) {
      this.syncStatus.inProgress = false;
      return Promise.resolve([]);
    }
    
    Logger.info(`开始处理同步队列，共${pendingTasks.length}个任务`);
    
    // 监控同步批次开始
    const batchId = 'batch_' + Date.now();
    Monitor.startSync(batchId);
    
    // 更新任务状态
    pendingTasks.forEach(task => {
      task.status = 'syncing';
      // 记录单个任务开始
      Monitor.startSync(task.id);
    });
    this.saveSyncQueue();
    
    // 处理所有任务
    return Promise.all(pendingTasks.map(task => this.processTask(task)))
      .then(results => {
        this.syncStatus.inProgress = false;
        this.syncStatus.lastSync = new Date().toISOString();
        
        // 保存队列状态
        this.saveSyncQueue();
        
        // 计算冲突数量
        const conflictCount = results.reduce((count, result) => {
          return count + (result.conflicts || 0);
        }, 0);
        
        // 记录批次同步完成
        Monitor.endSync(batchId, true, null, conflictCount);
        
        // 触发事件
        EventBus.emit('sync:completed', {
          results: results,
          timestamp: this.syncStatus.lastSync
        });
        
        Logger.info('同步队列处理完成', { taskCount: pendingTasks.length, timestamp: this.syncStatus.lastSync });
        
        return results;
      })
      .catch(err => {
        this.syncStatus.inProgress = false;
        
        // 记录批次同步失败
        Monitor.endSync(batchId, false, this._classifyError(err));
        
        Logger.error('处理同步队列失败', { error: err.message });
        
        // 触发事件
        EventBus.emit('sync:failed', {
          error: err,
          timestamp: new Date().toISOString()
        });
        
        return Promise.reject(err);
      });
  },

  /**
   * 处理单个同步任务
   * @param {object} task 同步任务
   * @return {Promise<object>} 处理结果
   * @private
   */
  processTask: function(task) {
    Logger.debug(`处理同步任务: ${task.id} (${task.collection}/${task.itemId})`);
    
    // TODO: 调用云函数进行同步
    // 此处为模拟实现，实际应使用小程序云函数
    return new Promise((resolve) => {
      // 模拟网络延迟
      setTimeout(() => {
        // 标记任务为完成
        const taskIndex = this.syncStatus.queue.findIndex(t => t.id === task.id);
        if (taskIndex >= 0) {
          this.syncStatus.queue[taskIndex].status = 'done';
        }
        
        // 更新数据状态为已同步
        const storageService = this.container.get('storageService');
        storageService.getItem(task.collection, task.itemId)
          .then(item => {
            if (item) {
              item.syncStatus = 'synced';
              return storageService.saveItem(task.collection, task.itemId, item);
            }
          })
          .catch(err => {
            Logger.error(`更新${task.collection}/${task.itemId}同步状态失败`, { error: err.message });
          });
        
        // 记录任务同步成功
        Monitor.endSync(task.id, true);
        
        // 返回处理结果
        const result = {
          task: task,
          success: true
        };
        
        Logger.debug(`同步任务完成: ${task.id}`, result);
        
        resolve(result);
      }, 1000);
    });
  },

  /**
   * 保存同步队列到本地存储
   * @private
   */
  saveSyncQueue: function() {
    try {
      // 保留最近100个已完成任务，其余清理
      const queue = [...this.syncStatus.queue];
      const doneTask = queue.filter(task => task.status === 'done');
      
      if (doneTask.length > 100) {
        const keepingTasks = doneTask.sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }).slice(0, 100);
        
        const keepingIds = keepingTasks.map(task => task.id);
        
        this.syncStatus.queue = queue.filter(task => 
          task.status !== 'done' || keepingIds.includes(task.id)
        );
      }
      
      // 保存到本地
      wx.setStorageSync('syncQueue', this.syncStatus.queue);
      
      Logger.debug('同步队列已保存到本地', { queueLength: this.syncStatus.queue.length });
    } catch (err) {
      Logger.error('保存同步队列失败', { error: err.message });
    }
  },

  /**
   * 从本地存储恢复同步队列
   * @private
   */
  restoreSyncQueue: function() {
    try {
      const queue = wx.getStorageSync('syncQueue');
      if (queue) {
        this.syncStatus.queue = queue;
        Logger.info('从本地存储恢复同步队列', { queueLength: queue.length });
      }
    } catch (err) {
      Logger.error('恢复同步队列失败', { error: err.message });
      this.syncStatus.queue = [];
    }
  },

  /**
   * 获取同步状态
   * @return {Object} 同步状态
   */
  getSyncStatus: function() {
    return {
      inProgress: this.syncStatus.inProgress,
      lastSync: this.syncStatus.lastSync,
      queueLength: this.syncStatus.queue.length
    };
  },

  /**
   * 处理网络状态变化
   * @param {object} status 网络状态
   * @private
   */
  handleNetworkChange: function(status) {
    Logger.debug('网络状态变化', status);
    
    // 如果网络恢复连接，尝试处理队列
    if (status.isConnected && !this.syncStatus.inProgress) {
      Logger.info('网络已连接，尝试处理同步队列');
      this.processSyncQueue();
    }
  },

  /**
   * 获取网络状态
   * @return {boolean} 是否有网络连接
   * @private
   */
  getNetworkState: function() {
    // 实际应该使用wx.getNetworkType获取
    // 此处为演示实现
    return true;
  },

  /**
   * 分类错误类型
   * @param {Error} err 错误对象
   * @return {String} 错误类型: 'network', 'server' 或 'client'
   * @private
   */
  _classifyError: function(err) {
    if (!err) return 'client';
    
    const message = err.message || '';
    
    // 网络错误通常包含这些关键词
    if (/timeout|network|offline|disconnected|socket|connection|unreachable/i.test(message)) {
      return 'network';
    }
    
    // 服务器错误通常是5xx状态码
    if (/5\d\d|server error|internal error/i.test(message)) {
      return 'server';
    }
    
    // 默认为客户端错误
    return 'client';
  },

  /**
   * 获取监控指标
   * @return {Object} 监控指标
   */
  getMonitorMetrics: function() {
    return Monitor.getMetrics();
  },
  
  /**
   * 获取日志
   * @param {Number} limit 最大条数
   * @return {Array} 日志列表
   */
  getLogs: function(limit) {
    const logs = Logger.getLogs();
    return limit ? logs.slice(-limit) : logs;
  },
  
  /**
   * 设置日志级别
   * @param {String} level 日志级别 ('DEBUG', 'INFO', 'WARN', 'ERROR')
   */
  setLogLevel: function(level) {
    Logger.setLevel(level);
    Logger.info('日志级别已设置为', { level: level });
  },
  
  /**
   * 重置监控指标
   */
  resetMonitor: function() {
    Monitor.reset();
    Logger.info('监控指标已重置');
  },
  
  /**
   * 清空日志
   */
  clearLogs: function() {
    Logger.clear();
    Logger.info('日志已清空');
  },
  
  /**
   * 执行同步操作
   * @param {Object} options 同步选项
   * @param {Array} options.collections 要同步的集合名称数组
   * @param {Array} options.ids 要同步的数据ID数组
   * @param {Boolean} options.force 是否强制同步
   * @return {Promise<Object>} 同步结果
   */
  sync: function(options) {
    options = options || {};
    
    // 记录同步开始
    const syncId = 'sync_' + Date.now();
    Monitor.startSync(syncId);
    
    Logger.info('开始同步操作', options);
    
    // 如果没有网络，直接返回错误
    if (!this.getNetworkState()) {
      const error = new Error('无网络连接');
      Logger.warn('同步失败：无网络连接', options);
      Monitor.endSync(syncId, false, 'network');
      return Promise.reject(error);
    }
    
    // 构建同步任务Promise
    let syncPromise;
    
    // 如果指定了集合和ID，同步指定数据
    if (options.collections && options.collections.length && options.ids && options.ids.length) {
      // 创建针对性的同步任务
      const tasks = [];
      
      for (let i = 0; i < options.collections.length; i++) {
        const collection = options.collections[i];
        const id = options.ids[i] || options.ids[0]; // 如果ID不够，使用第一个ID
        
        tasks.push({
          id: 'sync_' + Date.now() + '_' + i,
          collection: collection,
          itemId: id,
          data: options.data || null,
          priority: 10, // 最高优先级
          status: 'pending'
        });
      }
      
      // 添加任务并立即处理
      syncPromise = Promise.all(tasks.map(task => this.addToSyncQueue(task.collection, task.itemId, task.data)))
        .then(() => {
          return this.processSyncQueue();
        });
    } 
    // 否则处理所有待同步数据
    else {
      syncPromise = this.processSyncQueue();
    }
    
    // 处理结果
    return syncPromise
      .then(results => {
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        const result = {
          success: failCount === 0,
          total: results.length,
          successful: successCount,
          failed: failCount,
          timestamp: new Date().toISOString(),
          details: results
        };
        
        Logger.info('同步操作完成', result);
        
        // 记录同步完成
        Monitor.endSync(syncId, result.success);
        
        return result;
      })
      .catch(err => {
        Logger.error('同步操作失败', { error: err.message });
        
        // 记录同步失败
        Monitor.endSync(syncId, false, this._classifyError(err));
        
        throw err;
      });
  }
};

module.exports = SyncService; 