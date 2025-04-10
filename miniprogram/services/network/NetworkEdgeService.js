/**
 * NetworkEdgeService.js
 * 
 * 网络边缘计算服务
 * 整合任务分发管理器和边缘计算适配器，提供统一的边缘计算服务接口
 * 
 * 创建时间: 2025-04-08 21:40:27 | 创建者: Claude 3.7 Sonnet
 */

const TaskDispatchManager = require('./edge/TaskDispatchManager');
const EdgeComputeAdapter = require('./edge/EdgeComputeAdapter');

// 任务处理器
const edgeProcessors = {
  computation: {
    sum: (data) => {
      if (Array.isArray(data.items)) {
        return data.items.reduce((sum, item) => sum + item, 0);
      }
      return 0;
    },
    average: (data) => {
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items.reduce((sum, item) => sum + item, 0) / data.items.length;
      }
      return 0;
    },
    sort: (data) => {
      if (Array.isArray(data.items)) {
        return [...data.items].sort((a, b) => a - b);
      }
      return [];
    },
    filter: (data) => {
      if (Array.isArray(data.items) && data.predicate) {
        return data.items.filter(item => {
          try {
            // 使用Function构造器创建一个函数
            const predicateFunc = new Function('item', `return ${data.predicate}`);
            return predicateFunc(item);
          } catch (error) {
            console.error('过滤条件执行错误', error);
            return false;
          }
        });
      }
      return [];
    }
  },
  dataProcessing: {
    transform: (data) => {
      if (Array.isArray(data.items) && data.transformer) {
        return data.items.map(item => {
          try {
            // 使用Function构造器创建一个函数
            const transformFunc = new Function('item', `return ${data.transformer}`);
            return transformFunc(item);
          } catch (error) {
            console.error('转换函数执行错误', error);
            return item;
          }
        });
      }
      return [];
    },
    groupBy: (data) => {
      if (Array.isArray(data.items) && data.key) {
        const result = {};
        data.items.forEach(item => {
          const keyValue = item[data.key];
          if (!result[keyValue]) {
            result[keyValue] = [];
          }
          result[keyValue].push(item);
        });
        return result;
      }
      return {};
    },
    paginate: (data) => {
      if (Array.isArray(data.items) && data.pageSize && data.pageNumber) {
        const pageSize = Number(data.pageSize);
        const pageNumber = Number(data.pageNumber);
        const startIndex = (pageNumber - 1) * pageSize;
        return {
          items: data.items.slice(startIndex, startIndex + pageSize),
          total: data.items.length,
          pageSize,
          pageNumber,
          totalPages: Math.ceil(data.items.length / pageSize)
        };
      }
      return {
        items: [],
        total: 0,
        pageSize: 0,
        pageNumber: 0,
        totalPages: 0
      };
    }
  }
};

/**
 * 网络边缘计算服务类
 */
class NetworkEdgeService {
  /**
   * 构造函数
   * @param {Object} options 配置选项
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.storage = options.storage;
    this.httpClient = options.httpClient;
    
    // 创建任务分发管理器
    this.taskDispatcher = new TaskDispatchManager({
      logger: this.logger,
      ...options.dispatcherConfig
    });
    
    // 创建同步服务
    this.syncService = {
      syncData: this._syncData.bind(this),
      getLastSyncTime: this._getLastSyncTime.bind(this),
      markAsSynced: this._markAsSynced.bind(this)
    };
    
    // 创建边缘计算适配器
    this.edgeAdapter = new EdgeComputeAdapter({
      logger: this.logger,
      storage: this.storage,
      processors: edgeProcessors,
      syncService: this.syncService,
      config: options.adapterConfig || {}
    });
    
    this.logger.info('NetworkEdgeService 初始化完成');
  }
  
  /**
   * 执行计算任务
   * @param {Object} task 任务对象
   * @param {string} task.id 任务ID
   * @param {string} task.type 任务类型
   * @param {string} task.operation 操作名称
   * @param {Object} task.data 任务数据
   * @param {string} [task.complexity='medium'] 任务复杂度
   * @param {number} [task.dataSize] 数据大小(KB)
   * @param {string} [task.priority='medium'] 任务优先级
   * @param {boolean} [task.requireSync=false] 是否需要同步结果
   * @returns {Promise<any>} 任务结果
   */
  async executeTask(task) {
    try {
      if (!task || !task.id || !task.type || !task.operation) {
        throw new Error('无效的任务格式');
      }
      
      // 设置默认值
      task.complexity = task.complexity || 'medium';
      task.priority = task.priority || 'medium';
      task.requireSync = task.requireSync || false;
      
      // 预估数据大小
      if (task.data && !task.dataSize) {
        task.dataSize = this._estimateDataSize(task.data);
      }
      
      // 为任务添加本地处理器
      task.localProcessor = (taskData) => {
        return this.edgeAdapter.executeTask({
          id: task.id,
          type: task.type,
          operation: task.operation,
          data: taskData,
          requireSync: task.requireSync
        });
      };
      
      // 通过任务分发管理器决定是本地还是云端处理
      return await this.taskDispatcher.executeTask(task);
      
    } catch (error) {
      this.logger.error('执行任务失败', { taskId: task.id, error });
      throw error;
    }
  }
  
  /**
   * 预估数据大小(KB)
   * @param {any} data 要估算大小的数据
   * @returns {number} 估算的数据大小(KB)
   * @private
   */
  _estimateDataSize(data) {
    try {
      // 简单实现，将数据转为JSON并计算长度
      const jsonString = JSON.stringify(data);
      // 假设每个字符1字节，计算KB
      return Math.ceil(jsonString.length / 1024);
    } catch (error) {
      this.logger.warn('估算数据大小失败', error);
      return 10; // 默认10KB
    }
  }
  
  /**
   * 获取服务状态信息
   * @returns {Object} 状态信息
   */
  getStatus() {
    return {
      dispatcher: this.taskDispatcher.getStats(),
      deviceInfo: {
        online: this.edgeAdapter.isOnline,
        networkType: this.taskDispatcher.deviceStatus.networkType,
        batteryLevel: this.taskDispatcher.deviceStatus.batteryLevel,
        benchmarkLevel: this.taskDispatcher.deviceStatus.benchmarkLevel,
        platform: this.taskDispatcher.deviceStatus.deviceInfo.platform
      },
      pendingSyncTasks: this.edgeAdapter.pendingSyncTasks.length
    };
  }
  
  /**
   * 强制同步数据
   * @returns {Promise<boolean>} 是否同步成功
   */
  async forceSyncData() {
    try {
      await this.edgeAdapter.syncWithCloud();
      return true;
    } catch (error) {
      this.logger.error('强制同步失败', error);
      return false;
    }
  }
  
  /**
   * 清理服务资源
   */
  destroy() {
    // 清理边缘计算适配器资源
    this.edgeAdapter.destroy();
    
    this.logger.info('NetworkEdgeService 已销毁');
  }
  
  /**
   * 与云端同步数据
   * @param {Object} data 要同步的数据
   * @returns {Promise<Object>} 同步结果
   * @private
   */
  async _syncData(data) {
    try {
      if (!this.httpClient) {
        return { success: false, error: 'HTTP客户端未提供' };
      }
      
      const response = await this.httpClient.post('/api/edge/sync', data);
      
      if (response.statusCode === 200 && response.data) {
        return { success: true, data: response.data };
      } else {
        return { success: false, error: response.data || '同步失败' };
      }
    } catch (error) {
      this.logger.error('同步数据到云端失败', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 获取上次同步时间
   * @returns {number} 上次同步时间戳
   * @private
   */
  _getLastSyncTime() {
    try {
      if (!this.storage) {
        return 0;
      }
      
      const syncInfo = this.storage.get('edgeComputeSyncInfo');
      return syncInfo && syncInfo.lastSyncTime ? syncInfo.lastSyncTime : 0;
    } catch (error) {
      this.logger.error('获取上次同步时间失败', error);
      return 0;
    }
  }
  
  /**
   * 标记任务已同步
   * @param {string} taskId 任务ID
   * @private
   */
  _markAsSynced(taskId) {
    try {
      if (!this.storage) {
        return;
      }
      
      // 获取当前同步信息
      const syncInfo = this.storage.get('edgeComputeSyncInfo') || {
        lastSyncTime: Date.now(),
        syncedTasks: []
      };
      
      // 更新同步时间和已同步任务列表
      syncInfo.lastSyncTime = Date.now();
      
      if (!syncInfo.syncedTasks.includes(taskId)) {
        syncInfo.syncedTasks.push(taskId);
      }
      
      // 限制已同步任务列表长度
      if (syncInfo.syncedTasks.length > 1000) {
        syncInfo.syncedTasks = syncInfo.syncedTasks.slice(-1000);
      }
      
      // 保存更新后的同步信息
      this.storage.set('edgeComputeSyncInfo', syncInfo);
    } catch (error) {
      this.logger.error('标记任务已同步失败', error);
    }
  }
}

module.exports = NetworkEdgeService; 