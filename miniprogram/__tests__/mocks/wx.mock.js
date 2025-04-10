/**
 * 微信小程序wx对象模拟实现
 * 
 * 创建时间: 2025-04-09 11:28:30 CST
 * 创建者: Claude-3.7-Sonnet
 * 文件类型: 模拟对象
 */

const LocalStorageMock = require('./localStorage.mock');

/**
 * 微信小程序API模拟对象
 */
const wxMock = {
  storage: new LocalStorageMock(),
  
  /**
   * 模拟wx.setStorage
   * @param {Object} options 选项对象
   * @param {string} options.key 键名
   * @param {any} options.data 要存储的数据
   * @param {Function} options.success 成功回调
   * @param {Function} options.fail 失败回调
   * @param {Function} options.complete 完成回调
   */
  setStorage: function(options) {
    try {
      this.storage.setItem(options.key, JSON.stringify(options.data));
      if (options.success) {
        options.success({ errMsg: "setStorage:ok" });
      }
    } catch (e) {
      if (options.fail) {
        options.fail({ errMsg: "setStorage:fail " + e.message });
      }
    } finally {
      if (options.complete) {
        options.complete();
      }
    }
  },

  /**
   * 模拟wx.setStorageSync
   * @param {string} key 键名
   * @param {any} data 要存储的数据
   */
  setStorageSync: function(key, data) {
    try {
      this.storage.setItem(key, JSON.stringify(data));
    } catch (e) {
      throw new Error("setStorageSync:fail " + e.message);
    }
  },

  /**
   * 模拟wx.getStorage
   * @param {Object} options 选项对象
   * @param {string} options.key 键名
   * @param {Function} options.success 成功回调
   * @param {Function} options.fail 失败回调
   * @param {Function} options.complete 完成回调
   */
  getStorage: function(options) {
    try {
      const value = this.storage.getItem(options.key);
      if (value !== null) {
        if (options.success) {
          options.success({ data: JSON.parse(value), errMsg: "getStorage:ok" });
        }
      } else {
        if (options.fail) {
          options.fail({ errMsg: "getStorage:fail data not found" });
        }
      }
    } catch (e) {
      if (options.fail) {
        options.fail({ errMsg: "getStorage:fail " + e.message });
      }
    } finally {
      if (options.complete) {
        options.complete();
      }
    }
  },

  /**
   * 模拟wx.getStorageSync
   * @param {string} key 键名
   * @returns {any} 存储的数据
   */
  getStorageSync: function(key) {
    try {
      const value = this.storage.getItem(key);
      if (value !== null) {
        return JSON.parse(value);
      }
      return '';
    } catch (e) {
      throw new Error("getStorageSync:fail " + e.message);
    }
  },

  /**
   * 模拟wx.removeStorage
   * @param {Object} options 选项对象
   * @param {string} options.key 键名
   * @param {Function} options.success 成功回调
   * @param {Function} options.fail 失败回调
   * @param {Function} options.complete 完成回调
   */
  removeStorage: function(options) {
    try {
      this.storage.removeItem(options.key);
      if (options.success) {
        options.success({ errMsg: "removeStorage:ok" });
      }
    } catch (e) {
      if (options.fail) {
        options.fail({ errMsg: "removeStorage:fail " + e.message });
      }
    } finally {
      if (options.complete) {
        options.complete();
      }
    }
  },

  /**
   * 模拟wx.removeStorageSync
   * @param {string} key 键名
   */
  removeStorageSync: function(key) {
    try {
      this.storage.removeItem(key);
    } catch (e) {
      throw new Error("removeStorageSync:fail " + e.message);
    }
  },

  /**
   * 模拟wx.clearStorage
   * @param {Object} options 选项对象
   * @param {Function} options.success 成功回调
   * @param {Function} options.fail 失败回调
   * @param {Function} options.complete 完成回调
   */
  clearStorage: function(options = {}) {
    try {
      this.storage.clear();
      if (options.success) {
        options.success({ errMsg: "clearStorage:ok" });
      }
    } catch (e) {
      if (options.fail) {
        options.fail({ errMsg: "clearStorage:fail " + e.message });
      }
    } finally {
      if (options.complete) {
        options.complete();
      }
    }
  },

  /**
   * 模拟wx.clearStorageSync
   */
  clearStorageSync: function() {
    try {
      this.storage.clear();
    } catch (e) {
      throw new Error("clearStorageSync:fail " + e.message);
    }
  },
  
  /**
   * 重置所有模拟数据和状态
   */
  resetMock: function() {
    this.storage = new LocalStorageMock();
  },
  
  /**
   * 设置存储错误模拟
   * @param {boolean} shouldSimulateError 是否模拟错误
   */
  setStorageErrorSimulation: function(shouldSimulateError) {
    this.storage.simulateError = shouldSimulateError;
  }
};

module.exports = wxMock; 