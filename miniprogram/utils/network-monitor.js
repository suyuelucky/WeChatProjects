/**
 * 网络监控工具
 * 用于监控网络状态变化并通知其他组件
 */

/**
 * 网络监控工具
 */
const NetworkMonitor = {
  // 网络状态
  _networkState: {
    connected: true,         // 是否连接
    networkType: 'unknown',  // 网络类型：wifi, 2g, 3g, 4g, unknown, none
    isConnecting: false,     // 是否正在连接中
    lastCheckTime: 0,        // 最后检查时间
    signalStrength: 'normal' // 信号强度：strong, normal, weak
  },
  
  // 网络变化回调函数列表
  _changeCallbacks: [],
  
  // 监控是否已初始化
  _isInitialized: false,
  
  // 检查间隔 (ms)
  _checkInterval: 15000,
  
  // 检查定时器
  _checkTimer: null,
  
  /**
   * 初始化网络监控
   * @returns {Object} 当前实例
   */
  init() {
    if (this._isInitialized) {
      return this;
    }
    
    // 立即检查一次网络状态
    this._checkNetworkStatus();
    
    // 监听网络变化事件
    this._setupNetworkListener();
    
    // 定时检查网络状态 (每15秒)
    this._startPeriodicCheck();
    
    this._isInitialized = true;
    console.log('[NetworkMonitor] 网络监控初始化完成');
    
    return this;
  },
  
  /**
   * 设置网络监听器
   * @private
   */
  _setupNetworkListener() {
    // 监听网络状态变化
    wx.onNetworkStatusChange(res => {
      // 更新网络状态
      this._updateNetworkState({
        connected: res.isConnected,
        networkType: res.networkType,
        lastCheckTime: Date.now()
      });
      
      console.log(`[NetworkMonitor] 网络状态变化: ${res.networkType}, 连接: ${res.isConnected}`);
    });
  },
  
  /**
   * 开始定期检查网络
   * @private
   */
  _startPeriodicCheck() {
    // 清除可能存在的之前的定时器
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
    }
    
    // 设置新的定时器
    this._checkTimer = setInterval(() => {
      this._checkNetworkStatus();
    }, this._checkInterval);
  },
  
  /**
   * 停止定期检查
   * @private
   */
  _stopPeriodicCheck() {
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
  },
  
  /**
   * 检查网络状态
   * @private
   */
  _checkNetworkStatus() {
    wx.getNetworkType({
      success: res => {
        // 更新网络状态
        const isConnected = res.networkType !== 'none';
        
        // 评估信号强度
        let signalStrength = 'normal';
        if (res.networkType === 'wifi') {
          signalStrength = 'strong';
        } else if (res.networkType === '2g') {
          signalStrength = 'weak';
        }
        
        // 更新状态
        this._updateNetworkState({
          connected: isConnected,
          networkType: res.networkType,
          lastCheckTime: Date.now(),
          signalStrength: signalStrength
        });
      },
      fail: err => {
        console.error('[NetworkMonitor] 获取网络状态失败:', err);
        
        // 更新为未知状态
        this._updateNetworkState({
          connected: false,
          networkType: 'unknown',
          lastCheckTime: Date.now()
        });
      }
    });
  },
  
  /**
   * 手动检查网络状态
   * @returns {Promise} 网络状态Promise
   */
  checkNetworkStatus() {
    return new Promise((resolve, reject) => {
      wx.getNetworkType({
        success: res => {
          // 更新网络状态
          const isConnected = res.networkType !== 'none';
          
          // 评估信号强度
          let signalStrength = 'normal';
          if (res.networkType === 'wifi') {
            signalStrength = 'strong';
          } else if (res.networkType === '2g') {
            signalStrength = 'weak';
          }
          
          // 更新状态
          this._updateNetworkState({
            connected: isConnected,
            networkType: res.networkType,
            lastCheckTime: Date.now(),
            signalStrength: signalStrength
          });
          
          resolve(this._networkState);
        },
        fail: err => {
          console.error('[NetworkMonitor] 手动获取网络状态失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 更新网络状态并触发回调
   * @param {Object} newState 新的网络状态
   * @private
   */
  _updateNetworkState(newState) {
    const prevState = { ...this._networkState };
    
    // 更新状态
    this._networkState = {
      ...this._networkState,
      ...newState
    };
    
    // 检查是否有变化
    const hasChanged = (
      prevState.connected !== this._networkState.connected ||
      prevState.networkType !== this._networkState.networkType ||
      prevState.signalStrength !== this._networkState.signalStrength
    );
    
    // 如果有变化，触发回调
    if (hasChanged) {
      this._notifyChangeListeners();
    }
  },
  
  /**
   * 通知所有变化监听器
   * @private
   */
  _notifyChangeListeners() {
    // 复制当前状态进行传递
    const state = { ...this._networkState };
    
    // 调用所有回调
    this._changeCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (err) {
        console.error('[NetworkMonitor] 执行网络变化回调出错:', err);
      }
    });
  },
  
  /**
   * 注册网络变化监听器
   * @param {Function} callback 回调函数
   * @returns {Function} 取消监听的函数
   */
  onNetworkChange(callback) {
    if (typeof callback !== 'function') {
      console.error('[NetworkMonitor] 网络变化回调必须是函数');
      return () => {};
    }
    
    // 确保监控已初始化
    if (!this._isInitialized) {
      this.init();
    }
    
    // 添加到回调列表
    this._changeCallbacks.push(callback);
    
    // 立即用当前状态调用一次
    try {
      callback({ ...this._networkState });
    } catch (err) {
      console.error('[NetworkMonitor] 执行初始网络回调出错:', err);
    }
    
    // 返回取消监听的函数
    return () => {
      this._changeCallbacks = this._changeCallbacks.filter(cb => cb !== callback);
    };
  },
  
  /**
   * 获取当前网络状态
   * @returns {Object} 网络状态
   */
  getNetworkState() {
    // 确保监控已初始化
    if (!this._isInitialized) {
      this.init();
    }
    
    return { ...this._networkState };
  },
  
  /**
   * 检查网络是否可用
   * @returns {Boolean} 网络是否可用
   */
  isNetworkAvailable() {
    return this._networkState.connected;
  },
  
  /**
   * 检查是否是WiFi网络
   * @returns {Boolean} 是否是WiFi
   */
  isWifi() {
    return this._networkState.networkType === 'wifi';
  },
  
  /**
   * 检查是否是移动网络
   * @returns {Boolean} 是否是移动网络
   */
  isMobileNetwork() {
    const mobileTypes = ['2g', '3g', '4g', '5g'];
    return mobileTypes.includes(this._networkState.networkType);
  },
  
  /**
   * 获取网络类型
   * @returns {String} 网络类型
   */
  getNetworkType() {
    return this._networkState.networkType;
  },
  
  /**
   * 检查是否是弱网环境
   * @returns {Boolean} 是否是弱网环境
   */
  isWeakNetwork() {
    // 离线或2G被视为弱网环境
    return !this._networkState.connected || 
           this._networkState.networkType === '2g' || 
           this._networkState.signalStrength === 'weak';
  },
  
  /**
   * 销毁监控
   */
  destroy() {
    // 停止定时检查
    this._stopPeriodicCheck();
    
    // 清空回调列表
    this._changeCallbacks = [];
    
    // 重置状态
    this._isInitialized = false;
    
    console.log('[NetworkMonitor] 网络监控已销毁');
  }
};

module.exports = NetworkMonitor; 