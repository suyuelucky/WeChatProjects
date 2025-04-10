/**
 * 网络状态监测器 - 用于监控网络状态和变化
 * 创建时间: 2025-04-10 14:35:26
 * 创建者: Claude AI 3.7 Sonnet
 */

class NetworkStatusMonitor {
  constructor(options = {}) {
    this._listeners = [];
    this._currentStatus = null;
    this._options = {
      checkInterval: options.checkInterval || 5000, // 默认5秒检查一次
      retryLimit: options.retryLimit || 3,
      logLevel: options.logLevel || 'warn',
    };
    
    this._checkTimer = null;
    this._isMonitoring = false;
    
    // 状态变化时间戳记录
    this._statusChangeTimestamp = Date.now();
    
    // 状态历史
    this._statusHistory = [];
    this._maxHistoryLength = 20;
    
    // 初始化监听器
    this._initListeners();
  }
  
  /**
   * 初始化网络状态监听器
   * @private
   */
  _initListeners() {
    // 监听网络状态变化
    wx.onNetworkStatusChange(res => {
      const prevStatus = this._currentStatus;
      this._currentStatus = {
        isConnected: res.isConnected,
        networkType: res.networkType,
        timestamp: Date.now()
      };
      
      // 记录状态变化
      this._recordStatusChange(prevStatus, this._currentStatus);
      
      // 触发回调
      this._notifyListeners(this._currentStatus, prevStatus);
    });
  }
  
  /**
   * 开始监控网络状态
   */
  startMonitoring() {
    if (this._isMonitoring) return;
    
    this._isMonitoring = true;
    this._checkNetworkStatus();
    
    // 设置定时检查
    this._checkTimer = setInterval(() => {
      this._checkNetworkStatus();
    }, this._options.checkInterval);
    
    this._log('info', '网络状态监控已启动');
  }
  
  /**
   * 停止监控网络状态
   */
  stopMonitoring() {
    if (!this._isMonitoring) return;
    
    this._isMonitoring = false;
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
    
    this._log('info', '网络状态监控已停止');
  }
  
  /**
   * 检查当前网络状态
   * @private
   */
  _checkNetworkStatus() {
    wx.getNetworkType({
      success: res => {
        const prevStatus = this._currentStatus;
        this._currentStatus = {
          networkType: res.networkType,
          isConnected: res.networkType !== 'none',
          timestamp: Date.now()
        };
        
        // 如果状态发生变化，记录并通知
        if (!prevStatus || 
            prevStatus.isConnected !== this._currentStatus.isConnected ||
            prevStatus.networkType !== this._currentStatus.networkType) {
          this._recordStatusChange(prevStatus, this._currentStatus);
          this._notifyListeners(this._currentStatus, prevStatus);
        }
      },
      fail: err => {
        this._log('error', '获取网络状态失败', err);
      }
    });
  }
  
  /**
   * 记录网络状态变化
   * @param {Object} prevStatus 之前的状态
   * @param {Object} currentStatus 当前状态
   * @private
   */
  _recordStatusChange(prevStatus, currentStatus) {
    this._statusChangeTimestamp = Date.now();
    
    const record = {
      timestamp: this._statusChangeTimestamp,
      from: prevStatus || { networkType: 'unknown', isConnected: false },
      to: currentStatus,
      duration: prevStatus ? currentStatus.timestamp - prevStatus.timestamp : 0
    };
    
    this._statusHistory.unshift(record);
    
    // 限制历史记录长度
    if (this._statusHistory.length > this._maxHistoryLength) {
      this._statusHistory = this._statusHistory.slice(0, this._maxHistoryLength);
    }
    
    this._log('info', `网络状态变化: ${prevStatus?.networkType || 'unknown'} -> ${currentStatus.networkType}`);
  }
  
  /**
   * 通知所有监听器
   * @param {Object} currentStatus 当前状态
   * @param {Object} prevStatus 之前的状态
   * @private
   */
  _notifyListeners(currentStatus, prevStatus) {
    this._listeners.forEach(listener => {
      try {
        listener(currentStatus, prevStatus);
      } catch (e) {
        this._log('error', '执行网络状态监听器回调时发生错误', e);
      }
    });
  }
  
  /**
   * 添加网络状态变化监听器
   * @param {Function} listener 监听器回调函数
   * @returns {Function} 用于移除监听器的函数
   */
  addListener(listener) {
    if (typeof listener !== 'function') {
      this._log('error', '添加的监听器必须是函数');
      return () => {};
    }
    
    this._listeners.push(listener);
    
    // 返回移除函数
    return () => this.removeListener(listener);
  }
  
  /**
   * 移除网络状态监听器
   * @param {Function} listener 要移除的监听器
   * @returns {boolean} 是否成功移除
   */
  removeListener(listener) {
    const index = this._listeners.indexOf(listener);
    if (index >= 0) {
      this._listeners.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * 获取当前网络状态
   * @returns {Promise<Object>} 包含网络状态信息的Promise
   */
  getCurrentStatus() {
    return new Promise((resolve, reject) => {
      wx.getNetworkType({
        success: res => {
          const status = {
            networkType: res.networkType,
            isConnected: res.networkType !== 'none',
            timestamp: Date.now()
          };
          resolve(status);
        },
        fail: err => {
          this._log('error', '获取网络状态失败', err);
          reject(err);
        }
      });
    });
  }
  
  /**
   * 获取网络状态历史记录
   * @returns {Array} 网络状态变化历史
   */
  getStatusHistory() {
    return [...this._statusHistory];
  }
  
  /**
   * 判断当前是否是弱网环境
   * @returns {boolean} 是否为弱网环境
   */
  isWeakNetwork() {
    if (!this._currentStatus) return true;
    
    // 无网络或者2G网络被视为弱网环境
    return !this._currentStatus.isConnected || 
           this._currentStatus.networkType === 'none' || 
           this._currentStatus.networkType === '2g';
  }
  
  /**
   * 获取网络类型等级（用于网络质量判断）
   * @returns {number} 网络等级，越高越好 (0-4)
   */
  getNetworkLevel() {
    if (!this._currentStatus || !this._currentStatus.isConnected) {
      return 0; // 无网络
    }
    
    switch(this._currentStatus.networkType) {
      case 'none': return 0;
      case '2g': return 1;
      case '3g': return 2;
      case '4g': return 3;
      case 'wifi': return 4;
      case '5g': return 4;
      default: return 2; // 未知网络默认为中等
    }
  }
  
  /**
   * 内部日志函数
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   * @param {*} data 附加数据
   * @private
   */
  _log(level, message, data) {
    const logLevels = {
      debug: 0,
      info: 1,
      warn: 2, 
      error: 3
    };
    
    if (logLevels[level] >= logLevels[this._options.logLevel]) {
      const prefix = '[网络监测器]';
      switch(level) {
        case 'debug': console.debug(prefix, message, data || ''); break;
        case 'info': console.info(prefix, message, data || ''); break;
        case 'warn': console.warn(prefix, message, data || ''); break;
        case 'error': console.error(prefix, message, data || ''); break;
      }
    }
  }
}

module.exports = NetworkStatusMonitor; 