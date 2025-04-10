/**
 * SyncScheduler - 同步调度器
 * 负责调度同步任务的执行，管理同步策略和时机
 * 
 * 创建时间: 2025年04月09日 09时11分00秒 CST
 * 创建者: Claude 3.7 Sonnet
 * 编辑时间: 2025年04月09日 09时11分24秒 CST
 * 编辑时间: 2025年04月09日 09时12分03秒 CST
 * 编辑时间: 2025年04月09日 09时16分23秒 CST
 * 编辑时间: 2025年04月09日 09时19分36秒 CST
 * 编辑时间: 2025年04月09日 10时30分15秒 CST
 */

var EventBus = require('../utils/eventBus.js');

/**
 * 同步调度器
 * @namespace SyncScheduler
 */
var SyncScheduler = {
  /**
   * 初始化同步调度器
   * @param {Object} options 初始化选项
   * @param {Object} options.config 配置选项
   * @param {Number} options.config.maxConcurrent 最大并发数
   * @param {Number} options.config.retryLimit 最大重试次数
   * @param {Number} options.config.retryDelay 重试延迟(毫秒)
   * @return {Object} 当前实例
   */
  init: function(options) {
    // 处理参数
    options = options || {};
    this.config = this._initConfig(options.config || {});
    
    // 存储同步服务引用
    this.syncService = options.syncService || null;
    
    // 初始化状态
    this.status = {
      isRunning: false,
      isPaused: false,
      currentStrategy: 'default',
      lastSchedule: null,
      taskCount: 0,
      runningTasks: 0
    };
    
    // 初始化任务队列
    this.tasks = [];
    
    // 初始化定时器
    this.timers = {};
    
    // 初始化调度策略
    this._initStrategies();
    
    // 注册事件监听
    this._registerEventListeners();
    
    console.log('同步调度器初始化完成，最大并发数:', this.config.maxConcurrent);
    
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
      maxConcurrent: config.maxConcurrent || 3,
      retryLimit: config.retryLimit || 3,
      retryDelay: config.retryDelay || 5000,
      networkAware: typeof config.networkAware !== 'undefined' ? config.networkAware : true,
      priorityLevels: 10,
      batchSize: config.batchSize || 10,
      scheduleInterval: config.scheduleInterval || 60000 // 默认1分钟调度一次
    };
  },
  
  /**
   * 初始化调度策略
   * @private
   */
  _initStrategies: function() {
    // 定义不同的调度策略
    this.strategies = {
      // 默认策略：按优先级执行任务
      'default': {
        name: 'default',
        description: '默认调度策略，按优先级执行任务',
        maxConcurrent: this.config.maxConcurrent,
        scheduleInterval: this.config.scheduleInterval,
        sort: function(tasks) {
          return tasks.sort(function(a, b) {
            return b.priority - a.priority;
          });
        }
      },
      
      // 节能策略：降低并发数和调度频率，省电省流量
      'power-saving': {
        name: 'power-saving',
        description: '节能策略，降低并发数和调度频率',
        maxConcurrent: Math.max(1, Math.floor(this.config.maxConcurrent / 2)),
        scheduleInterval: this.config.scheduleInterval * 2,
        sort: function(tasks) {
          return tasks.sort(function(a, b) {
            return b.priority - a.priority;
          });
        }
      },
      
      // 紧急策略：提高并发数和调度频率，尽快完成任务
      'urgent': {
        name: 'urgent',
        description: '紧急策略，提高并发数和调度频率',
        maxConcurrent: this.config.maxConcurrent * 2,
        scheduleInterval: Math.max(10000, Math.floor(this.config.scheduleInterval / 2)),
        sort: function(tasks) {
          return tasks.sort(function(a, b) {
            // 优先级高的先执行，优先级相同时按创建时间先后执行
            if (b.priority !== a.priority) {
              return b.priority - a.priority;
            }
            return new Date(a.createdAt) - new Date(b.createdAt);
          });
        }
      },
      
      // 网络感知策略：根据网络状态调整调度行为
      'network-aware': {
        name: 'network-aware',
        description: '网络感知策略，根据网络状态调整调度行为',
        maxConcurrent: this.config.maxConcurrent,
        scheduleInterval: this.config.scheduleInterval,
        networkType: 'wifi', // 'wifi', '4g', '3g', '2g', 'unknown'
        sort: function(tasks) {
          var self = this;
          return tasks.sort(function(a, b) {
            // 在非WiFi网络下，优先处理小数据量的任务
            if (self.networkType !== 'wifi' && a.data && b.data) {
              var aSize = JSON.stringify(a.data).length;
              var bSize = JSON.stringify(b.data).length;
              
              if (aSize < 1024 && bSize >= 1024) return -1;
              if (bSize < 1024 && aSize >= 1024) return 1;
            }
            
            // 其他情况按优先级排序
            return b.priority - a.priority;
          });
        },
        updateNetworkType: function(type) {
          this.networkType = type;
          
          // 根据网络类型调整并发数
          if (type === 'wifi') {
            this.maxConcurrent = SyncScheduler.config.maxConcurrent;
          } else if (type === '4g') {
            this.maxConcurrent = Math.max(2, Math.floor(SyncScheduler.config.maxConcurrent * 0.7));
          } else {
            this.maxConcurrent = 1;
          }
        }
      }
    };
    
    // 设置当前策略为默认策略
    this.currentStrategy = this.strategies.default;
  },
  
  /**
   * 注册事件监听
   * @private
   */
  _registerEventListeners: function() {
    // 监听网络状态变化
    EventBus.on('network:status:changed', this._handleNetworkChange.bind(this));
    
    // 监听应用状态变化
    EventBus.on('app:show', this._handleAppShow.bind(this));
    EventBus.on('app:hide', this._handleAppHide.bind(this));
  },
  
  /**
   * 添加同步任务
   * @param {Object} task 任务对象
   * @param {String} task.id 任务ID
   * @param {String} task.collection 集合名称
   * @param {String} task.itemId 数据ID
   * @param {Object} task.data 数据对象
   * @param {Number} task.priority 优先级(1-10)
   * @return {Promise<Object>} 任务对象
   */
  addTask: function(task) {
    return new Promise(function(resolve, reject) {
      try {
        // 验证任务参数
        if (!task || !task.id || !task.collection || !task.itemId) {
          throw new Error('无效的任务参数');
        }
        
        // 检查任务是否已存在
        var existingTask = this._findTaskById(task.id);
        if (existingTask) {
          return resolve(existingTask);
        }
        
        // 准备任务对象
        var now = new Date().toISOString();
        var newTask = {
          id: task.id,
          collection: task.collection,
          itemId: task.itemId,
          data: task.data || null,
          priority: task.priority || 5,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
          retries: 0,
          nextRetry: null,
          error: null
        };
        
        // 添加到队列
        this.tasks.push(newTask);
        this.status.taskCount = this.tasks.length;
        
        // 触发事件
        EventBus.emit('scheduler:task:added', {
          task: newTask,
          timestamp: now
        });
        
        // 如果调度器正在运行，尝试调度任务
        if (this.status.isRunning && !this.status.isPaused) {
          this._scheduleNext();
        }
        
        resolve(newTask);
      } catch (err) {
        console.error('添加任务失败:', err);
        reject(err);
      }
    }.bind(this));
  },
  
  /**
   * 根据ID查找任务
   * @private
   * @param {String} id 任务ID
   * @return {Object} 任务对象
   */
  _findTaskById: function(id) {
    for (var i = 0; i < this.tasks.length; i++) {
      if (this.tasks[i].id === id) {
        return this.tasks[i];
      }
    }
    return null;
  },
  
  /**
   * 获取任务状态
   * @param {String} id 任务ID
   * @return {Promise<Object>} 任务状态
   */
  getTaskStatus: function(id) {
    return new Promise(function(resolve, reject) {
      try {
        var task = this._findTaskById(id);
        if (!task) {
          return reject(new Error('任务不存在'));
        }
        
        resolve({
          id: task.id,
          status: task.status,
          retries: task.retries,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          error: task.error
        });
      } catch (err) {
        reject(err);
      }
    }.bind(this));
  },
  
  /**
   * 获取所有任务状态
   * @return {Promise<Array>} 所有任务状态
   */
  getAllTasksStatus: function() {
    return new Promise(function(resolve) {
      var statuses = this.tasks.map(function(task) {
        return {
          id: task.id,
          collection: task.collection,
          itemId: task.itemId,
          status: task.status,
          priority: task.priority,
          retries: task.retries,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        };
      });
      
      resolve(statuses);
    }.bind(this));
  },
  
  /**
   * 取消任务
   * @param {String} id 任务ID
   * @return {Promise<Boolean>} 操作结果
   */
  cancelTask: function(id) {
    return new Promise(function(resolve, reject) {
      try {
        var taskIndex = -1;
        for (var i = 0; i < this.tasks.length; i++) {
          if (this.tasks[i].id === id) {
            taskIndex = i;
            break;
          }
        }
        
        if (taskIndex === -1) {
          return reject(new Error('任务不存在'));
        }
        
        var task = this.tasks[taskIndex];
        
        // 只有pending和failed状态的任务可以取消
        if (task.status !== 'pending' && task.status !== 'failed') {
          return reject(new Error('只能取消等待中或失败的任务'));
        }
        
        // 更新任务状态
        task.status = 'cancelled';
        task.updatedAt = new Date().toISOString();
        
        // 移除任务
        this.tasks.splice(taskIndex, 1);
        this.status.taskCount = this.tasks.length;
        
        // 触发事件
        EventBus.emit('scheduler:task:cancelled', {
          taskId: id,
          timestamp: task.updatedAt
        });
        
        resolve(true);
      } catch (err) {
        reject(err);
      }
    }.bind(this));
  },
  
  /**
   * 启动调度器
   * @return {Promise<Boolean>} 启动结果
   */
  start: function() {
    return new Promise(function(resolve, reject) {
      try {
        // 如果已经在运行中，直接返回
        if (this.status.isRunning) {
          return resolve(true);
        }
        
        // 检查依赖
        if (!this.syncService) {
          throw new Error('缺少syncService依赖，无法启动调度器');
        }
        
        // 更新状态
        this.status.isRunning = true;
        this.status.isPaused = false;
        this.status.lastSchedule = new Date().toISOString();
        
        // 触发事件
        EventBus.emit('scheduler:started', {
          timestamp: this.status.lastSchedule
        });
        
        // 开始调度任务
        this._scheduleNext();
        
        // 设置定期调度
        this.timers.scheduler = setInterval(function() {
          this._scheduleNext();
        }.bind(this), this.currentStrategy.scheduleInterval);
        
        resolve(true);
      } catch (err) {
        console.error('启动调度器失败:', err);
        reject(err);
      }
    }.bind(this));
  },
  
  /**
   * 停止调度器
   * @return {Promise<Boolean>} 停止结果
   */
  stop: function() {
    return new Promise(function(resolve, reject) {
      try {
        // 如果没有运行，直接返回
        if (!this.status.isRunning) {
          return resolve(true);
        }
        
        // 清除所有定时器
        for (var id in this.timers) {
          clearTimeout(this.timers[id]);
          clearInterval(this.timers[id]);
        }
        this.timers = {};
        
        // 更新状态
        this.status.isRunning = false;
        this.status.isPaused = false;
        var timestamp = new Date().toISOString();
        
        // 触发事件
        EventBus.emit('scheduler:stopped', {
          timestamp: timestamp
        });
        
        resolve(true);
      } catch (err) {
        console.error('停止调度器失败:', err);
        reject(err);
      }
    }.bind(this));
  },
  
  /**
   * 暂停调度
   * @return {Promise<Boolean>} 暂停结果
   */
  pause: function() {
    return new Promise(function(resolve, reject) {
      try {
        // 如果未运行或已暂停，直接返回
        if (!this.status.isRunning || this.status.isPaused) {
          return resolve(true);
        }
        
        // 更新状态
        this.status.isPaused = true;
        var timestamp = new Date().toISOString();
        
        // 触发事件
        EventBus.emit('scheduler:paused', {
          timestamp: timestamp
        });
        
        resolve(true);
      } catch (err) {
        console.error('暂停调度器失败:', err);
        reject(err);
      }
    }.bind(this));
  },
  
  /**
   * 恢复调度
   * @return {Promise<Boolean>} 恢复结果
   */
  resume: function() {
    return new Promise(function(resolve, reject) {
      try {
        // 如果未运行或未暂停，直接返回
        if (!this.status.isRunning || !this.status.isPaused) {
          return resolve(true);
        }
        
        // 更新状态
        this.status.isPaused = false;
        var timestamp = new Date().toISOString();
        
        // 触发事件
        EventBus.emit('scheduler:resumed', {
          timestamp: timestamp
        });
        
        // 立即执行一次调度
        this._scheduleNext();
        
        resolve(true);
      } catch (err) {
        console.error('恢复调度器失败:', err);
        reject(err);
      }
    }.bind(this));
  },
  
  /**
   * 设置调度策略
   * @param {String} strategyName 策略名称
   * @param {Object} strategyOptions 策略选项
   * @return {Promise<Boolean>} 设置结果
   */
  setStrategy: function(strategyName, strategyOptions) {
    return new Promise(function(resolve, reject) {
      try {
        // 检查策略是否存在
        if (!this.strategies[strategyName]) {
          throw new Error('不支持的调度策略: ' + strategyName);
        }
        
        // 备份旧策略
        var oldStrategy = this.currentStrategy;
        
        // 设置新策略
        this.currentStrategy = this.strategies[strategyName];
        
        // 应用策略选项
        if (strategyOptions) {
          for (var key in strategyOptions) {
            if (typeof this.currentStrategy[key] !== 'undefined') {
              this.currentStrategy[key] = strategyOptions[key];
            }
          }
        }
        
        // 更新状态
        this.status.currentStrategy = strategyName;
        var timestamp = new Date().toISOString();
        
        // 如果调度器正在运行，调整调度定时器
        if (this.status.isRunning) {
          // 清除旧的调度定时器
          if (this.timers.scheduler) {
            clearInterval(this.timers.scheduler);
          }
          
          // 设置新的调度定时器
          this.timers.scheduler = setInterval(function() {
            this._scheduleNext();
          }.bind(this), this.currentStrategy.scheduleInterval);
          
          // 立即执行一次调度
          this._scheduleNext();
        }
        
        // 触发事件
        EventBus.emit('scheduler:strategy:changed', {
          oldStrategy: oldStrategy.name,
          newStrategy: this.currentStrategy.name,
          options: strategyOptions,
          timestamp: timestamp
        });
        
        resolve(true);
      } catch (err) {
        console.error('设置调度策略失败:', err);
        reject(err);
      }
    }.bind(this));
  },
  
  /**
   * 获取当前调度策略
   * @return {Object} 当前策略
   */
  getStrategy: function() {
    return {
      name: this.currentStrategy.name,
      description: this.currentStrategy.description,
      maxConcurrent: this.currentStrategy.maxConcurrent,
      scheduleInterval: this.currentStrategy.scheduleInterval
    };
  },
  
  /**
   * 调度下一批任务
   * @private
   */
  _scheduleNext: function() {
    // 如果暂停中或非运行状态，不执行调度
    if (!this.status.isRunning || this.status.isPaused) {
      return;
    }
    
    // 更新调度时间
    this.status.lastSchedule = new Date().toISOString();
    
    // 获取可执行的任务数量
    var availableSlots = this.currentStrategy.maxConcurrent - this.status.runningTasks;
    if (availableSlots <= 0) {
      return;
    }
    
    // 获取待处理的任务
    var pendingTasks = this._getPendingTasks();
    if (pendingTasks.length === 0) {
      return;
    }
    
    // 使用当前策略的排序方法对任务排序
    pendingTasks = this.currentStrategy.sort(pendingTasks);
    
    // 执行任务，最多执行availableSlots个
    var tasksToRun = pendingTasks.slice(0, availableSlots);
    tasksToRun.forEach(this._executeTask.bind(this));
  },
  
  /**
   * 获取待处理的任务
   * @private
   * @return {Array} 待处理任务列表
   */
  _getPendingTasks: function() {
    var now = new Date();
    
    return this.tasks.filter(function(task) {
      // 只处理等待中的任务或需要重试的任务
      if (task.status !== 'pending' && task.status !== 'failed') {
        return false;
      }
      
      // 如果是需要重试的任务，检查是否到了重试时间
      if (task.status === 'failed' && task.nextRetry) {
        var nextRetryTime = new Date(task.nextRetry);
        return now >= nextRetryTime;
      }
      
      return true;
    });
  },
  
  /**
   * 执行单个任务
   * @private
   * @param {Object} task 任务对象
   */
  _executeTask: function(task) {
    // 更新任务状态
    task.status = 'syncing';
    task.updatedAt = new Date().toISOString();
    
    // 更新运行中任务计数
    this.status.runningTasks++;
    
    console.log('开始执行任务:', task.id, '(集合:', task.collection, '数据ID:', task.itemId, ')');
    
    // 检查syncService依赖
    if (!this.syncService) {
      this._handleTaskError(task, new Error('缺少syncService依赖'));
      return;
    }
    
    // 调用同步服务执行同步
    this.syncService.sync({
      collections: [task.collection],
      ids: [task.itemId],
      data: task.data,
      force: true // 强制同步，忽略时间间隔限制
    })
    .then(function(result) {
      this._handleTaskSuccess(task, result);
    }.bind(this))
    .catch(function(error) {
      this._handleTaskError(task, error);
    }.bind(this));
  },
  
  /**
   * 处理任务成功
   * @private
   * @param {Object} task 任务对象
   * @param {Object} result 同步结果
   */
  _handleTaskSuccess: function(task, result) {
    // 更新任务状态
    task.status = 'done';
    task.updatedAt = new Date().toISOString();
    task.result = result;
    
    // 更新运行中任务计数
    this.status.runningTasks--;
    
    console.log('任务执行成功:', task.id);
    
    // 触发事件
    EventBus.emit('scheduler:task:completed', {
      taskId: task.id,
      result: result,
      timestamp: task.updatedAt
    });
    
    // 继续调度下一批任务
    this._scheduleNext();
  },
  
  /**
   * 处理任务错误
   * @private
   * @param {Object} task 任务对象
   * @param {Error} error 错误对象
   */
  _handleTaskError: function(task, error) {
    console.error('任务执行失败:', task.id, error);
    
    // 更新运行中任务计数
    this.status.runningTasks--;
    
    // 增加重试次数
    task.retries++;
    task.updatedAt = new Date().toISOString();
    
    // 记录错误信息
    task.error = {
      message: error.message,
      stack: error.stack,
      timestamp: task.updatedAt
    };
    
    // 判断是否可以重试
    var canRetry = task.retries < this.config.retryLimit;
    
    if (canRetry) {
      // 设置重试状态
      task.status = 'failed';
      
      // 计算下次重试时间（使用指数退避策略）
      var delay = this._calculateRetryDelay(task.retries);
      var nextRetryTime = new Date(Date.now() + delay);
      task.nextRetry = nextRetryTime.toISOString();
      
      console.log('任务将在', delay, 'ms后重试, 当前重试次数:', task.retries);
      
      // 触发事件
      EventBus.emit('scheduler:task:failed', {
        taskId: task.id,
        error: task.error,
        willRetry: true,
        retryCount: task.retries,
        nextRetry: task.nextRetry,
        timestamp: task.updatedAt
      });
      
      // 设置重试定时器
      this.timers[task.id] = setTimeout(function() {
        // 重新执行任务
        this._executeTask(task);
      }.bind(this), delay);
    } else {
      // 达到最大重试次数，标记为失败
      task.status = 'error';
      
      console.log('任务达到最大重试次数，标记为失败:', task.id);
      
      // 触发事件
      EventBus.emit('scheduler:task:failed', {
        taskId: task.id,
        error: task.error,
        willRetry: false,
        retryCount: task.retries,
        timestamp: task.updatedAt
      });
    }
    
    // 继续调度下一批任务
    this._scheduleNext();
  },
  
  /**
   * 计算重试延迟时间（指数退避策略）
   * @private
   * @param {Number} retryCount 当前重试次数
   * @return {Number} 延迟时间(毫秒)
   */
  _calculateRetryDelay: function(retryCount) {
    // 基础延迟
    var baseDelay = this.config.retryDelay;
    
    // 使用指数退避策略：延迟时间 = 基础延迟 * (2^重试次数) + 随机抖动
    var exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    
    // 添加随机抖动，避免多个任务同时重试造成拥塞
    var jitter = Math.random() * baseDelay;
    
    // 最终延迟时间
    var delay = Math.min(exponentialDelay + jitter, 300000); // 最大不超过5分钟
    
    return Math.floor(delay);
  },
  
  /**
   * 处理网络状态变化
   * @private
   * @param {Object} data 网络状态数据
   */
  _handleNetworkChange: function(data) {
    // 检查是否启用了网络感知
    if (!this.config.networkAware) {
      return;
    }
    
    var isConnected = data.isConnected;
    var networkType = data.networkType || 'unknown';
    
    console.log('网络状态变化:', isConnected ? networkType : 'disconnected');
    
    // 更新网络感知策略
    if (this.strategies['network-aware']) {
      this.strategies['network-aware'].updateNetworkType(networkType);
    }
    
    // 如果网络连接状态变化
    if (isConnected) {
      // 如果网络恢复连接，尝试恢复调度
      if (this.status.isPaused) {
        this.resume();
      }
      
      // 切换到网络感知策略
      if (this.config.networkAware && this.status.currentStrategy !== 'network-aware') {
        this.setStrategy('network-aware');
      }
      
      // 立即调度一次
      this._scheduleNext();
    } else {
      // 如果网络断开，暂停调度
      this.pause();
    }
  },
  
  /**
   * 处理应用显示
   * @private
   */
  _handleAppShow: function() {
    console.log('应用进入前台，恢复同步调度');
    
    // 恢复调度
    this.resume();
    
    // 立即调度一次
    this._scheduleNext();
  },
  
  /**
   * 处理应用隐藏
   * @private
   */
  _handleAppHide: function() {
    console.log('应用进入后台，暂停同步调度');
    
    // 暂停调度
    this.pause();
  }
};

module.exports = SyncScheduler; 