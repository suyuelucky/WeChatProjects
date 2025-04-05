/**
 * 小程序本地存储工具
 * 提供本地数据存储和离线同步功能
 */

/**
 * 设置存储数据
 * @param {string} key - 键名
 * @param {any} data - 存储的数据
 * @returns {Promise<boolean>} - 是否成功
 */
export const setStorage = (key, data) => {
  return new Promise((resolve, reject) => {
    try {
      wx.setStorage({
        key,
        data,
        success: () => resolve(true),
        fail: (error) => {
          console.error('存储数据失败:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('存储数据异常:', error);
      reject(error);
    }
  });
};

/**
 * 获取存储数据
 * @param {string} key - 键名
 * @returns {Promise<any>} - 存储的数据
 */
export const getStorage = (key) => {
  return new Promise((resolve, reject) => {
    wx.getStorage({
      key,
      success: (res) => resolve(res.data),
      fail: (error) => {
        console.error('获取数据失败:', error);
        reject(error);
      }
    });
  });
};

/**
 * 删除存储数据
 * @param {string} key - 键名
 * @returns {Promise<boolean>} - 是否成功
 */
export const removeStorage = (key) => {
  return new Promise((resolve, reject) => {
    wx.removeStorage({
      key,
      success: () => resolve(true),
      fail: (error) => {
        console.error('删除数据失败:', error);
        reject(error);
      }
    });
  });
};

/**
 * 清空所有存储数据
 * @returns {Promise<boolean>} - 是否成功
 */
export const clearStorage = () => {
  return new Promise((resolve, reject) => {
    try {
      wx.clearStorage({
        success: () => resolve(true),
        fail: (error) => {
          console.error('清空存储失败:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('清空存储异常:', error);
      reject(error);
    }
  });
};

/**
 * 同步队列相关操作
 */
export const syncQueue = {
  QUEUE_KEY: 'sync_queue',
  
  /**
   * 添加同步任务到队列
   * @param {Object} task - 包含操作类型、数据和时间戳的任务
   * @returns {Promise<boolean>}
   */
  async add(task) {
    try {
      let queue = [];
      try {
        queue = await getStorage(this.QUEUE_KEY) || [];
      } catch (error) {
        queue = [];
      }
      
      queue.push({
        ...task,
        timestamp: Date.now(),
        id: Date.now().toString(36) + Math.random().toString(36).substr(2)
      });
      
      return await setStorage(this.QUEUE_KEY, queue);
    } catch (error) {
      console.error('添加同步任务失败:', error);
      return false;
    }
  },
  
  /**
   * 获取所有待同步任务
   * @returns {Promise<Array>}
   */
  async getAll() {
    try {
      return await getStorage(this.QUEUE_KEY) || [];
    } catch (error) {
      console.error('获取同步队列失败:', error);
      return [];
    }
  },
  
  /**
   * 删除已完成的同步任务
   * @param {string} taskId - 任务ID
   * @returns {Promise<boolean>}
   */
  async remove(taskId) {
    try {
      const queue = await this.getAll();
      const updatedQueue = queue.filter(task => task.id !== taskId);
      return await setStorage(this.QUEUE_KEY, updatedQueue);
    } catch (error) {
      console.error('删除同步任务失败:', error);
      return false;
    }
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
        console.error('处理同步任务失败:', error, task);
        results.push({ success: false, task, error });
      }
    }
    
    return results;
  },
  
  /**
   * 保存离线数据并加入同步队列
   * @param {string} key - 存储键名
   * @param {Object} data - 数据
   * @param {string} action - 操作类型（create, update, delete）
   * @returns {Promise<boolean>}
   */
  async saveForSync(key, data, action = 'update') {
    // 先保存到本地
    await setStorage(`${key}_offline`, {
      data,
      updatedAt: Date.now()
    });
    
    // 添加到同步队列
    return await this.add({
      key,
      data,
      action,
      createdAt: Date.now()
    });
  }
}; 