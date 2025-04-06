/**
 * 批量同步工具
 * 提供高效的批量同步API，优化弱网环境下的数据同步
 */

const { hasNetworkConnection, isWeakNetwork, getNetworkAdaptiveConfig } = require('./networkUtils');
const { storage } = require('./storageUtils');
const { resolveConflict, ConflictStrategy } = require('./syncConflictResolver');

// 存储键
const STORAGE_KEYS = {
  BATCH_QUEUE: 'batch_sync_queue',
  LAST_SYNC: 'last_batch_sync',
  SYNC_STATS: 'sync_stats'
};

// 同步操作类型
const SyncOperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  QUERY: 'query'
};

// 批量同步优先级
const SyncPriority = {
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
};

/**
 * 批量同步管理器
 * 提供高效的批量数据同步功能
 */
class BatchSyncManager {
  constructor(apiEndpoint = '/api/sync/batch') {
    this.apiEndpoint = apiEndpoint;
    this.syncQueue = [];
    this.isProcessing = false;
    this.syncInterval = null;
    this.listeners = [];
    this.retryMap = new Map(); // 记录重试次数
    this.maxRetries = 3;
    
    // 初始化
    this.init();
  }
  
  /**
   * 初始化批量同步管理器
   */
  async init() {
    // 加载未完成的同步队列
    await this.loadSyncQueue();
    
    // 设置同步间隔
    this.configureInterval();
  }
  
  /**
   * 配置同步间隔
   */
  configureInterval() {
    // 根据网络状态设置不同的同步间隔
    const config = getNetworkAdaptiveConfig();
    const syncInterval = config.syncInterval;
    
    // 清除现有定时器
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // 设置新的定时器
    this.syncInterval = setInterval(() => {
      if (hasNetworkConnection() && !this.isProcessing && this.syncQueue.length > 0) {
        this.processBatchSync();
      }
    }, syncInterval);
  }
  
  /**
   * 加载待同步队列
   */
  async loadSyncQueue() {
    try {
      const queue = await storage.get(STORAGE_KEYS.BATCH_QUEUE) || [];
      this.syncQueue = queue;
    } catch (error) {
      console.error('加载同步队列失败:', error);
      this.syncQueue = [];
    }
  }
  
  /**
   * 保存同步队列
   */
  async saveSyncQueue() {
    try {
      await storage.set(STORAGE_KEYS.BATCH_QUEUE, this.syncQueue);
    } catch (error) {
      console.error('保存同步队列失败:', error);
    }
  }
  
  /**
   * 添加同步任务
   * @param {string} resourceType 资源类型
   * @param {SyncOperationType} operation 操作类型
   * @param {Object} data 数据
   * @param {SyncPriority} priority 优先级
   * @returns {string} 任务ID
   */
  async addSyncTask(resourceType, operation, data, priority = SyncPriority.NORMAL) {
    // 生成任务ID
    const taskId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // 创建同步任务
    const task = {
      id: taskId,
      resourceType,
      operation,
      data,
      priority,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    };
    
    // 添加到队列
    this.syncQueue.push(task);
    
    // 根据优先级排序
    this.sortQueueByPriority();
    
    // 保存队列
    await this.saveSyncQueue();
    
    // 通知监听器
    this.notifyListeners('taskAdded', task);
    
    // 如果有网络连接且当前不在处理中，尝试立即同步
    if (hasNetworkConnection() && !this.isProcessing) {
      this.processBatchSync();
    }
    
    return taskId;
  }
  
  /**
   * 根据优先级对队列排序
   */
  sortQueueByPriority() {
    const priorityValues = {
      [SyncPriority.HIGH]: 3,
      [SyncPriority.NORMAL]: 2,
      [SyncPriority.LOW]: 1
    };
    
    this.syncQueue.sort((a, b) => {
      const priorityDiff = priorityValues[b.priority] - priorityValues[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 同等优先级，按时间排序
      return a.timestamp - b.timestamp;
    });
  }
  
  /**
   * 处理批量同步
   */
  async processBatchSync() {
    if (this.isProcessing || this.syncQueue.length === 0 || !hasNetworkConnection()) {
      return;
    }
    
    this.isProcessing = true;
    this.notifyListeners('syncStarted');
    
    try {
      // 获取网络配置
      const networkConfig = getNetworkAdaptiveConfig();
      
      // 根据网络状况，确定批次大小
      const batchSize = isWeakNetwork() ? 5 : 20;
      
      // 选择待同步的任务
      const batchTasks = this.selectBatchTasks(batchSize);
      
      if (batchTasks.length === 0) {
        this.isProcessing = false;
        return;
      }
      
      // 执行批量同步
      const results = await this.executeBatchSync(batchTasks);
      
      // 处理同步结果
      await this.handleSyncResults(batchTasks, results);
      
      // 更新同步统计
      await this.updateSyncStats({
        lastSync: Date.now(),
        totalSynced: batchTasks.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
      
      // 如果还有待同步任务，继续处理
      if (this.syncQueue.length > 0 && hasNetworkConnection()) {
        setTimeout(() => {
          this.isProcessing = false;
          this.processBatchSync();
        }, networkConfig.retryDelay);
      } else {
        this.isProcessing = false;
      }
      
      this.notifyListeners('syncCompleted', results);
    } catch (error) {
      console.error('批量同步处理失败:', error);
      this.isProcessing = false;
      this.notifyListeners('syncFailed', error);
    }
  }
  
  /**
   * 选择批量任务
   * @param {number} batchSize 批次大小
   * @returns {Array} 待同步任务
   */
  selectBatchTasks(batchSize) {
    // 从队列中选择指定数量的任务
    return this.syncQueue.slice(0, batchSize);
  }
  
  /**
   * 执行批量同步
   * @param {Array} tasks 同步任务列表
   * @returns {Promise<Array>} 同步结果
   */
  async executeBatchSync(tasks) {
    try {
      // 准备请求数据
      const requestData = {
        batch: tasks.map(task => ({
          id: task.id,
          resourceType: task.resourceType,
          operation: task.operation,
          data: task.data
        })),
        clientId: await this.getClientId(),
        deviceInfo: await this.getDeviceInfo(),
        timestamp: Date.now()
      };
      
      // 发送批量同步请求
      return new Promise((resolve, reject) => {
        wx.request({
          url: this.apiEndpoint,
          method: 'POST',
          data: requestData,
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(res.data.results || []);
            } else {
              reject(new Error(`服务器返回错误: ${res.statusCode}`));
            }
          },
          fail: (err) => reject(err)
        });
      });
    } catch (error) {
      console.error('执行批量同步失败:', error);
      // 返回所有任务失败结果
      return tasks.map(task => ({
        id: task.id,
        success: false,
        error: error.message
      }));
    }
  }
  
  /**
   * 处理同步结果
   * @param {Array} tasks 同步任务
   * @param {Array} results 同步结果
   */
  async handleSyncResults(tasks, results) {
    const successTasks = [];
    const failedTasks = [];
    const conflictTasks = [];
    
    // 处理每个任务的结果
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const result = results.find(r => r.id === task.id) || {
        id: task.id,
        success: false,
        error: '未收到服务器响应'
      };
      
      if (result.success) {
        // 同步成功
        successTasks.push(task);
      } else if (result.conflict) {
        // 数据冲突
        conflictTasks.push({
          task,
          serverData: result.serverData,
          baseData: result.baseData,
          clientData: task.data
        });
      } else {
        // 同步失败
        task.retries = (task.retries || 0) + 1;
        
        if (task.retries >= this.maxRetries) {
          // 超过最大重试次数，标记为失败
          task.status = 'failed';
          task.error = result.error;
          failedTasks.push(task);
        } else {
          // 重新加入队列，等待下次同步
          failedTasks.push(task);
        }
      }
    }
    
    // 从队列中移除成功的任务
    this.syncQueue = this.syncQueue.filter(
      task => !successTasks.some(t => t.id === task.id)
    );
    
    // 处理冲突任务
    await this.handleConflictTasks(conflictTasks);
    
    // 保存更新后的队列
    await this.saveSyncQueue();
    
    // 通知监听器
    this.notifyListeners('resultsProcessed', {
      success: successTasks.length,
      failed: failedTasks.length,
      conflicts: conflictTasks.length
    });
  }
  
  /**
   * 处理冲突任务
   * @param {Array} conflictTasks 冲突任务列表
   */
  async handleConflictTasks(conflictTasks) {
    for (const conflict of conflictTasks) {
      const { task, serverData, clientData, baseData } = conflict;
      
      // 默认使用自动冲突解决策略
      const resolvedData = resolveConflict(
        clientData,
        serverData,
        baseData,
        ConflictStrategy.LAST_WRITE_WINS
      );
      
      if (resolvedData._conflict) {
        // 需要手动解决的冲突
        task.status = 'conflict';
        task.conflict = {
          serverData,
          clientData,
          baseData
        };
      } else {
        // 自动解决的冲突，使用解决后的数据重新添加同步任务
        task.data = resolvedData;
        task.timestamp = Date.now();
        task.status = 'pending';
        task.retries = 0;
      }
    }
  }
  
  /**
   * 手动解决冲突
   * @param {string} taskId 任务ID
   * @param {Object} resolvedData 解决后的数据
   * @returns {boolean} 是否成功
   */
  async resolveConflictManually(taskId, resolvedData) {
    const taskIndex = this.syncQueue.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      return false;
    }
    
    const task = this.syncQueue[taskIndex];
    
    if (task.status !== 'conflict') {
      return false;
    }
    
    // 更新任务数据
    task.data = resolvedData;
    task.status = 'pending';
    task.timestamp = Date.now();
    task.retries = 0;
    delete task.conflict;
    
    // 保存队列
    await this.saveSyncQueue();
    
    // 通知监听器
    this.notifyListeners('conflictResolved', task);
    
    return true;
  }
  
  /**
   * 获取客户端ID
   * @returns {Promise<string>} 客户端ID
   */
  async getClientId() {
    try {
      let clientId = await storage.get('client_id');
      
      if (!clientId) {
        clientId = 'wxmp_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        await storage.set('client_id', clientId);
      }
      
      return clientId;
    } catch (error) {
      return 'unknown_client';
    }
  }
  
  /**
   * 获取设备信息
   * @returns {Promise<Object>} 设备信息
   */
  async getDeviceInfo() {
    return new Promise((resolve) => {
      try {
        wx.getSystemInfo({
          success: (res) => {
            resolve({
              platform: res.platform,
              model: res.model,
              system: res.system,
              SDKVersion: res.SDKVersion,
              version: res.version
            });
          },
          fail: () => {
            resolve({
              platform: 'unknown',
              model: 'unknown'
            });
          }
        });
      } catch (error) {
        resolve({
          platform: 'unknown',
          model: 'unknown',
          error: error.message
        });
      }
    });
  }
  
  /**
   * 更新同步统计信息
   * @param {Object} stats 统计数据
   */
  async updateSyncStats(stats) {
    try {
      const currentStats = await storage.get(STORAGE_KEYS.SYNC_STATS) || {
        totalSynced: 0,
        totalSuccess: 0,
        totalFailed: 0,
        lastSync: null
      };
      
      const newStats = {
        totalSynced: currentStats.totalSynced + (stats.totalSynced || 0),
        totalSuccess: currentStats.totalSuccess + (stats.success || 0),
        totalFailed: currentStats.totalFailed + (stats.failed || 0),
        lastSync: stats.lastSync || currentStats.lastSync
      };
      
      await storage.set(STORAGE_KEYS.SYNC_STATS, newStats);
      await storage.set(STORAGE_KEYS.LAST_SYNC, stats.lastSync);
    } catch (error) {
      console.error('更新同步统计失败:', error);
    }
  }
  
  /**
   * 获取同步统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getSyncStats() {
    try {
      const stats = await storage.get(STORAGE_KEYS.SYNC_STATS) || {
        totalSynced: 0,
        totalSuccess: 0,
        totalFailed: 0,
        lastSync: null
      };
      
      return {
        ...stats,
        pendingTasks: this.syncQueue.length,
        pendingHighPriority: this.syncQueue.filter(t => t.priority === SyncPriority.HIGH).length,
        conflictTasks: this.syncQueue.filter(t => t.status === 'conflict').length
      };
    } catch (error) {
      console.error('获取同步统计失败:', error);
      return {
        error: error.message
      };
    }
  }
  
  /**
   * 强制立即同步
   * @returns {Promise<boolean>} 是否成功
   */
  async forceSyncNow() {
    if (!hasNetworkConnection()) {
      return false;
    }
    
    if (this.isProcessing) {
      return false;
    }
    
    if (this.syncQueue.length === 0) {
      return false;
    }
    
    await this.processBatchSync();
    return true;
  }
  
  /**
   * 添加同步监听器
   * @param {Function} listener 监听器函数
   * @returns {Function} 取消监听的函数
   */
  addListener(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  /**
   * 通知所有监听器
   * @param {string} event 事件名称
   * @param {any} data 事件数据
   */
  notifyListeners(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('同步监听器错误:', error);
      }
    }
  }
  
  /**
   * 清除指定状态的同步任务
   * @param {string} status 任务状态
   * @returns {Promise<number>} 清除的任务数量
   */
  async clearTasksByStatus(status) {
    const countBefore = this.syncQueue.length;
    
    if (status) {
      this.syncQueue = this.syncQueue.filter(task => task.status !== status);
    } else {
      this.syncQueue = [];
    }
    
    await this.saveSyncQueue();
    
    return countBefore - this.syncQueue.length;
  }
  
  /**
   * 销毁管理器实例
   */
  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    this.listeners = [];
    this.isProcessing = false;
  }
}

// 创建批量同步工具实例
const batchSyncUtils = {
  manager: new BatchSyncManager(),
  SyncOperationType,
  SyncPriority,
  
  addSyncTask(resourceType, operation, data, priority) {
    return this.manager.addSyncTask(resourceType, operation, data, priority);
  },
  
  getSyncStats() {
    return this.manager.getSyncStats();
  },
  
  forceSyncNow() {
    return this.manager.forceSyncNow();
  },
  
  addListener(listener) {
    return this.manager.addListener(listener);
  },
  
  clearTasks(status) {
    return this.manager.clearTasksByStatus(status);
  }
};

// 导出batchSyncUtils
module.exports = batchSyncUtils; 