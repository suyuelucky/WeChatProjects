/**
 * 任务管理器类
 * 负责管理任务的创建、存储、查询和更新
 */
export class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.initialized = false;
  }

  /**
   * 初始化任务管理器
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      const storedTasks = await wx.getStorage({ key: 'tasks' });
      if (!storedTasks || !storedTasks.data) {
        this.tasks = new Map();
      } else {
        try {
          this.tasks = new Map(JSON.parse(storedTasks.data));
        } catch (parseError) {
          console.error('解析存储数据失败:', parseError);
          this.tasks = new Map();
        }
      }
      this.initialized = true;
    } catch (error) {
      if (error.errMsg === 'getStorage:fail data not found') {
        this.tasks = new Map();
        this.initialized = true;
        return;
      }
      throw error;
    }
  }

  /**
   * 保存任务列表到存储
   * @private
   * @returns {Promise<void>}
   */
  async _saveToStorage() {
    try {
      const data = JSON.stringify(Array.from(this.tasks.entries()));
      await wx.setStorage({
        key: 'tasks',
        data
      });
    } catch (error) {
      console.error('存储写入失败:', error);
      throw new Error('存储写入失败');
    }
  }

  /**
   * 验证任务数据
   * @private
   * @param {Object} taskData 任务数据
   * @throws {Error} 如果数据无效
   */
  _validateTaskData(taskData) {
    if (!taskData || typeof taskData !== 'object') {
      throw new Error('任务数据无效');
    }

    if (!taskData.title || typeof taskData.title !== 'string' || !taskData.title.trim()) {
      throw new Error('任务标题不能为空');
    }

    if (taskData.description && typeof taskData.description !== 'string') {
      throw new Error('任务描述必须是字符串');
    }

    if (taskData.dueDate && !(taskData.dueDate instanceof Date) && !Date.parse(taskData.dueDate)) {
      throw new Error('无效的截止日期');
    }
  }

  /**
   * 创建新任务
   * @param {Object} task 任务对象
   * @param {string} task.title 任务标题
   * @param {string} task.description 任务描述
   * @param {Date} task.dueDate 截止日期
   * @returns {Promise<Object>} 创建的任务对象
   */
  async createTask(taskData) {
    if (!this.initialized) {
      throw new Error('TaskManager未初始化');
    }

    this._validateTaskData(taskData);

    // 检查存储空间
    const storageInfo = wx.getStorageInfoSync();
    if (storageInfo.currentSize >= storageInfo.limitSize * 0.95) {
      throw new Error('存储空间不足');
    }

    const id = Date.now().toString();
    const task = {
      id,
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(id, task);
    await this._saveToStorage();
    return task;
  }

  /**
   * 获取所有任务
   * @returns {Promise<Array>} 任务列表
   */
  async getAllTasks() {
    if (!this.initialized) {
      throw new Error('TaskManager未初始化');
    }
    return Array.from(this.tasks.values());
  }

  /**
   * 根据ID获取任务
   * @param {string} taskId 任务ID
   * @returns {Promise<Object|null>} 任务对象，如果不存在则返回null
   */
  async getTaskById(id) {
    if (!this.initialized) {
      throw new Error('TaskManager未初始化');
    }
    return this.tasks.get(id) || null;
  }

  /**
   * 更新任务
   * @param {string} taskId 任务ID
   * @param {Object} updates 更新内容
   * @returns {Promise<Object>} 更新后的任务对象
   */
  async updateTask(id, updates) {
    if (!this.initialized) {
      throw new Error('TaskManager未初始化');
    }

    const task = this.tasks.get(id);
    if (!task) {
      throw new Error('任务不存在');
    }

    // 验证更新数据
    const updatedData = { ...task, ...updates };
    this._validateTaskData(updatedData);

    const updatedTask = {
      ...task,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(id, updatedTask);
    await this._saveToStorage();
    return updatedTask;
  }

  /**
   * 删除任务
   * @param {string} taskId 任务ID
   * @returns {Promise<void>}
   */
  async deleteTask(id) {
    if (!this.initialized) {
      throw new Error('TaskManager未初始化');
    }

    if (!this.tasks.has(id)) {
      throw new Error('任务不存在');
    }

    this.tasks.delete(id);
    await this._saveToStorage();
  }

  /**
   * 批量删除任务
   * @param {string[]} taskIds 任务ID数组
   * @returns {Promise<void>}
   * @throws {Error} 如果任何任务不存在
   */
  async deleteTasks(taskIds) {
    if (!this.initialized) {
      throw new Error('TaskManager未初始化');
    }

    // 先检查所有任务是否存在
    for (const id of taskIds) {
      if (!this.tasks.has(id)) {
        throw new Error(`任务不存在: ${id}`);
      }
    }

    // 批量删除任务
    for (const id of taskIds) {
      this.tasks.delete(id);
    }

    // 一次性保存更改
    await this._saveToStorage();
  }
} 