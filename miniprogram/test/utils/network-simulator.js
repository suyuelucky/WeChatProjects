/**
 * 网络模拟器工具
 * 用于模拟各种网络环境条件，如延迟、丢包、网络中断等
 * 
 * 创建时间: 2025-04-09 20:34:18
 * 创建者: Claude AI 3.7 Sonnet
 */

// 导入必要的模块
const EventEmitter = require('events');

/**
 * 网络模拟器类
 * 通过拦截和模拟微信小程序的网络相关API，实现对网络环境的模拟
 */
class NetworkSimulator extends EventEmitter {
  constructor() {
    super();
    
    // 存储原始的网络API
    this._originalWxRequest = wx.request;
    this._originalWxDownloadFile = wx.downloadFile;
    this._originalWxOnNetworkStatusChange = wx.onNetworkStatusChange;
    this._originalGetNetworkType = wx.getNetworkType;
    
    // 当前的网络状态
    this._networkProfile = {
      type: 'wifi',      // 网络类型: wifi, 4g, 3g, 2g, unknown, none
      latency: 0,        // 延迟(毫秒)
      packetLoss: 0,     // 丢包率(0-1)
      downloadSpeed: 0,  // 下载速度限制(KB/s), 0表示不限制
      isConnected: true  // 网络是否连接
    };
    
    // 网络事件监听器列表
    this._networkStatusChangeCallbacks = [];
    
    // 初始化模拟器
    this._setupNetworkSimulation();
  }
  
  /**
   * 设置网络环境配置
   * @param {Object} profile - 网络环境配置
   * @param {string} profile.type - 网络类型: wifi, 4g, 3g, 2g, unknown, none
   * @param {number} profile.latency - 延迟(毫秒)
   * @param {number} profile.packetLoss - 丢包率(0-1)
   * @param {number} profile.downloadSpeed - 下载速度限制(KB/s), 0表示不限制
   */
  setNetworkProfile(profile) {
    const prevConnected = this._networkProfile.isConnected;
    const wasDisconnected = prevConnected === false && profile.type !== 'none';
    
    this._networkProfile = {
      ...this._networkProfile,
      ...profile,
      isConnected: profile.type !== 'none'
    };
    
    console.log(`[NetworkSimulator] 网络环境设置为: ${JSON.stringify(this._networkProfile)}`);
    
    // 如果网络连接状态发生变化，触发网络状态变化事件
    if (prevConnected !== this._networkProfile.isConnected || wasDisconnected) {
      this._notifyNetworkStatusChange();
    }
    
    return this;
  }
  
  /**
   * 断开网络连接
   */
  disconnectNetwork() {
    if (this._networkProfile.isConnected) {
      this._networkProfile.isConnected = false;
      this._networkProfile.type = 'none';
      
      console.log('[NetworkSimulator] 网络已断开');
      
      // 触发网络状态变化事件
      this._notifyNetworkStatusChange();
    }
    
    return this;
  }
  
  /**
   * 恢复网络连接
   * @param {string} type - 恢复后的网络类型，默认为'wifi'
   */
  reconnectNetwork(type = 'wifi') {
    if (!this._networkProfile.isConnected) {
      this._networkProfile.isConnected = true;
      this._networkProfile.type = type;
      
      console.log(`[NetworkSimulator] 网络已恢复，类型: ${type}`);
      
      // 触发网络状态变化事件
      this._notifyNetworkStatusChange();
    }
    
    return this;
  }
  
  /**
   * 设置网络延迟
   * @param {number} latency - 延迟(毫秒)
   */
  setLatency(latency) {
    this._networkProfile.latency = latency;
    console.log(`[NetworkSimulator] 网络延迟设置为: ${latency}ms`);
    return this;
  }
  
  /**
   * 设置丢包率
   * @param {number} packetLoss - 丢包率(0-1)
   */
  setPacketLoss(packetLoss) {
    this._networkProfile.packetLoss = Math.max(0, Math.min(1, packetLoss));
    console.log(`[NetworkSimulator] 丢包率设置为: ${this._networkProfile.packetLoss}`);
    return this;
  }
  
  /**
   * 设置下载速度限制
   * @param {number} speed - 下载速度(KB/s), 0表示不限制
   */
  setDownloadSpeed(speed) {
    this._networkProfile.downloadSpeed = Math.max(0, speed);
    console.log(`[NetworkSimulator] 下载速度限制为: ${this._networkProfile.downloadSpeed}KB/s`);
    return this;
  }
  
  /**
   * 获取当前网络环境配置
   * @returns {Object} 当前网络环境配置
   */
  getNetworkProfile() {
    return { ...this._networkProfile };
  }
  
  /**
   * 设置网络模拟
   * 通过重写微信小程序的网络API来实现网络模拟
   */
  _setupNetworkSimulation() {
    this._setupRequestSimulation();
    this._setupDownloadFileSimulation();
    this._setupNetworkStatusChangeSimulation();
    this._setupGetNetworkTypeSimulation();
  }
  
  /**
   * 模拟网络请求
   */
  _setupRequestSimulation() {
    const self = this;
    
    // 重写wx.request
    wx.request = function(options) {
      // 检查网络是否连接
      if (!self._networkProfile.isConnected) {
        console.log('[NetworkSimulator] 网络断开，请求失败:', options.url);
        
        setTimeout(() => {
          if (typeof options.fail === 'function') {
            options.fail({
              errMsg: 'request:fail network disconnected'
            });
          }
          
          if (typeof options.complete === 'function') {
            options.complete({
              errMsg: 'request:fail network disconnected'
            });
          }
        }, 0);
        
        // 返回一个模拟的请求对象
        return {
          abort: function() {}
        };
      }
      
      // 模拟丢包
      if (Math.random() < self._networkProfile.packetLoss) {
        console.log('[NetworkSimulator] 模拟丢包，请求失败:', options.url);
        
        setTimeout(() => {
          if (typeof options.fail === 'function') {
            options.fail({
              errMsg: 'request:fail packet loss'
            });
          }
          
          if (typeof options.complete === 'function') {
            options.complete({
              errMsg: 'request:fail packet loss'
            });
          }
        }, self._networkProfile.latency);
        
        // 返回一个模拟的请求对象
        return {
          abort: function() {}
        };
      }
      
      // 创建原始请求的选项副本
      const originalOptions = { ...options };
      
      // 重写成功回调
      if (typeof options.success === 'function') {
        const originalSuccess = options.success;
        options.success = function(res) {
          // 模拟延迟后调用原始成功回调
          setTimeout(() => {
            originalSuccess(res);
          }, self._networkProfile.latency);
        };
      }
      
      // 重写失败回调
      if (typeof options.fail === 'function') {
        const originalFail = options.fail;
        options.fail = function(res) {
          // 模拟延迟后调用原始失败回调
          setTimeout(() => {
            originalFail(res);
          }, self._networkProfile.latency);
        };
      }
      
      // 调用原始的wx.request
      return self._originalWxRequest(options);
    };
  }
  
  /**
   * 模拟文件下载
   */
  _setupDownloadFileSimulation() {
    const self = this;
    
    // 重写wx.downloadFile
    wx.downloadFile = function(options) {
      // 检查网络是否连接
      if (!self._networkProfile.isConnected) {
        console.log('[NetworkSimulator] 网络断开，下载失败:', options.url);
        
        setTimeout(() => {
          if (typeof options.fail === 'function') {
            options.fail({
              errMsg: 'downloadFile:fail network disconnected'
            });
          }
          
          if (typeof options.complete === 'function') {
            options.complete({
              errMsg: 'downloadFile:fail network disconnected'
            });
          }
        }, 0);
        
        // 返回一个模拟的下载任务对象
        return {
          abort: function() {},
          onProgressUpdate: function() {}
        };
      }
      
      // 模拟丢包
      if (Math.random() < self._networkProfile.packetLoss) {
        console.log('[NetworkSimulator] 模拟丢包，下载失败:', options.url);
        
        setTimeout(() => {
          if (typeof options.fail === 'function') {
            options.fail({
              errMsg: 'downloadFile:fail packet loss'
            });
          }
          
          if (typeof options.complete === 'function') {
            options.complete({
              errMsg: 'downloadFile:fail packet loss'
            });
          }
        }, self._networkProfile.latency);
        
        // 返回一个模拟的下载任务对象
        return {
          abort: function() {},
          onProgressUpdate: function() {}
        };
      }
      
      // 创建原始下载选项的副本
      const originalOptions = { ...options };
      
      // 重写成功回调
      if (typeof options.success === 'function') {
        const originalSuccess = options.success;
        options.success = function(res) {
          // 模拟延迟后调用原始成功回调
          setTimeout(() => {
            originalSuccess(res);
          }, self._networkProfile.latency);
        };
      }
      
      // 重写失败回调
      if (typeof options.fail === 'function') {
        const originalFail = options.fail;
        options.fail = function(res) {
          // 模拟延迟后调用原始失败回调
          setTimeout(() => {
            originalFail(res);
          }, self._networkProfile.latency);
        };
      }
      
      // 调用原始的wx.downloadFile
      const downloadTask = self._originalWxDownloadFile(options);
      
      // 如果设置了下载速度限制，模拟下载速度
      if (self._networkProfile.downloadSpeed > 0 && downloadTask.onProgressUpdate) {
        const originalOnProgressUpdate = downloadTask.onProgressUpdate;
        
        // 重写下载进度更新方法
        downloadTask.onProgressUpdate = function(callback) {
          return originalOnProgressUpdate.call(downloadTask, (res) => {
            // 基于下载速度限制计算模拟的进度
            const originalProgress = res.progress;
            const totalBytes = res.totalBytesExpectedToWrite;
            const downloadedBytes = (originalProgress / 100) * totalBytes;
            
            // 计算基于速度限制的下载时间
            const totalTimeNeeded = totalBytes / (self._networkProfile.downloadSpeed * 1024);
            const elapsedTime = downloadedBytes / (self._networkProfile.downloadSpeed * 1024);
            
            // 创建一个新的进度对象
            const simulatedProgress = { ...res };
            
            // 如果有下载速度限制，调整进度
            if (elapsedTime < totalTimeNeeded) {
              simulatedProgress.progress = Math.min(
                originalProgress,
                (elapsedTime / totalTimeNeeded) * 100
              );
            }
            
            callback(simulatedProgress);
          });
        };
      }
      
      return downloadTask;
    };
  }
  
  /**
   * 模拟网络状态变化
   */
  _setupNetworkStatusChangeSimulation() {
    const self = this;
    
    // 重写wx.onNetworkStatusChange
    wx.onNetworkStatusChange = function(callback) {
      self._networkStatusChangeCallbacks.push(callback);
      return self._originalWxOnNetworkStatusChange(callback);
    };
    
    // 重写wx.offNetworkStatusChange
    wx.offNetworkStatusChange = function(callback) {
      const index = self._networkStatusChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        self._networkStatusChangeCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * 模拟获取网络类型
   */
  _setupGetNetworkTypeSimulation() {
    const self = this;
    
    // 重写wx.getNetworkType
    wx.getNetworkType = function(options) {
      const networkType = self._networkProfile.isConnected ? 
        self._networkProfile.type : 'none';
      
      setTimeout(() => {
        if (typeof options.success === 'function') {
          options.success({
            networkType: networkType,
            isConnected: self._networkProfile.isConnected
          });
        }
        
        if (typeof options.complete === 'function') {
          options.complete({
            networkType: networkType,
            isConnected: self._networkProfile.isConnected
          });
        }
      }, self._networkProfile.latency);
    };
  }
  
  /**
   * 通知所有注册的网络状态变化回调
   */
  _notifyNetworkStatusChange() {
    const statusData = {
      isConnected: this._networkProfile.isConnected,
      networkType: this._networkProfile.isConnected ? this._networkProfile.type : 'none'
    };
    
    // 通知所有注册的回调
    this._networkStatusChangeCallbacks.forEach(callback => {
      setTimeout(() => {
        try {
          callback(statusData);
        } catch (error) {
          console.error('[NetworkSimulator] 网络状态变化回调执行错误:', error);
        }
      }, 0);
    });
    
    // 触发事件
    this.emit('networkStatusChange', statusData);
  }
  
  /**
   * 还原所有重写的API，恢复原始行为
   */
  restore() {
    // 恢复原始API
    wx.request = this._originalWxRequest;
    wx.downloadFile = this._originalWxDownloadFile;
    wx.onNetworkStatusChange = this._originalWxOnNetworkStatusChange;
    wx.getNetworkType = this._originalGetNetworkType;
    
    // 清空回调列表
    this._networkStatusChangeCallbacks = [];
    
    console.log('[NetworkSimulator] 已还原所有网络API到原始状态');
    
    return this;
  }
}

module.exports = NetworkSimulator; 