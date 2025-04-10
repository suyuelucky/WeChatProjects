/**
 * EdgeComputeAdapter 边缘计算适配器
 * 
 * 管理边缘计算任务的执行、结果缓存、资源控制和云端同步
 * 优先在本地执行计算任务，减少网络请求，提高响应速度
 * 支持离线操作，网络恢复后自动同步
 * 
 * 创建时间: 2025-04-08 21:20:45 | 创建者: Claude 3.7 Sonnet
 */

/**
 * 边缘计算适配器类
 */
class EdgeComputeAdapter {
  /**
   * 构造函数
   * @param {Object} options 配置选项
   * @param {Object} options.logger 日志服务
   * @param {Object} options.storage 存储服务
   * @param {Object} options.processors 任务处理器集合
   * @param {Object} options.syncService 云端同步服务
   * @param {Object} options.config 配置参数
   */
  constructor(options = {}) {
    // 保存依赖服务
    this.logger = options.logger || console;
    this.storage = options.storage || {
      get: (key) => wx.getStorageSync(key),
      set: (key, value) => wx.setStorageSync(key, value),
      remove: (key) => wx.removeStorageSync(key),
      clear: () => wx.clearStorageSync()
    };
    this.processors = options.processors || {};
    this.syncService = options.syncService;
    
    // 设置默认配置
    this.config = Object.assign({
      maxConcurrentTasks: 5,
      maxCacheSize: 100,
      cacheExpiry: 3600, // 默认缓存过期时间（秒）
      syncInterval: 60, // 默认同步间隔（分钟）
      resourceLimits: {
        memory: 50, // 最大内存占用（MB）
        cpuUsage: 70 // 最大CPU占用率（百分比）
      }
    }, options.config || {});
    
    // 初始化内部状态
    this.taskQueue = [];
    this.runningTasks = 0;
    this.pendingSyncTasks = [];
    this.isOnline = true;
    this.deviceInfo = null;
    
    // 初始化缓存
    this.initCache();
    
    // 初始化设备信息
    this.initDeviceInfo();
    
    // 注册网络状态监听
    this.registerNetworkListener();
    
    // 启动定期同步
    this.startPeriodicSync();
    
    this.logger.info('EdgeComputeAdapter 初始化完成');
  }
  
  /**
   * 初始化缓存
   * 从存储中恢复之前的缓存状态
   */
  initCache() {
    try {
      // 尝试从存储中恢复缓存
      const savedCache = this.storage.get('edgeComputeCache');
      
      if (savedCache && typeof savedCache === 'object') {
        this.cache = savedCache;
        this.logger.debug('从存储恢复缓存数据', this.cache);
      } else {
        // 初始化空缓存
        this.cache = {
          tasks: [], // 最近执行的任务
          results: {} // 任务结果缓存，键为任务ID
        };
      }
      
      // 启动定期缓存清理
      this.scheduleCacheCleanup();
      
    } catch (error) {
      this.logger.error('初始化缓存失败', error);
      // 初始化空缓存
      this.cache = {
        tasks: [],
        results: {}
      };
    }
  }
  
  /**
   * 初始化设备信息
   * 获取当前设备的性能参数，用于资源控制
   */
  initDeviceInfo() {
    try {
      wx.getSystemInfo({
        success: (res) => {
          this.deviceInfo = {
            brand: res.brand,
            model: res.model,
            system: res.system,
            platform: res.platform,
            benchmarkLevel: res.benchmarkLevel,
            battery: res.battery,
            sdkVersion: res.SDKVersion
          };
          
          this.logger.debug('设备信息', this.deviceInfo);
          
          // 根据设备性能调整配置
          this.adjustConfigByDevice();
        },
        fail: (error) => {
          this.logger.error('获取设备信息失败', error);
        }
      });
    } catch (error) {
      this.logger.error('初始化设备信息失败', error);
    }
  }
  
  /**
   * 根据设备性能调整配置
   * 低端设备降低并发任务数和缓存大小
   */
  adjustConfigByDevice() {
    if (!this.deviceInfo || !this.deviceInfo.benchmarkLevel) {
      return;
    }
    
    // benchmarkLevel 越高表示性能越好
    const benchmark = this.deviceInfo.benchmarkLevel;
    
    if (benchmark < 20) {
      // 低端设备
      this.config.maxConcurrentTasks = 2;
      this.config.maxCacheSize = 50;
      this.logger.info('检测到低端设备，已降低资源使用限制');
    } else if (benchmark > 70) {
      // 高端设备
      this.config.maxConcurrentTasks = 8;
      this.config.maxCacheSize = 200;
      this.logger.info('检测到高端设备，已提高计算能力');
    }
  }
  
  /**
   * 注册网络状态监听器
   */
  registerNetworkListener() {
    try {
      // 获取当前网络状态
      this.updateNetworkStatus();
      
      // 监听网络状态变化
      wx.onNetworkStatusChange((res) => {
        const previousStatus = this.isOnline;
        this.isOnline = res.isConnected;
        
        this.logger.info('网络状态变化', { isOnline: this.isOnline, networkType: res.networkType });
        
        // 从离线切换到在线状态，尝试同步待同步任务
        if (!previousStatus && this.isOnline) {
          this.logger.info('网络已恢复，开始同步数据');
          this.syncWithCloud().catch(error => {
            this.logger.error('网络恢复后同步失败', error);
          });
        }
      });
    } catch (error) {
      this.logger.error('注册网络监听失败', error);
    }
  }
  
  /**
   * 更新当前网络状态
   */
  updateNetworkStatus() {
    try {
      wx.getNetworkType({
        success: (res) => {
          this.isOnline = res.networkType !== 'none';
          this.logger.debug('当前网络状态', { isOnline: this.isOnline, networkType: res.networkType });
        },
        fail: (error) => {
          this.logger.error('获取网络状态失败', error);
          // 默认假设在线
          this.isOnline = true;
        }
      });
    } catch (error) {
      this.logger.error('更新网络状态失败', error);
      this.isOnline = true;
    }
  }
  
  /**
   * 启动定期同步
   */
  startPeriodicSync() {
    if (!this.syncService) {
      this.logger.warn('未提供同步服务，定期同步未启动');
      return;
    }
    
    // 立即执行一次同步
    this.syncWithCloud().catch(error => {
      this.logger.error('初始同步失败', error);
    });
    
    // 设置定期同步定时器
    const intervalMinutes = this.config.syncInterval || 60;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    this.syncIntervalId = setInterval(() => {
      this.logger.debug('执行定期同步');
      this.syncWithCloud().catch(error => {
        this.logger.error('定期同步失败', error);
      });
    }, intervalMs);
    
    this.logger.info(`定期同步已启动，间隔: ${intervalMinutes} 分钟`);
  }
  
  /**
   * 执行任务
   * @param {Object} task 任务对象
   * @param {string} task.id 任务ID
   * @param {string} task.type 任务类型
   * @param {string} task.operation 操作名称
   * @param {Object} task.data 任务数据
   * @param {boolean} task.requireSync 是否需要与云端同步结果
   * @returns {Promise<any>} 任务执行结果
   */
  async executeTask(task) {
    try {
      // 验证任务格式
      if (!task || !task.id || !task.type || !task.operation) {
        throw new Error('无效的任务格式');
      }
      
      this.logger.debug('执行任务', { taskId: task.id, type: task.type });
      
      // 检查缓存中是否有结果
      const cachedResult = this.getCachedResult(task.id);
      if (cachedResult !== null) {
        this.logger.debug('使用缓存结果', { taskId: task.id });
        return cachedResult;
      }
      
      // 检查系统资源情况
      const resourceStatus = this.checkResourceAvailability();
      
      // 如果资源不足，将任务加入队列
      if (!resourceStatus.available) {
        this.logger.info('系统资源不足，任务加入队列', { taskId: task.id });
        return this.queueTask(task);
      }
      
      // 如果当前运行的任务数已达上限，将任务加入队列
      if (this.runningTasks >= resourceStatus.maxConcurrent) {
        this.logger.info('并发任务数已达上限，任务加入队列', { taskId: task.id });
        return this.queueTask(task);
      }
      
      // 执行任务
      this.runningTasks++;
      const result = await this.processTask(task);
      this.runningTasks--;
      
      // 处理队列中的下一个任务
      this.processQueue();
      
      return result;
      
    } catch (error) {
      this.logger.error('执行任务失败', { taskId: task.id, error });
      throw error;
    }
  }
  
  /**
   * 处理任务
   * @param {Object} task 任务对象
   * @returns {Promise<any>} 任务执行结果
   * @private
   */
  async processTask(task) {
    try {
      // 根据任务类型和操作名选择对应的处理器
      const processor = this.getProcessor(task.type, task.operation);
      
      if (!processor) {
        throw new Error(`不支持的任务类型: ${task.type}.${task.operation}`);
      }
      
      // 记录开始时间
      this.logger.time(`task-${task.id}`);
      
      // 执行处理
      const result = await processor(task.data);
      
      // 记录结束时间
      this.logger.timeEnd(`task-${task.id}`);
      
      // 缓存结果
      this.cacheResult(task.id, result);
      
      // 记录任务执行历史
      this.recordTaskExecution(task);
      
      // 如果需要同步且当前离线，则添加到待同步列表
      if (task.requireSync && !this.isOnline) {
        this.addToPendingSync(task.id);
      }
      
      return result;
      
    } catch (error) {
      this.logger.error('处理任务失败', { taskId: task.id, error });
      throw error;
    }
  }
  
  /**
   * 获取任务处理器
   * @param {string} type 任务类型
   * @param {string} operation 操作名称
   * @returns {Function|null} 处理器函数
   * @private
   */
  getProcessor(type, operation) {
    try {
      if (this.processors[type] && typeof this.processors[type][operation] === 'function') {
        return this.processors[type][operation];
      }
      this.logger.warn('找不到处理器', { type, operation });
      return null;
    } catch (error) {
      this.logger.error('获取处理器失败', { type, operation, error });
      return null;
    }
  }
  
  /**
   * 将任务加入队列
   * @param {Object} task 任务对象
   * @returns {Promise<any>} 任务执行结果
   * @private
   */
  queueTask(task) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({
        task,
        resolve,
        reject,
        timestamp: Date.now()
      });
    });
  }
  
  /**
   * 处理队列中的任务
   */
  processQueue() {
    if (this.taskQueue.length === 0) {
      return;
    }
    
    // 检查系统资源
    const resourceStatus = this.checkResourceAvailability();
    
    // 如果资源不足，延迟处理
    if (!resourceStatus.available) {
      this.logger.debug('资源不足，延迟处理队列');
      setTimeout(() => this.processQueue(), 1000);
      return;
    }
    
    // 计算可以执行的任务数
    const availableSlots = Math.max(0, resourceStatus.maxConcurrent - this.runningTasks);
    
    if (availableSlots <= 0) {
      return;
    }
    
    // 按照先进先出原则处理队列
    for (let i = 0; i < Math.min(availableSlots, this.taskQueue.length); i++) {
      const queueItem = this.taskQueue.shift();
      const { task, resolve, reject } = queueItem;
      
      // 执行任务
      this.runningTasks++;
      this.processTask(task).then(result => {
        this.runningTasks--;
        resolve(result);
        
        // 继续处理队列
        this.processQueue();
      }).catch(error => {
        this.runningTasks--;
        reject(error);
        
        // 继续处理队列
        this.processQueue();
      });
    }
  }
  
  /**
   * 检查系统资源可用性
   * @returns {Object} 资源状态对象
   * @private
   */
  checkResourceAvailability() {
    try {
      // 在实际实现中，这里应该检查设备的内存和CPU使用情况
      // 此处简化为固定值
      
      // 假设根据设备等级和当前性能计算出的最大并发数
      const maxConcurrent = this.config.maxConcurrentTasks;
      
      // 返回资源状态
      return {
        available: true,
        maxConcurrent: maxConcurrent
      };
      
    } catch (error) {
      this.logger.error('检查资源可用性失败', error);
      
      // 出错时返回保守的资源状态
      return {
        available: true,
        maxConcurrent: 1
      };
    }
  }
  
  /**
   * 获取缓存结果
   * @param {string} taskId 任务ID
   * @returns {any|null} 缓存的结果，如果没有则返回null
   * @private
   */
  getCachedResult(taskId) {
    try {
      const cached = this.cache.results[taskId];
      
      if (!cached) {
        return null;
      }
      
      // 检查缓存是否过期
      const now = Date.now();
      const expiryMs = this.config.cacheExpiry * 1000;
      
      if (now - cached.timestamp > expiryMs) {
        // 缓存已过期
        delete this.cache.results[taskId];
        return null;
      }
      
      return cached.result;
      
    } catch (error) {
      this.logger.error('获取缓存结果失败', { taskId, error });
      return null;
    }
  }
  
  /**
   * 缓存任务结果
   * @param {string} taskId 任务ID
   * @param {any} result 任务结果
   * @private
   */
  cacheResult(taskId, result) {
    try {
      // 添加到缓存
      this.cache.results[taskId] = {
        result,
        timestamp: Date.now()
      };
      
      // 更新存储
      this.persistCache();
      
      // 清理过期缓存
      this.cleanupCache();
      
    } catch (error) {
      this.logger.error('缓存结果失败', { taskId, error });
    }
  }
  
  /**
   * 记录任务执行历史
   * @param {Object} task 任务对象
   * @private
   */
  recordTaskExecution(task) {
    try {
      // 添加到任务历史
      this.cache.tasks.unshift({
        id: task.id,
        type: task.type,
        operation: task.operation,
        timestamp: Date.now()
      });
      
      // 限制历史记录数量
      if (this.cache.tasks.length > this.config.maxCacheSize) {
        this.cache.tasks = this.cache.tasks.slice(0, this.config.maxCacheSize);
      }
      
    } catch (error) {
      this.logger.error('记录任务执行失败', { taskId: task.id, error });
    }
  }
  
  /**
   * 将缓存持久化到存储
   * @private
   */
  persistCache() {
    try {
      this.storage.set('edgeComputeCache', this.cache);
    } catch (error) {
      this.logger.error('持久化缓存失败', error);
    }
  }
  
  /**
   * 清理过期缓存
   */
  cleanupCache() {
    try {
      const now = Date.now();
      const expiryMs = this.config.cacheExpiry * 1000;
      let changed = false;
      
      // 清理过期的结果
      Object.keys(this.cache.results).forEach(taskId => {
        const cached = this.cache.results[taskId];
        if (now - cached.timestamp > expiryMs) {
          delete this.cache.results[taskId];
          changed = true;
        }
      });
      
      // 如果缓存结果数量超过限制，删除最旧的结果
      const resultIds = Object.keys(this.cache.results);
      if (resultIds.length > this.config.maxCacheSize) {
        // 按时间戳排序
        const sortedIds = resultIds.sort((a, b) => {
          return this.cache.results[a].timestamp - this.cache.results[b].timestamp;
        });
        
        // 删除最旧的
        const idsToRemove = sortedIds.slice(0, sortedIds.length - this.config.maxCacheSize);
        idsToRemove.forEach(id => {
          delete this.cache.results[id];
          changed = true;
        });
      }
      
      // 如果有变更，更新存储
      if (changed) {
        this.persistCache();
      }
      
    } catch (error) {
      this.logger.error('清理缓存失败', error);
    }
  }
  
  /**
   * 安排定期缓存清理
   * @private
   */
  scheduleCacheCleanup() {
    // 每小时清理一次缓存
    setInterval(() => {
      this.logger.debug('执行定期缓存清理');
      this.cleanupCache();
    }, 3600 * 1000);
  }
  
  /**
   * 添加任务到待同步列表
   * @param {string} taskId 任务ID
   * @private
   */
  addToPendingSync(taskId) {
    if (!this.pendingSyncTasks.includes(taskId)) {
      this.pendingSyncTasks.push(taskId);
    }
  }
  
  /**
   * 与云端同步数据
   * @returns {Promise<void>}
   */
  async syncWithCloud() {
    if (!this.syncService) {
      this.logger.warn('未提供同步服务，无法同步');
      return;
    }
    
    if (!this.isOnline) {
      this.logger.info('当前处于离线状态，跳过同步');
      return;
    }
    
    if (this.pendingSyncTasks.length === 0) {
      this.logger.debug('没有待同步任务');
      return;
    }
    
    try {
      this.logger.info('开始与云端同步', { pendingCount: this.pendingSyncTasks.length });
      
      // 收集需要同步的结果
      const syncData = {};
      this.pendingSyncTasks.forEach(taskId => {
        if (this.cache.results[taskId]) {
          syncData[taskId] = this.cache.results[taskId];
        }
      });
      
      // 如果没有有效的同步数据，直接返回
      if (Object.keys(syncData).length === 0) {
        this.logger.info('没有有效的同步数据');
        this.pendingSyncTasks = [];
        return;
      }
      
      // 调用同步服务
      const result = await this.syncService.syncData(syncData);
      
      if (result.success) {
        // 同步成功，清空待同步列表
        this.logger.info('同步成功', { count: Object.keys(syncData).length });
        this.pendingSyncTasks = [];
        
        // 标记已同步
        Object.keys(syncData).forEach(taskId => {
          this.syncService.markAsSynced(taskId);
        });
      } else {
        this.logger.warn('同步返回失败状态', result);
      }
      
    } catch (error) {
      this.logger.error('同步数据失败', error);
      // 同步失败时不清空待同步列表，下次会重试
    }
  }
  
  /**
   * 销毁适配器
   * 清理资源，停止后台任务
   */
  destroy() {
    // 清理定时同步
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    
    // 强制持久化当前缓存
    this.persistCache();
    
    this.logger.info('EdgeComputeAdapter 已销毁');
  }
}

module.exports = EdgeComputeAdapter; 