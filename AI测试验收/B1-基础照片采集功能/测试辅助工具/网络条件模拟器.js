/**
 * B1基础照片采集功能 - 网络条件模拟器
 * 
 * 该工具用于模拟各种网络状态和错误情况，辅助进行极端网络测试
 * 使用方法：导入并替换原网络请求实现进行测试
 * 
 * 版本: 1.0
 * 创建日期: 2024-04-06
 * 创建者: 资方测试团队
 */

// 模拟网络状态枚举
const NetworkState = {
  NORMAL: 'normal',           // 正常网络
  SLOW: 'slow',               // 低速网络
  UNSTABLE: 'unstable',       // 不稳定网络(随机丢包)
  TIMEOUT: 'timeout',         // 超时
  OFFLINE: 'offline',         // 离线
  ERROR: 'error'              // 错误响应
};

// 错误类型枚举
const ErrorType = {
  TIMEOUT: 'timeout',         // 超时错误
  NETWORK: 'network',         // 网络错误
  SERVER: 'server',           // 服务器错误
  UNKNOWN: 'unknown'          // 未知错误
};

/**
 * 模拟网络请求工具
 * 替代wx.request等网络API进行测试
 */
class NetworkMocker {
  constructor(options = {}) {
    // 默认配置
    this.config = {
      networkState: NetworkState.NORMAL,  // 网络状态
      errorProbability: 0,                // 错误概率(0-100)
      timeoutDuration: 15000,             // 超时时间(毫秒)
      minResponseTime: 100,               // 最小响应时间(毫秒)
      maxResponseTime: 500,               // 最大响应时间(毫秒)
      uploadSpeed: 500,                   // 上传速度(KB/s)
      downloadSpeed: 1000,                // 下载速度(KB/s)
      packetLossRate: 0,                  // 丢包率(0-100)
      enableLogging: true                 // 是否启用日志
    };
    
    // 更新配置
    Object.assign(this.config, options);
    
    // 模拟请求队列
    this.requestQueue = [];
    
    // 请求计数器
    this.requestCount = 0;
    
    // 日志前缀
    this.logPrefix = '[网络模拟器]';
  }
  
  /**
   * 模拟网络请求
   * @param {Object} options 请求选项，类似wx.request的选项
   */
  request(options) {
    const requestId = ++this.requestCount;
    
    // 创建模拟请求对象
    const mockRequest = {
      id: requestId,
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      startTime: Date.now(),
      size: this._estimateRequestSize(options.data),
      aborted: false,
      timer: null
    };
    
    // 日志
    this._log(`开始请求 #${requestId}: ${mockRequest.method} ${mockRequest.url}`);
    this._log(`请求大小: ${mockRequest.size}KB`);
    
    // 添加到队列
    this.requestQueue.push(mockRequest);
    
    // 离线状态直接返回网络错误
    if (this.config.networkState === NetworkState.OFFLINE) {
      this._log(`请求 #${requestId} 失败: 网络离线`);
      setTimeout(() => {
        this._removeFromQueue(requestId);
        if (options.fail) {
          options.fail({
            errMsg: 'request:fail 网络连接断开'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'request:fail 网络连接断开'
          });
        }
      }, 100);
      
      return {
        abort: () => this._abortRequest(requestId)
      };
    }
    
    // 随机错误
    if (Math.random() * 100 < this.config.errorProbability) {
      const errors = [
        { type: ErrorType.TIMEOUT, msg: 'request:fail timeout' },
        { type: ErrorType.NETWORK, msg: 'request:fail 网络异常' },
        { type: ErrorType.SERVER, msg: 'request:fail 服务器异常' }
      ];
      
      const randomError = errors[Math.floor(Math.random() * errors.length)];
      
      this._log(`请求 #${requestId} 随机错误: ${randomError.type}`);
      
      // 超时错误需要更长的延迟
      const errorDelay = randomError.type === ErrorType.TIMEOUT 
        ? this.config.timeoutDuration 
        : this._getRandomResponseTime();
      
      mockRequest.timer = setTimeout(() => {
        this._removeFromQueue(requestId);
        if (options.fail) {
          options.fail({
            errMsg: randomError.msg
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: randomError.msg
          });
        }
      }, errorDelay);
      
      return {
        abort: () => this._abortRequest(requestId)
      };
    }
    
    // 处理不同的网络状态
    let responseTime = 0;
    
    switch (this.config.networkState) {
      case NetworkState.SLOW:
        // 慢网络，计算基于数据大小的响应时间
        responseTime = this._calculateTransferTime(mockRequest.size);
        break;
      
      case NetworkState.UNSTABLE:
        // 不稳定网络，模拟丢包和重传
        if (Math.random() * 100 < this.config.packetLossRate) {
          // 模拟丢包后重试
          responseTime = this._getRandomResponseTime() * 2;
          this._log(`请求 #${requestId} 丢包重传，延迟响应`);
        } else {
          responseTime = this._getRandomResponseTime();
        }
        break;
      
      case NetworkState.TIMEOUT:
        // 超时网络，直接触发超时
        this._log(`请求 #${requestId} 超时: ${this.config.timeoutDuration}ms`);
        
        mockRequest.timer = setTimeout(() => {
          this._removeFromQueue(requestId);
          if (options.fail) {
            options.fail({
              errMsg: 'request:fail timeout'
            });
          }
          if (options.complete) {
            options.complete({
              errMsg: 'request:fail timeout'
            });
          }
        }, this.config.timeoutDuration);
        
        return {
          abort: () => this._abortRequest(requestId)
        };
      
      case NetworkState.ERROR:
        // 错误网络，返回服务器错误
        responseTime = this._getRandomResponseTime();
        
        mockRequest.timer = setTimeout(() => {
          this._removeFromQueue(requestId);
          
          // 模拟服务器错误响应
          const response = {
            statusCode: 500,
            data: { error: 'Internal Server Error' },
            errMsg: 'request:ok'
          };
          
          this._log(`请求 #${requestId} 服务器错误: 500`);
          
          if (options.success) {
            options.success(response);
          }
          if (options.complete) {
            options.complete(response);
          }
        }, responseTime);
        
        return {
          abort: () => this._abortRequest(requestId)
        };
      
      case NetworkState.NORMAL:
      default:
        // 正常网络
        responseTime = this._getRandomResponseTime();
        break;
    }
    
    this._log(`请求 #${requestId} 预计响应时间: ${responseTime}ms`);
    
    // 模拟成功响应
    mockRequest.timer = setTimeout(() => {
      this._removeFromQueue(requestId);
      
      // 创建模拟响应
      const mockResponse = this._createMockResponse(options);
      
      this._log(`请求 #${requestId} 完成，状态码: ${mockResponse.statusCode}`);
      
      if (options.success) {
        options.success(mockResponse);
      }
      if (options.complete) {
        options.complete(mockResponse);
      }
    }, responseTime);
    
    // 返回请求对象
    return {
      abort: () => this._abortRequest(requestId)
    };
  }
  
  /**
   * 模拟上传文件
   * @param {Object} options 上传选项，类似wx.uploadFile的选项
   */
  uploadFile(options) {
    const requestId = ++this.requestCount;
    
    // 获取文件大小（默认假设为1MB，实际应用中应该获取真实大小）
    const fileSize = options.fileSize || 1024;
    
    // 创建模拟请求对象
    const mockRequest = {
      id: requestId,
      url: options.url,
      filePath: options.filePath,
      name: options.name,
      startTime: Date.now(),
      size: fileSize,
      aborted: false,
      timer: null,
      progressTimer: null,
      progress: 0
    };
    
    this._log(`开始上传文件 #${requestId}: ${mockRequest.filePath} 到 ${mockRequest.url}`);
    this._log(`文件大小: ${mockRequest.size}KB`);
    
    // 添加到队列
    this.requestQueue.push(mockRequest);
    
    // 离线状态直接返回网络错误
    if (this.config.networkState === NetworkState.OFFLINE) {
      this._log(`上传 #${requestId} 失败: 网络离线`);
      setTimeout(() => {
        this._removeFromQueue(requestId);
        if (options.fail) {
          options.fail({
            errMsg: 'uploadFile:fail 网络连接断开'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'uploadFile:fail 网络连接断开'
          });
        }
      }, 100);
      
      return {
        abort: () => this._abortRequest(requestId),
        onProgressUpdate: () => {}
      };
    }
    
    // 根据网络状态计算上传时间
    let uploadTime = this._calculateTransferTime(fileSize, true);
    let progressInterval = 200; // 进度更新间隔
    
    // 不稳定网络可能导致上传暂停
    const unstableCallback = options.onProgressUpdate ? (progress) => {
      if (this.config.networkState === NetworkState.UNSTABLE && 
          Math.random() * 100 < this.config.packetLossRate) {
        // 模拟上传暂停
        this._log(`上传 #${requestId} 暂停于 ${progress}%`);
        return false;
      }
      return true;
    } : null;
    
    // 模拟进度更新
    let onProgressUpdateCallback = null;
    
    // 进度更新函数
    const simulateProgress = () => {
      if (mockRequest.aborted) return;
      
      mockRequest.progress += (100 * progressInterval) / uploadTime;
      mockRequest.progress = Math.min(99, mockRequest.progress); // 最大到99%
      
      if (onProgressUpdateCallback) {
        const shouldContinue = unstableCallback ? 
          unstableCallback(mockRequest.progress) : true;
        
        onProgressUpdateCallback({
          progress: mockRequest.progress,
          totalBytesSent: Math.floor(fileSize * mockRequest.progress / 100),
          totalBytesExpectedToSend: fileSize
        });
        
        if (!shouldContinue) {
          // 如果网络不稳定导致暂停，延迟后继续
          setTimeout(() => {
            if (!mockRequest.aborted) {
              this._log(`上传 #${requestId} 恢复`);
              mockRequest.progressTimer = setTimeout(simulateProgress, progressInterval);
            }
          }, 2000 + Math.random() * 3000);
          return;
        }
      }
      
      if (mockRequest.progress < 99) {
        mockRequest.progressTimer = setTimeout(simulateProgress, progressInterval);
      }
    };
    
    // 随机错误
    if (Math.random() * 100 < this.config.errorProbability) {
      // 开始模拟进度，但中途失败
      const failTime = Math.random() * uploadTime;
      
      if (options.onProgressUpdate) {
        mockRequest.progressTimer = setTimeout(simulateProgress, progressInterval);
      }
      
      mockRequest.timer = setTimeout(() => {
        this._log(`上传 #${requestId} 随机失败`);
        this._removeFromQueue(requestId);
        
        if (options.fail) {
          options.fail({
            errMsg: 'uploadFile:fail 网络异常'
          });
        }
        if (options.complete) {
          options.complete({
            errMsg: 'uploadFile:fail 网络异常'
          });
        }
      }, failTime);
      
      return {
        abort: () => this._abortRequest(requestId),
        onProgressUpdate: (callback) => {
          onProgressUpdateCallback = callback;
        }
      };
    }
    
    // 开始模拟进度
    if (options.onProgressUpdate) {
      mockRequest.progressTimer = setTimeout(simulateProgress, progressInterval);
    }
    
    // 模拟上传完成
    mockRequest.timer = setTimeout(() => {
      mockRequest.progress = 100;
      
      if (onProgressUpdateCallback) {
        onProgressUpdateCallback({
          progress: 100,
          totalBytesSent: fileSize,
          totalBytesExpectedToSend: fileSize
        });
      }
      
      this._log(`上传 #${requestId} 完成`);
      this._removeFromQueue(requestId);
      
      // 模拟服务器响应
      const response = {
        statusCode: 200,
        data: JSON.stringify({ url: `https://example.com/files/mock-${Date.now()}.jpg` }),
        errMsg: 'uploadFile:ok'
      };
      
      if (options.success) {
        options.success(response);
      }
      if (options.complete) {
        options.complete(response);
      }
    }, uploadTime);
    
    return {
      abort: () => this._abortRequest(requestId),
      onProgressUpdate: (callback) => {
        onProgressUpdateCallback = callback;
      }
    };
  }
  
  /**
   * 中止请求
   * @param {Number} requestId 请求ID
   */
  _abortRequest(requestId) {
    const index = this.requestQueue.findIndex(req => req.id === requestId);
    if (index === -1) return;
    
    const request = this.requestQueue[index];
    request.aborted = true;
    
    if (request.timer) {
      clearTimeout(request.timer);
      request.timer = null;
    }
    
    if (request.progressTimer) {
      clearTimeout(request.progressTimer);
      request.progressTimer = null;
    }
    
    this._log(`请求 #${requestId} 已中止`);
    this.requestQueue.splice(index, 1);
  }
  
  /**
   * 从队列中移除请求
   * @param {Number} requestId 请求ID
   */
  _removeFromQueue(requestId) {
    const index = this.requestQueue.findIndex(req => req.id === requestId);
    if (index !== -1) {
      this.requestQueue.splice(index, 1);
    }
  }
  
  /**
   * 创建模拟响应
   * @param {Object} options 请求选项
   * @returns {Object} 模拟响应对象
   */
  _createMockResponse(options) {
    // 基础响应对象
    const response = {
      statusCode: 200,
      errMsg: 'request:ok'
    };
    
    // 根据请求URL模拟不同响应
    const url = options.url.toLowerCase();
    
    if (url.includes('login') || url.includes('auth')) {
      response.data = {
        token: 'mock-token-' + Date.now(),
        userId: 'mock-user-123',
        expires: Date.now() + 86400000
      };
    } else if (url.includes('upload') || url.includes('photo')) {
      response.data = {
        fileId: 'mock-file-' + Date.now(),
        url: 'https://example.com/photos/mock.jpg',
        thumb: 'https://example.com/photos/mock-thumb.jpg'
      };
    } else if (url.includes('list') || url.includes('get')) {
      response.data = {
        items: [
          { id: 'mock-1', name: 'Mock Item 1' },
          { id: 'mock-2', name: 'Mock Item 2' },
          { id: 'mock-3', name: 'Mock Item 3' }
        ],
        total: 3,
        page: 1
      };
    } else {
      response.data = {
        success: true,
        message: 'Mock response for: ' + options.url
      };
    }
    
    return response;
  }
  
  /**
   * 计算传输时间
   * @param {Number} sizeKB 数据大小(KB)
   * @param {Boolean} isUpload 是否为上传 
   * @returns {Number} 计算的传输时间(毫秒)
   */
  _calculateTransferTime(sizeKB, isUpload = false) {
    const speed = isUpload ? this.config.uploadSpeed : this.config.downloadSpeed;
    let time = (sizeKB / speed) * 1000; // 转换为毫秒
    
    // 根据网络状态调整时间
    switch (this.config.networkState) {
      case NetworkState.SLOW:
        time *= 3; // 慢速网络传输慢3倍
        break;
      case NetworkState.UNSTABLE:
        // 不稳定网络有额外延迟
        time += Math.random() * 2000;
        break;
    }
    
    // 添加基础延迟
    time += this._getRandomResponseTime();
    
    return Math.floor(time);
  }
  
  /**
   * 获取随机响应时间
   * @returns {Number} 响应时间(毫秒)
   */
  _getRandomResponseTime() {
    return this.config.minResponseTime + 
           Math.random() * (this.config.maxResponseTime - this.config.minResponseTime);
  }
  
  /**
   * 估算请求数据大小
   * @param {Any} data 请求数据
   * @returns {Number} 估算大小(KB)
   */
  _estimateRequestSize(data) {
    if (!data) return 1;
    
    try {
      const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
      // 假设1个字符约等于1字节，转换为KB
      return Math.max(1, Math.ceil(jsonStr.length / 1024));
    } catch (e) {
      return 5; // 默认5KB
    }
  }
  
  /**
   * 输出日志
   * @param {String} message 日志消息
   */
  _log(message) {
    if (this.config.enableLogging) {
      console.log(`${this.logPrefix} ${message}`);
    }
  }
  
  /**
   * 设置网络状态
   * @param {String} state 网络状态
   */
  setNetworkState(state) {
    if (Object.values(NetworkState).includes(state)) {
      this.config.networkState = state;
      this._log(`网络状态已切换: ${state}`);
      return true;
    }
    return false;
  }
  
  /**
   * 设置错误概率
   * @param {Number} probability 错误概率(0-100)
   */
  setErrorProbability(probability) {
    this.config.errorProbability = Math.max(0, Math.min(100, probability));
    this._log(`错误概率已设置: ${this.config.errorProbability}%`);
  }
  
  /**
   * 设置丢包率
   * @param {Number} rate 丢包率(0-100)
   */
  setPacketLossRate(rate) {
    this.config.packetLossRate = Math.max(0, Math.min(100, rate));
    this._log(`丢包率已设置: ${this.config.packetLossRate}%`);
  }
  
  /**
   * 设置网络速度
   * @param {Number} uploadSpeed 上传速度(KB/s)
   * @param {Number} downloadSpeed 下载速度(KB/s)
   */
  setNetworkSpeed(uploadSpeed, downloadSpeed) {
    if (uploadSpeed > 0) {
      this.config.uploadSpeed = uploadSpeed;
    }
    if (downloadSpeed > 0) {
      this.config.downloadSpeed = downloadSpeed;
    }
    this._log(`网络速度已设置: 上传=${this.config.uploadSpeed}KB/s, 下载=${this.config.downloadSpeed}KB/s`);
  }
  
  /**
   * 模拟网络中断
   * @param {Number} duration 中断持续时间(毫秒)，0表示永久中断
   */
  simulateNetworkDisconnection(duration = 0) {
    const previousState = this.config.networkState;
    this.config.networkState = NetworkState.OFFLINE;
    this._log(`网络已断开连接${duration ? '，持续' + duration + 'ms' : ''}`);
    
    if (duration > 0) {
      setTimeout(() => {
        this.config.networkState = previousState;
        this._log(`网络已恢复: ${previousState}`);
      }, duration);
    }
  }
  
  /**
   * 获取当前网络状态配置
   * @returns {Object} 网络状态配置
   */
  getNetworkConfig() {
    return { ...this.config };
  }
  
  /**
   * 获取当前请求队列
   * @returns {Array} 请求队列
   */
  getRequestQueue() {
    return [...this.requestQueue];
  }
}

// 导出网络模拟器和状态枚举
module.exports = {
  NetworkMocker,
  NetworkState,
  ErrorType
}; 