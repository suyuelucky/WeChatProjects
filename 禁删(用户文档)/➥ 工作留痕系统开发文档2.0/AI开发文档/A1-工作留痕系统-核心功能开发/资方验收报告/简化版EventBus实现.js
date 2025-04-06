/**
 * 简化版EventBus实现
 * 用于替换原有eventBus以测试架构弹性
 * 保持接口一致但简化内部实现
 */

/**
 * 简化版事件总线
 * 实现了与原版相同的接口但内部逻辑简化
 */
var SimpleEventBus = {
  // 事件存储
  _events: {},
  
  /**
   * 注册事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   * @return {object} 当前实例，支持链式调用
   */
  on: function(eventName, callback) {
    if (!this._events[eventName]) {
      this._events[eventName] = [];
    }
    
    // 添加回调函数
    this._events[eventName].push(callback);
    
    // 输出调试信息
    console.log('[简化EventBus] 注册事件: ' + eventName);
    
    return this;
  },
  
  /**
   * 触发事件
   * @param {string} eventName 事件名称
   * @param {any} data 事件数据
   * @return {object} 当前实例，支持链式调用
   */
  emit: function(eventName, data) {
    // 输出调试信息
    console.log('[简化EventBus] 触发事件: ' + eventName, data);
    
    var handlers = this._events[eventName];
    if (!handlers || handlers.length === 0) {
      console.log('[简化EventBus] 没有找到事件处理器: ' + eventName);
      return this;
    }
    
    // 执行所有回调
    for (var i = 0; i < handlers.length; i++) {
      try {
        handlers[i](data);
      } catch (err) {
        console.error('[简化EventBus] 执行事件处理器出错: ' + eventName, err);
      }
    }
    
    return this;
  },
  
  /**
   * 移除事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} [callback] 要移除的回调函数，不传则移除该事件的所有监听器
   * @return {object} 当前实例，支持链式调用
   */
  off: function(eventName, callback) {
    var handlers = this._events[eventName];
    
    if (!handlers) {
      return this;
    }
    
    // 如果未提供回调，删除所有该事件的处理函数
    if (!callback) {
      delete this._events[eventName];
      console.log('[简化EventBus] 移除所有事件处理器: ' + eventName);
      return this;
    }
    
    // 否则只删除匹配的处理函数
    for (var i = 0; i < handlers.length; i++) {
      if (handlers[i] === callback) {
        handlers.splice(i, 1);
        i--; // 数组变短，索引减一
      }
    }
    
    // 如果处理函数数组为空，删除该事件
    if (handlers.length === 0) {
      delete this._events[eventName];
    }
    
    console.log('[简化EventBus] 移除特定事件处理器: ' + eventName);
    return this;
  },
  
  /**
   * 注册事件监听器，但仅触发一次
   * @param {string} eventName 事件名称
   * @param {Function} callback 回调函数
   * @return {object} 当前实例，支持链式调用
   */
  once: function(eventName, callback) {
    if (!callback) return this;
    
    var self = this;
    
    // 创建一个包装函数
    function wrapper(data) {
      // 调用原始回调
      callback(data);
      // 移除事件处理函数
      self.off(eventName, wrapper);
    }
    
    // 注册包装函数
    return this.on(eventName, wrapper);
  },
  
  /**
   * 清空所有事件监听器
   * @return {object} 当前实例，支持链式调用
   */
  clear: function() {
    this._events = {};
    console.log('[简化EventBus] 已清空所有事件');
    return this;
  },
  
  /**
   * 获取所有已注册事件名称
   * @return {Array<string>} 事件名称列表
   */
  getEvents: function() {
    return Object.keys(this._events);
  },
  
  /**
   * 获取指定事件的监听器数量
   * @param {string} eventName 事件名称
   * @return {number} 监听器数量
   */
  getListenerCount: function(eventName) {
    var handlers = this._events[eventName];
    return handlers ? handlers.length : 0;
  }
};

/**
 * 替换系统中的EventBus
 * @return {Object} 替换前的原始EventBus
 */
function replaceEventBus() {
  // 获取原始模块
  var originalEventBus = require('../../miniprogram/utils/eventBus');
  
  // 创建替换函数
  const replace = function(obj, target) {
    // 保存原始对象
    const original = {};
    
    // 复制属性
    for (let key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] !== 'undefined') {
        original[key] = obj[key];
        obj[key] = target[key];
      }
    }
    
    return original;
  };
  
  // 执行替换
  const original = replace(originalEventBus, SimpleEventBus);
  
  console.log('[测试] 已用简化版EventBus替换原版实现');
  
  return original;
}

/**
 * 恢复原始EventBus
 * @param {Object} original 原始EventBus对象
 */
function restoreEventBus(original) {
  if (!original) return;
  
  // 获取当前模块
  var eventBus = require('../../miniprogram/utils/eventBus');
  
  // 恢复原始属性
  for (let key in original) {
    if (original.hasOwnProperty(key)) {
      eventBus[key] = original[key];
    }
  }
  
  console.log('[测试] 已恢复原始EventBus实现');
}

// 导出模块
module.exports = {
  SimpleEventBus: SimpleEventBus,
  replaceEventBus: replaceEventBus,
  restoreEventBus: restoreEventBus
}; 