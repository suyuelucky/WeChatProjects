/**
 * 同步服务
 * 负责管理本地数据与云端数据同步，处理同步冲突
 */
var EventBus = require('../utils/eventBus.js');

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
    
    console.log('同步服务初始化完成');
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
        
        // 尝试同步
        if (this.getNetworkState()) {
          this.processSyncQueue();
        }
        
        resolve(syncTask);
      } catch (err) {
        console.error('添加到同步队列失败:', err);
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
    
    console.log(`开始处理同步队列，共${pendingTasks.length}个任务`);
    
    // 更新任务状态
    pendingTasks.forEach(task => {
      task.status = 'syncing';
    });
    this.saveSyncQueue();
    
    // 处理所有任务
    return Promise.all(pendingTasks.map(task => this.processTask(task)))
      .then(results => {
        this.syncStatus.inProgress = false;
        this.syncStatus.lastSync = new Date().toISOString();
        
        // 保存队列状态
        this.saveSyncQueue();
        
        // 触发事件
        EventBus.emit('sync:completed', {
          results: results,
          timestamp: this.syncStatus.lastSync
        });
        
        return results;
      })
      .catch(err => {
        this.syncStatus.inProgress = false;
        console.error('处理同步队列失败:', err);
        
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
    console.log(`处理同步任务: ${task.id} (${task.collection}/${task.itemId})`);
    
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
            console.error(`更新${task.collection}/${task.itemId}同步状态失败:`, err);
          });
        
        resolve({
          task: task,
          success: true
        });
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
    } catch (err) {
      console.error('保存同步队列失败:', err);
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
        console.log(`恢复同步队列，共${queue.length}个任务`);
      } else {
        this.syncStatus.queue = [];
      }
    } catch (err) {
      console.error('恢复同步队列失败:', err);
      this.syncStatus.queue = [];
    }
  },

  /**
   * 获取同步状态
   * @return {object} 同步状态
   */
  getSyncStatus: function() {
    return {
      inProgress: this.syncStatus.inProgress,
      lastSync: this.syncStatus.lastSync,
      queueLength: this.syncStatus.queue.length,
      pendingCount: this.syncStatus.queue.filter(task => task.status === 'pending').length
    };
  },

  /**
   * 处理网络状态变化
   * @param {object} status 网络状态
   * @private
   */
  handleNetworkChange: function(status) {
    if (status.isConnected && !status.wasConnected) {
      // 网络恢复连接，尝试同步
      console.log('网络恢复连接，尝试同步');
      this.processSyncQueue();
    }
  },

  /**
   * 获取网络状态
   * @return {boolean} 是否有网络连接
   * @private
   */
  getNetworkState: function() {
    // 从app实例获取网络状态
    const app = getApp();
    return app && app.globalData && app.globalData.isConnected;
  }
};

module.exports = SyncService; 