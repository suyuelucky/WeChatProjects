/**
 * InterceptorManager
 * 拦截器管理器，提供请求和响应拦截器的管理功能
 * 符合微信小程序环境的ES5语法标准
 */

'use strict';

/**
 * 拦截器管理器构造函数
 * @constructor
 */
function InterceptorManager() {
  this.handlers = [];
  this._disabled = {};
}

/**
 * 添加拦截器
 * @param {Function} fulfilled 成功处理函数
 * @param {Function} rejected 失败处理函数
 * @returns {Number} 拦截器ID，用于后续管理操作
 */
InterceptorManager.prototype.use = function(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  
  return this.handlers.length - 1;
};

/**
 * 移除拦截器
 * @param {Number} id 拦截器ID
 */
InterceptorManager.prototype.eject = function(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
    
    // 如果存在禁用状态，也一并清除
    if (this._disabled[id]) {
      delete this._disabled[id];
    }
  }
};

/**
 * 遍历所有拦截器
 * @param {Function} fn 遍历回调函数
 */
InterceptorManager.prototype.forEach = function(fn) {
  for (var i = 0; i < this.handlers.length; i++) {
    var h = this.handlers[i];
    
    // 只处理非空且非禁用的拦截器
    if (h !== null && !this._disabled[i]) {
      fn(h);
    }
  }
};

/**
 * 清空所有拦截器
 */
InterceptorManager.prototype.clear = function() {
  this.handlers = [];
  this._disabled = {};
};

/**
 * 获取所有有效的拦截器
 * @returns {Array} 有效拦截器数组
 */
InterceptorManager.prototype.getHandlers = function() {
  var activeHandlers = [];
  
  this.forEach(function(handler) {
    activeHandlers.push(handler);
  });
  
  return activeHandlers;
};

/**
 * 禁用指定拦截器
 * @param {Number} id 拦截器ID
 * @returns {Boolean} 是否成功禁用
 */
InterceptorManager.prototype.disable = function(id) {
  if (this.handlers[id] !== null) {
    this._disabled[id] = true;
    return true;
  }
  return false;
};

/**
 * 启用指定拦截器
 * @param {Number} id 拦截器ID
 * @returns {Boolean} 是否成功启用
 */
InterceptorManager.prototype.enable = function(id) {
  if (this.handlers[id] !== null) {
    delete this._disabled[id];
    return true;
  }
  return false;
};

/**
 * 检查拦截器是否被禁用
 * @param {Number} id 拦截器ID
 * @returns {Boolean} 是否被禁用
 */
InterceptorManager.prototype.isDisabled = function(id) {
  return !!this._disabled[id];
};

/**
 * 获取拦截器数量
 * @returns {Number} 拦截器数量
 */
InterceptorManager.prototype.count = function() {
  var count = 0;
  
  for (var i = 0; i < this.handlers.length; i++) {
    if (this.handlers[i] !== null && !this._disabled[i]) {
      count++;
    }
  }
  
  return count;
};

module.exports = InterceptorManager; 