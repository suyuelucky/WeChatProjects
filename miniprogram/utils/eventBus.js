/**
 * 事件总线
 * 用于解耦组件和服务之间的依赖关系，避免循环依赖
 */
const EventBus = {
  events: {},
  eventTimeouts: {}, // 存储事件超时控制器
  
  /**
   * 注册事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   * @param {Object} options 选项参数
   * @param {number} options.timeout 超时时间(毫秒)
   * @param {string} options.priority 优先级('high','normal','low')
   * @return {object} 当前实例，支持链式调用
   */
  on: function(eventName, callback, options) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    
    options = options || {};
    var priority = options.priority || 'normal';
    var timeout = options.timeout || 0;
    
    // 存储回调和其配置
    var handlerObj = {
      callback: callback,
      priority: priority === 'high' ? 2 : (priority === 'normal' ? 1 : 0),
      timeout: timeout
    };
    
    this.events[eventName].push(handlerObj);
    
    // 按优先级排序处理器
    if (this.events[eventName].length > 1) {
      this.events[eventName].sort(function(a, b) {
        return b.priority - a.priority;
      });
    }
    
    return this; // 支持链式调用
  },
  
  /**
   * 触发事件
   * @param {string} eventName 事件名称
   * @param {any} data 事件数据
   * @return {object} 当前实例，支持链式调用
   */
  emit: function(eventName, data) {
    var handlers = this.events[eventName];
    var self = this;
    
    if (handlers && handlers.length > 0) {
      // 创建一个副本进行操作，防止回调中修改原数组
      var handlersCopy = handlers.slice(0);
      
      for (var i = 0; i < handlersCopy.length; i++) {
        var handler = handlersCopy[i];
        
        try {
          // 使用超时机制
          if (handler.timeout > 0) {
            this._executeWithTimeout(handler.callback, data, handler.timeout, eventName);
          } else {
            handler.callback(data);
          }
        } catch (err) {
          console.error('[EventBus] 执行事件处理器出错:', eventName, err);
          // 触发错误事件，让系统有机会处理错误
          if (eventName !== 'error') {
            this.emit('error', {
              error: err,
              eventName: eventName,
              data: data
            });
          }
        }
      }
    }
    
    return this;
  },
  
  /**
   * 使用超时控制执行回调
   * @private
   */
  _executeWithTimeout: function(callback, data, timeout, eventName) {
    var executed = false;
    var timeoutId = setTimeout(function() {
      if (!executed) {
        console.warn('[EventBus] 事件处理超时:', eventName, timeout + 'ms');
        executed = true;
      }
    }, timeout);
    
    try {
      callback(data);
      executed = true;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  
  /**
   * 移除事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} [callback] 要移除的回调函数，不传则移除该事件的所有监听器
   * @return {object} 当前实例，支持链式调用
   */
  off: function(eventName, callback) {
    var handlers = this.events[eventName];
    
    if (handlers) {
      if (callback) {
        // 通过比较回调函数来过滤
        this.events[eventName] = handlers.filter(function(handler) {
          return handler.callback !== callback;
        });
      } else {
        delete this.events[eventName];
      }
    }
    
    return this;
  },

  /**
   * 注册事件监听器，但仅触发一次
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   * @param {Object} options 选项参数
   * @return {object} 当前实例，支持链式调用
   */
  once: function(eventName, callback, options) {
    var self = this;
    
    function onceCallback(data) {
      callback(data);
      self.off(eventName, onceCallback);
    }
    
    return this.on(eventName, onceCallback, options);
  },

  /**
   * 清空所有事件监听器
   * @return {object} 当前实例，支持链式调用
   */
  clear: function() {
    this.events = {};
    return this;
  },
  
  /**
   * 获取指定事件的监听器数量
   * @param {string} eventName 事件名称
   * @return {number} 监听器数量
   */
  getListenerCount: function(eventName) {
    var handlers = this.events[eventName];
    return handlers ? handlers.length : 0;
  },
  
  /**
   * 获取所有已注册的事件名称
   * @return {Array} 事件名称列表
   */
  getEvents: function() {
    var result = [];
    for (var eventName in this.events) {
      if (this.events.hasOwnProperty(eventName)) {
        result.push(eventName);
      }
    }
    return result;
  },
  
  /**
   * 清除特定事件的所有监听器
   * @param {string} eventName 事件名称
   * @return {object} 当前实例
   */
  clearListeners: function(eventName) {
    if (this.events[eventName]) {
      delete this.events[eventName];
    }
    return this;
  },
  
  /**
   * 清除所有事件的监听器
   * @return {object} 当前实例
   */
  clearAllListeners: function() {
    this.events = {};
    return this;
  }
};

// 导出EventBus实例
module.exports = EventBus; 