/**
 * 网络波动模拟器
 * 创建日期: 2025-04-13 17:00:15
 * 创建者: Claude AI 3.7 Sonnet
 * 
 * 用于模拟各种网络状况的工具，可以模拟：
 * - 网络延迟
 * - 随机超时
 * - 网络断开和重连
 * - 网络类型切换
 * - 请求失败
 */

/**
 * 网络波动模拟器类
 */
class NetworkFluctuationSimulator {
  /**
   * 构造函数
   * @param {Object} options 配置选项
   */
  constructor(options = {}) {
    // 默认配置
    this.options = {
      // 超时百分比 (0-100)
      TIMEOUT_PERCENTAGE: options.TIMEOUT_PERCENTAGE || 20,
      
      // 慢响应百分比 (0-100)
      SLOW_RESPONSE_PERCENTAGE: options.SLOW_RESPONSE_PERCENTAGE || 30,
      
      // 最大延迟时间 (ms)
      MAX_DELAY: options.MAX_DELAY || 5000,
      
      // 断网频率 (ms)，0表示不断网
      DISCONNECT_INTERVAL: options.DISCONNECT_INTERVAL || 0,
      
      // 重连延迟 (ms)
      RECONNECT_DELAY: options.RECONNECT_DELAY || 2000,
      
      // 随机错误率 (0-1)
      RANDOM_ERROR_RATE: options.RANDOM_ERROR_RATE || 0.1
    };
    
    // 状态
    this.state = {
      isConnected: true,
      networkType: 'wifi',
      running: false,
      disconnectTimer: null,
      originalXHR: null,
      originalFetch: null,
      originalWxRequest: null
    };
    
    // 钩子函数
    this.hooks = {
      onNetworkChange: null,
      onRequest: null,
      onResponse: null,
      onError: null
    };
  }
  
  /**
   * 启动网络波动模拟
   */
  start() {
    if (this.state.running) {
      console.log('网络波动模拟器已经在运行');
      return;
    }
    
    console.log('启动网络波动模拟器');
    this.state.running = true;
    
    // 初始设置为连接状态
    this.state.isConnected = true;
    
    // 保存原始请求函数
    if (typeof wx !== 'undefined') {
      this.state.originalWxRequest = wx.request;
      this._mockWxRequest();
    }
    
    // 如果设置了断网间隔，启动断网定时器
    if (this.options.DISCONNECT_INTERVAL > 0) {
      this._startDisconnectTimer();
    }
    
    // 触发网络状态变化事件
    this._emitNetworkChange();
  }
  
  /**
   * 停止网络波动模拟
   */
  stop() {
    if (!this.state.running) {
      console.log('网络波动模拟器未运行');
      return;
    }
    
    console.log('停止网络波动模拟器');
    this.state.running = false;
    
    // 恢复原始请求函数
    if (typeof wx !== 'undefined' && this.state.originalWxRequest) {
      wx.request = this.state.originalWxRequest;
      this.state.originalWxRequest = null;
    }
    
    // 清除断网定时器
    if (this.state.disconnectTimer) {
      clearTimeout(this.state.disconnectTimer);
      this.state.disconnectTimer = null;
    }
    
    // 恢复连接状态
    this.state.isConnected = true;
    
    // 触发网络状态变化事件
    this._emitNetworkChange();
  }
  
  /**
   * 设置网络类型
   * @param {String} networkType 网络类型 (wifi|5g|4g|3g|2g|none)
   */
  setNetworkType(networkType) {
    if (!this.state.running) {
      console.log('网络波动模拟器未运行，无法设置网络类型');
      return;
    }
    
    const validTypes = ['wifi', '5g', '4g', '3g', '2g', 'none'];
    if (validTypes.indexOf(networkType) === -1) {
      console.error('无效的网络类型：' + networkType);
      return;
    }
    
    console.log('设置网络类型：' + networkType);
    this.state.networkType = networkType;
    this.state.isConnected = networkType !== 'none';
    
    // 触发网络状态变化事件
    this._emitNetworkChange();
  }
  
  /**
   * 设置网络状态钩子
   * @param {Function} callback 网络状态变化回调
   */
  onNetworkChange(callback) {
    if (typeof callback === 'function') {
      this.hooks.onNetworkChange = callback;
    }
  }
  
  /**
   * 获取当前网络状态
   * @return {Object} 网络状态对象
   */
  getNetworkStatus() {
    return {
      isConnected: this.state.isConnected,
      networkType: this.state.networkType
    };
  }
  
  /**
   * 触发网络状态变化事件
   * @private
   */
  _emitNetworkChange() {
    const status = this.getNetworkStatus();
    
    console.log('网络状态变化：', 
               status.isConnected ? '已连接' : '已断开', 
               status.networkType);
    
    // 调用钩子函数
    if (typeof this.hooks.onNetworkChange === 'function') {
      this.hooks.onNetworkChange(status);
    }
    
    // 模拟微信小程序的网络状态变化事件
    if (typeof wx !== 'undefined') {
      setTimeout(() => {
        if (typeof wx.getNetworkType === 'function') {
          const networkChangeListeners = wx._networkChangeListeners || [];
          networkChangeListeners.forEach(listener => {
            try {
              listener({
                isConnected: status.isConnected,
                networkType: status.networkType
              });
            } catch (e) {
              console.error('执行网络变化监听器失败：', e);
            }
          });
        }
      }, 0);
    }
  }
  
  /**
   * 启动断网定时器
   * @private
   */
  _startDisconnectTimer() {
    if (this.state.disconnectTimer) {
      clearTimeout(this.state.disconnectTimer);
    }
    
    // 如果已经断网，等待重连
    if (!this.state.isConnected) {
      this.state.disconnectTimer = setTimeout(() => {
        if (!this.state.running) return;
        
        console.log('模拟网络重连');
        this.state.isConnected = true;
        this._emitNetworkChange();
        
        // 重新启动断网定时器
        this._startDisconnectTimer();
      }, this.options.RECONNECT_DELAY);
    } 
    // 如果已连接，等待断网
    else {
      this.state.disconnectTimer = setTimeout(() => {
        if (!this.state.running) return;
        
        console.log('模拟网络断开');
        this.state.isConnected = false;
        this._emitNetworkChange();
        
        // 重新启动断网定时器（重连）
        this._startDisconnectTimer();
      }, this.options.DISCONNECT_INTERVAL);
    }
  }
  
  /**
   * 模拟网络延迟
   * @param {Function} callback 延迟后的回调函数
   * @return {Boolean} 是否超时
   * @private
   */
  _simulateDelay(callback) {
    // 断网状态直接超时
    if (!this.state.isConnected) {
      console.log('网络已断开，请求超时');
      
      // 返回false表示不继续执行后续逻辑
      setTimeout(() => {
        if (typeof callback === 'function') {
          callback(false);
        }
      }, 500);
      
      return false;
    }
    
    // 计算是否超时
    const isTimeout = Math.random() * 100 < this.options.TIMEOUT_PERCENTAGE;
    
    // 计算延迟时间
    let delay = 0;
    
    if (isTimeout) {
      // 超时情况
      delay = this.options.MAX_DELAY;
      console.log('模拟请求超时：' + delay + 'ms');
    } else {
      // 根据网络类型和慢响应概率计算延迟
      const isSlow = Math.random() * 100 < this.options.SLOW_RESPONSE_PERCENTAGE;
      
      // 基础延迟
      let baseDelay = 100; // 默认WiFi
      
      // 根据网络类型调整基础延迟
      switch (this.state.networkType) {
        case '5g':
          baseDelay = 200;
          break;
        case '4g':
          baseDelay = 300;
          break;
        case '3g':
          baseDelay = 800;
          break;
        case '2g':
          baseDelay = 1500;
          break;
      }
      
      if (isSlow) {
        // 慢响应
        delay = baseDelay + Math.random() * (this.options.MAX_DELAY - baseDelay);
        console.log('模拟慢响应：' + Math.round(delay) + 'ms');
      } else {
        // 正常响应
        delay = baseDelay + Math.random() * 200;
        console.log('模拟正常响应：' + Math.round(delay) + 'ms');
      }
    }
    
    // 执行延迟
    setTimeout(() => {
      if (typeof callback === 'function') {
        callback(!isTimeout);
      }
    }, delay);
    
    return true;
  }
  
  /**
   * 模拟微信请求
   * @private
   */
  _mockWxRequest() {
    if (typeof wx === 'undefined') return;
    
    const that = this;
    const originalRequest = this.state.originalWxRequest;
    
    // 替换wx.request
    wx.request = function(options) {
      if (!that.state.running) {
        // 如果模拟器未运行，直接调用原始请求
        return originalRequest(options);
      }
      
      console.log('拦截wx.request请求：', options.url);
      
      // 触发请求钩子
      if (typeof that.hooks.onRequest === 'function') {
        that.hooks.onRequest(options);
      }
      
      // 模拟网络延迟
      that._simulateDelay((success) => {
        if (!success) {
          // 超时或断网
          if (typeof options.fail === 'function') {
            options.fail({
              errMsg: 'request:fail timeout'
            });
          }
          
          if (typeof options.complete === 'function') {
            options.complete({
              errMsg: 'request:fail timeout'
            });
          }
          
          // 触发错误钩子
          if (typeof that.hooks.onError === 'function') {
            that.hooks.onError({
              url: options.url,
              error: 'timeout'
            });
          }
          
          return;
        }
        
        // 随机错误
        if (Math.random() < that.options.RANDOM_ERROR_RATE) {
          if (typeof options.fail === 'function') {
            options.fail({
              errMsg: 'request:fail error'
            });
          }
          
          if (typeof options.complete === 'function') {
            options.complete({
              errMsg: 'request:fail error'
            });
          }
          
          // 触发错误钩子
          if (typeof that.hooks.onError === 'function') {
            that.hooks.onError({
              url: options.url,
              error: 'server error'
            });
          }
          
          return;
        }
        
        // 成功情况，调用原始请求
        const requestTask = originalRequest({
          ...options,
          success: (res) => {
            // 触发响应钩子
            if (typeof that.hooks.onResponse === 'function') {
              that.hooks.onResponse(res);
            }
            
            if (typeof options.success === 'function') {
              options.success(res);
            }
          }
        });
        
        return requestTask;
      });
    };
  }
}

module.exports = NetworkFluctuationSimulator; 