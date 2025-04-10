/**
 * localStorage模拟实现
 * 
 * 创建时间: 2025-04-09 11:27:24 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 模拟对象
 */

/**
 * localStorage模拟类
 * 用于测试环境中模拟浏览器的localStorage功能
 */
function LocalStorageMock() {
  var storage = {};
  this.simulateError = false;

  /**
   * 获取存储项
   * @param {string} key 存储键
   * @returns {string|null} 存储的值或null
   */
  this.getItem = function(key) {
    return key in storage ? storage[key] : null;
  };

  /**
   * 设置存储项
   * @param {string} key 存储键
   * @param {string} value 要存储的值
   */
  this.setItem = function(key, value) {
    if (this.simulateError) {
      throw new Error("存储失败: 模拟的错误");
    }
    storage[key] = value.toString();
  };

  /**
   * 移除存储项
   * @param {string} key 要移除的键
   */
  this.removeItem = function(key) {
    delete storage[key];
  };

  /**
   * 清空所有存储
   */
  this.clear = function() {
    storage = {};
  };

  /**
   * 获取键的数量
   * @returns {number} 键的数量
   */
  this.length = function() {
    return Object.keys(storage).length;
  };

  /**
   * 获取指定索引的键
   * @param {number} index 索引
   * @returns {string|null} 键名或null
   */
  this.key = function(index) {
    var keys = Object.keys(storage);
    return index < keys.length ? keys[index] : null;
  };
}

module.exports = LocalStorageMock; 