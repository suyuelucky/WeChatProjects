import localforage from 'localforage';

// 配置localforage
localforage.config({
  name: 'xiuhuazhen',
  storeName: 'xiuhuazhen_store',
  description: '绣花针应用本地存储'
});

// 基础存储操作
export const storage = {
  /**
   * 保存数据到本地
   * @param {string} key - 存储键名
   * @param {any} value - 存储的值
   * @returns {Promise}
   */
  async set(key, value) {
    try {
      return await localforage.setItem(key, value);
    } catch (error) {
      console.error('存储数据失败:', error);
      throw error;
    }
  },

  /**
   * 从本地获取数据
   * @param {string} key - 存储键名
   * @returns {Promise<any>}
   */
  async get(key) {
    try {
      return await localforage.getItem(key);
    } catch (error) {
      console.error('获取数据失败:', error);
      throw error;
    }
  },

  /**
   * 删除本地存储的数据
   * @param {string} key - 存储键名
   * @returns {Promise}
   */
  async remove(key) {
    try {
      return await localforage.removeItem(key);
    } catch (error) {
      console.error('删除数据失败:', error);
      throw error;
    }
  },

  /**
   * 清空所有本地存储
   * @returns {Promise}
   */
  async clear() {
    try {
      return await localforage.clear();
    } catch (error) {
      console.error('清空存储失败:', error);
      throw error;
    }
  }
};

// 离线数据同步队列
export const syncQueue = {
  QUEUE_KEY: 'sync_queue',
  
  /**
   * 添加同步任务到队列
   * @param {Object} task - 包含操作类型、数据和时间戳的任务
   * @returns {Promise}
   */
  async add(task) {
    const queue = await storage.get(this.QUEUE_KEY) || [];
    queue.push({
      ...task,
      timestamp: Date.now(),
      id: Date.now().toString(36) + Math.random().toString(36).substr(2)
    });
    return storage.set(this.QUEUE_KEY, queue);
  },
  
  /**
   * 获取所有待同步任务
   * @returns {Promise<Array>}
   */
  async getAll() {
    return await storage.get(this.QUEUE_KEY) || [];
  },
  
  /**
   * 删除已完成的同步任务
   * @param {string} taskId - 任务ID
   * @returns {Promise}
   */
  async remove(taskId) {
    const queue = await this.getAll();
    const updatedQueue = queue.filter(task => task.id !== taskId);
    return storage.set(this.QUEUE_KEY, updatedQueue);
  },
  
  /**
   * 处理同步队列（网络恢复时调用）
   * @param {Function} processFn - 处理单个任务的函数
   * @returns {Promise<Array>} - 返回处理结果
   */
  async process(processFn) {
    const queue = await this.getAll();
    const results = [];
    
    for (const task of queue) {
      try {
        const result = await processFn(task);
        await this.remove(task.id);
        results.push({ success: true, task, result });
      } catch (error) {
        results.push({ success: false, task, error });
      }
    }
    
    return results;
  }
}; 