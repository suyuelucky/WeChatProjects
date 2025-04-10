/**
 * 增强版内存管理器
 * 解决B1模块内存泄漏问题，实现主动内存管理和临时文件清理
 * 
 * 创建时间: 2025-04-09 19:38:32
 * 创建者: Claude AI 3.7 Sonnet
 */

/**
 * 增强版内存管理器
 */
const EnhancedMemoryManager = {
  // 配置选项
  _config: {
    // 内存警告阈值(MB)
    warningThresholdMB: 120,
    
    // 内存临界阈值(MB)
    criticalThresholdMB: 150,
    
    // 临时文件自动清理阈值(MB)
    tempFileCleanThresholdMB: 50,
    
    // 监控间隔(ms)
    monitorInterval: 5000,
    
    // 是否启用调试日志
    debug: false
  },
  
  // 状态
  _state: {
    isMonitoring: false,
    monitorTimer: null,
    memoryWarningLevel: 0,
    tempFiles: [],
    totalTempFileSize: 0,
    lastCleanupTime: 0
  },
  
  /**
   * 初始化内存管理器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init: function(options) {
    // 合并配置
    if (options) {
      for (var key in options) {
        if (options.hasOwnProperty(key) && this._config.hasOwnProperty(key)) {
          this._config[key] = options[key];
        }
      }
    }
    
    // 重置状态
    this._state.isMonitoring = false;
    this._state.memoryWarningLevel = 0;
    this._state.tempFiles = [];
    this._state.totalTempFileSize = 0;
    this._state.lastCleanupTime = Date.now();
    
    // 设置内存警告监听
    this._setupMemoryWarningListener();
    
    // 启动监控
    this.startMonitoring();
    
    this._log('增强版内存管理器初始化完成');
    
    return this;
  },
  
  /**
   * 设置内存警告监听
   * @private
   */
  _setupMemoryWarningListener: function() {
    var that = this;
    
    if (typeof wx !== 'undefined' && wx.onMemoryWarning) {
      wx.onMemoryWarning(function(res) {
        var level = res.level || 0;
        that._state.memoryWarningLevel = level;
        
        that._log('收到内存警告，级别: ' + level, true);
        
        // 根据警告级别执行不同清理策略
        switch (level) {
          case 10: // iOS/Android低内存警告
            that.cleanupTempFiles(false);
            break;
          case 15: // iOS/Android中度内存警告
            that.cleanupTempFiles(true);
            break;
          case 20: // iOS/Android严重内存警告
            that.performEmergencyCleanup();
            break;
          default:
            that.cleanupTempFiles(false);
        }
      });
      
      this._log('内存警告监听已设置');
    } else {
      this._log('当前环境不支持内存警告监听', true);
    }
  },
  
  /**
   * 记录日志
   * @param {String} message 日志消息
   * @param {Boolean} force 是否强制输出
   * @private
   */
  _log: function(message, force) {
    if (this._config.debug || force === true) {
      console.log('[EnhancedMemoryManager] ' + message);
    }
  },
  
  /**
   * 开始内存监控
   * @returns {Object} 当前实例
   */
  startMonitoring: function() {
    var that = this;
    
    if (this._state.isMonitoring) {
      return this;
    }
    
    this._state.isMonitoring = true;
    
    // 清除可能存在的旧定时器
    if (this._state.monitorTimer) {
      clearInterval(this._state.monitorTimer);
    }
    
    // 创建新的监控定时器
    this._state.monitorTimer = setInterval(function() {
      that._checkMemoryUsage();
    }, this._config.monitorInterval);
    
    this._log('内存监控已启动，间隔: ' + this._config.monitorInterval + 'ms');
    
    // 立即执行一次检查
    this._checkMemoryUsage();
    
    return this;
  },
  
  /**
   * 停止内存监控
   * @returns {Object} 当前实例
   */
  stopMonitoring: function() {
    if (!this._state.isMonitoring) {
      return this;
    }
    
    this._state.isMonitoring = false;
    
    if (this._state.monitorTimer) {
      clearInterval(this._state.monitorTimer);
      this._state.monitorTimer = null;
    }
    
    this._log('内存监控已停止');
    
    return this;
  },
  
  /**
   * 检查内存使用情况
   * @private
   */
  _checkMemoryUsage: function() {
    var memoryInfo = this._getMemoryInfo();
    
    if (!memoryInfo.available) {
      this._log('无法获取内存信息', true);
      return;
    }
    
    // 检查是否超过警告阈值
    if (memoryInfo.jsHeapSizeMB >= this._config.warningThresholdMB) {
      this._log('内存使用超过警告阈值: ' + memoryInfo.jsHeapSizeMB + 'MB', true);
      
      // 执行临时文件清理
      this.cleanupTempFiles(memoryInfo.jsHeapSizeMB >= this._config.criticalThresholdMB);
    } 
    
    // 如果临时文件总大小超过阈值，也执行清理
    if (this._state.totalTempFileSize >= this._config.tempFileCleanThresholdMB * 1024 * 1024) {
      this._log('临时文件总大小超过阈值: ' + 
               (this._state.totalTempFileSize / (1024 * 1024)).toFixed(2) + 'MB', true);
      this.cleanupTempFiles(false);
    }
  },
  
  /**
   * 获取内存信息
   * @returns {Object} 内存信息
   * @private
   */
  _getMemoryInfo: function() {
    var result = {
      available: false,
      jsHeapSizeLimit: 0,
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      jsHeapSizeMB: 0,
      usedPercentage: 0
    };
    
    try {
      if (typeof wx !== 'undefined' && wx.getPerformance) {
        var performance = wx.getPerformance();
        var memory = performance && performance.memory;
        
        if (memory) {
          result.available = true;
          result.jsHeapSizeLimit = memory.jsHeapSizeLimit || 0;
          result.totalJSHeapSize = memory.totalJSHeapSize || 0;
          result.usedJSHeapSize = memory.usedJSHeapSize || 0;
          
          // 转换为MB并保留两位小数
          result.jsHeapSizeMB = parseFloat((result.usedJSHeapSize / (1024 * 1024)).toFixed(2));
          
          // 计算百分比
          if (result.jsHeapSizeLimit > 0) {
            result.usedPercentage = parseFloat((result.usedJSHeapSize / result.jsHeapSizeLimit * 100).toFixed(2));
          }
        }
      }
    } catch (e) {
      this._log('获取内存信息出错: ' + e.message, true);
    }
    
    return result;
  },
  
  /**
   * 注册临时文件
   * @param {String} filePath 文件路径
   * @param {Object} metadata 文件元数据
   * @returns {Object} 当前实例
   */
  registerTempFile: function(filePath, metadata) {
    if (!filePath) {
      return this;
    }
    
    // 获取文件大小
    var fileSize = 0;
    if (metadata && metadata.size) {
      fileSize = metadata.size;
    } else {
      try {
        var fileInfo = wx.getFileSystemManager().statSync(filePath);
        if (fileInfo && fileInfo.size) {
          fileSize = fileInfo.size;
        }
      } catch (e) {
        this._log('获取文件大小失败: ' + e.message);
      }
    }
    
    // 创建文件记录
    var fileRecord = {
      path: filePath,
      size: fileSize,
      timestamp: Date.now(),
      metadata: metadata || {},
      priority: metadata && metadata.priority ? metadata.priority : 'normal' // 优先级: 'low', 'normal', 'high'
    };
    
    // 添加到临时文件列表
    this._state.tempFiles.push(fileRecord);
    this._state.totalTempFileSize += fileSize;
    
    this._log('注册临时文件: ' + filePath + ', 大小: ' + (fileSize / 1024).toFixed(2) + 'KB');
    
    // 检查是否需要清理
    if (this._state.tempFiles.length > 50 || 
        this._state.totalTempFileSize > this._config.tempFileCleanThresholdMB * 1024 * 1024) {
      this.cleanupTempFiles(false);
    }
    
    return this;
  },
  
  /**
   * 取消注册临时文件
   * @param {String} filePath 文件路径
   * @param {Boolean} deleteFile 是否删除文件
   * @returns {Object} 当前实例
   */
  unregisterTempFile: function(filePath, deleteFile) {
    if (!filePath) {
      return this;
    }
    
    // 查找文件记录
    var fileIndex = -1;
    var fileRecord = null;
    
    for (var i = 0; i < this._state.tempFiles.length; i++) {
      if (this._state.tempFiles[i].path === filePath) {
        fileIndex = i;
        fileRecord = this._state.tempFiles[i];
        break;
      }
    }
    
    if (fileIndex >= 0) {
      // 减少总大小
      this._state.totalTempFileSize -= fileRecord.size;
      
      // 从列表中移除
      this._state.tempFiles.splice(fileIndex, 1);
      
      this._log('取消注册临时文件: ' + filePath);
      
      // 如果需要，删除文件
      if (deleteFile) {
        this._deleteTempFile(filePath);
      }
    }
    
    return this;
  },
  
  /**
   * 删除临时文件
   * @param {String} filePath 文件路径
   * @private
   */
  _deleteTempFile: function(filePath) {
    try {
      wx.getFileSystemManager().unlinkSync(filePath);
      this._log('已删除临时文件: ' + filePath);
    } catch (e) {
      this._log('删除临时文件失败: ' + e.message);
    }
  },
  
  /**
   * 清理临时文件
   * @param {Boolean} aggressive 是否积极清理
   * @returns {Promise} 清理结果
   */
  cleanupTempFiles: function(aggressive) {
    var that = this;
    
    return new Promise(function(resolve) {
      // 如果没有临时文件，直接返回
      if (that._state.tempFiles.length === 0) {
        resolve({ cleaned: 0, failed: 0, totalSize: 0 });
        return;
      }
      
      // 更新最后清理时间
      that._state.lastCleanupTime = Date.now();
      
      // 确定要删除的文件
      var filesToDelete = [];
      var remainingFiles = [];
      var currentTime = Date.now();
      var cleanupAge = aggressive ? 30 * 1000 : 5 * 60 * 1000; // 积极清理:30秒, 普通清理:5分钟
      
      // 按优先级和时间过滤文件
      that._state.tempFiles.forEach(function(file) {
        // 高优先级文件在非积极清理模式下保留
        if (file.priority === 'high' && !aggressive) {
          remainingFiles.push(file);
        } 
        // 普通和低优先级文件根据时间判断
        else if (currentTime - file.timestamp < cleanupAge && file.priority !== 'low') {
          remainingFiles.push(file);
        } 
        // 其他文件标记为删除
        else {
          filesToDelete.push(file);
        }
      });
      
      // 如果积极清理，且删除的文件不足总数的一半，删除更多
      if (aggressive && filesToDelete.length < that._state.tempFiles.length / 2) {
        // 按时间排序，保留最新的文件
        remainingFiles.sort(function(a, b) {
          return b.timestamp - a.timestamp;
        });
        
        // 根据情况，保留20-50%的文件
        var keepCount = aggressive ? 
                        Math.floor(that._state.tempFiles.length * 0.2) : 
                        Math.floor(that._state.tempFiles.length * 0.5);
        
        // 确保至少保留一个文件
        keepCount = Math.max(1, keepCount);
        
        // 多余的移入删除列表
        if (remainingFiles.length > keepCount) {
          filesToDelete = filesToDelete.concat(remainingFiles.splice(keepCount));
        }
      }
      
      that._log('开始清理临时文件: ' + filesToDelete.length + '个文件');
      
      // 统计变量
      var cleaned = 0;
      var failed = 0;
      var cleanedSize = 0;
      
      // 如果没有需要删除的文件，直接返回
      if (filesToDelete.length === 0) {
        that._state.tempFiles = remainingFiles;
        
        // 重新计算总大小
        that._state.totalTempFileSize = 0;
        remainingFiles.forEach(function(file) {
          that._state.totalTempFileSize += file.size;
        });
        
        resolve({ cleaned: 0, failed: 0, totalSize: 0 });
        return;
      }
      
      // 执行删除
      var fsm = wx.getFileSystemManager();
      
      // 使用Promise.all进行批量删除
      Promise.all(filesToDelete.map(function(file) {
        return new Promise(function(resolveDelete) {
          fsm.unlink({
            filePath: file.path,
            success: function() {
              cleaned++;
              cleanedSize += file.size;
              resolveDelete(true);
            },
            fail: function(err) {
              failed++;
              that._log('删除临时文件失败: ' + file.path + ', ' + err.errMsg);
              resolveDelete(false);
            }
          });
        });
      }))
      .then(function() {
        // 更新临时文件列表和总大小
        that._state.tempFiles = remainingFiles;
        
        // 重新计算总大小
        that._state.totalTempFileSize = 0;
        remainingFiles.forEach(function(file) {
          that._state.totalTempFileSize += file.size;
        });
        
        that._log('临时文件清理完成: 成功' + cleaned + '个, 失败' + failed + 
                 '个, 释放空间' + (cleanedSize / (1024 * 1024)).toFixed(2) + 'MB', true);
        
        resolve({
          cleaned: cleaned,
          failed: failed,
          totalSize: cleanedSize
        });
      });
    });
  },
  
  /**
   * 执行内存紧急释放
   * @returns {Promise} 释放结果
   */
  performEmergencyCleanup: function() {
    var that = this;
    
    this._log('执行内存紧急释放', true);
    
    return new Promise(function(resolve) {
      // 立即清理所有临时文件
      that.cleanupTempFiles(true)
        .then(function(result) {
          // 尝试触发系统垃圾回收
          if (typeof global !== 'undefined' && global.gc) {
            global.gc();
          }
          
          // 通知全局低内存模式
          var app = typeof getApp === 'function' ? getApp() : null;
          if (app) {
            app.globalData = app.globalData || {};
            app.globalData.lowMemoryMode = true;
            
            that._log('已启用全局低内存模式', true);
            
            // 如果有全局事件总线，发送通知
            if (app.eventBus && typeof app.eventBus.emit === 'function') {
              app.eventBus.emit('lowMemoryMode', { enabled: true });
            }
          }
          
          resolve({
            success: true,
            cleanedFiles: result,
            memoryMode: 'low'
          });
        });
    });
  },
  
  /**
   * 获取当前状态
   * @returns {Object} 状态信息
   */
  getStatus: function() {
    return {
      isMonitoring: this._state.isMonitoring,
      memoryWarningLevel: this._state.memoryWarningLevel,
      tempFileCount: this._state.tempFiles.length,
      tempFileTotalSize: this._state.totalTempFileSize,
      lastCleanupTime: this._state.lastCleanupTime,
      memoryInfo: this._getMemoryInfo()
    };
  }
};

module.exports = EnhancedMemoryManager; 
 * 增强版内存管理器
 * 解决B1模块内存泄漏问题，实现主动内存管理和临时文件清理
 * 
 * 创建时间: 2025-04-09 19:38:32
 * 创建者: Claude AI 3.7 Sonnet
 */

/**
 * 增强版内存管理器
 */
const EnhancedMemoryManager = {
  // 配置选项
  _config: {
    // 内存警告阈值(MB)
    warningThresholdMB: 120,
    
    // 内存临界阈值(MB)
    criticalThresholdMB: 150,
    
    // 临时文件自动清理阈值(MB)
    tempFileCleanThresholdMB: 50,
    
    // 监控间隔(ms)
    monitorInterval: 5000,
    
    // 是否启用调试日志
    debug: false
  },
  
  // 状态
  _state: {
    isMonitoring: false,
    monitorTimer: null,
    memoryWarningLevel: 0,
    tempFiles: [],
    totalTempFileSize: 0,
    lastCleanupTime: 0
  },
  
  /**
   * 初始化内存管理器
   * @param {Object} options 配置选项
   * @returns {Object} 当前实例
   */
  init: function(options) {
    // 合并配置
    if (options) {
      for (var key in options) {
        if (options.hasOwnProperty(key) && this._config.hasOwnProperty(key)) {
          this._config[key] = options[key];
        }
      }
    }
    
    // 重置状态
    this._state.isMonitoring = false;
    this._state.memoryWarningLevel = 0;
    this._state.tempFiles = [];
    this._state.totalTempFileSize = 0;
    this._state.lastCleanupTime = Date.now();
    
    // 设置内存警告监听
    this._setupMemoryWarningListener();
    
    // 启动监控
    this.startMonitoring();
    
    this._log('增强版内存管理器初始化完成');
    
    return this;
  },
  
  /**
   * 设置内存警告监听
   * @private
   */
  _setupMemoryWarningListener: function() {
    var that = this;
    
    if (typeof wx !== 'undefined' && wx.onMemoryWarning) {
      wx.onMemoryWarning(function(res) {
        var level = res.level || 0;
        that._state.memoryWarningLevel = level;
        
        that._log('收到内存警告，级别: ' + level, true);
        
        // 根据警告级别执行不同清理策略
        switch (level) {
          case 10: // iOS/Android低内存警告
            that.cleanupTempFiles(false);
            break;
          case 15: // iOS/Android中度内存警告
            that.cleanupTempFiles(true);
            break;
          case 20: // iOS/Android严重内存警告
            that.performEmergencyCleanup();
            break;
          default:
            that.cleanupTempFiles(false);
        }
      });
      
      this._log('内存警告监听已设置');
    } else {
      this._log('当前环境不支持内存警告监听', true);
    }
  },
  
  /**
   * 记录日志
   * @param {String} message 日志消息
   * @param {Boolean} force 是否强制输出
   * @private
   */
  _log: function(message, force) {
    if (this._config.debug || force === true) {
      console.log('[EnhancedMemoryManager] ' + message);
    }
  },
  
  /**
   * 开始内存监控
   * @returns {Object} 当前实例
   */
  startMonitoring: function() {
    var that = this;
    
    if (this._state.isMonitoring) {
      return this;
    }
    
    this._state.isMonitoring = true;
    
    // 清除可能存在的旧定时器
    if (this._state.monitorTimer) {
      clearInterval(this._state.monitorTimer);
    }
    
    // 创建新的监控定时器
    this._state.monitorTimer = setInterval(function() {
      that._checkMemoryUsage();
    }, this._config.monitorInterval);
    
    this._log('内存监控已启动，间隔: ' + this._config.monitorInterval + 'ms');
    
    // 立即执行一次检查
    this._checkMemoryUsage();
    
    return this;
  },
  
  /**
   * 停止内存监控
   * @returns {Object} 当前实例
   */
  stopMonitoring: function() {
    if (!this._state.isMonitoring) {
      return this;
    }
    
    this._state.isMonitoring = false;
    
    if (this._state.monitorTimer) {
      clearInterval(this._state.monitorTimer);
      this._state.monitorTimer = null;
    }
    
    this._log('内存监控已停止');
    
    return this;
  },
  
  /**
   * 检查内存使用情况
   * @private
   */
  _checkMemoryUsage: function() {
    var memoryInfo = this._getMemoryInfo();
    
    if (!memoryInfo.available) {
      this._log('无法获取内存信息', true);
      return;
    }
    
    // 检查是否超过警告阈值
    if (memoryInfo.jsHeapSizeMB >= this._config.warningThresholdMB) {
      this._log('内存使用超过警告阈值: ' + memoryInfo.jsHeapSizeMB + 'MB', true);
      
      // 执行临时文件清理
      this.cleanupTempFiles(memoryInfo.jsHeapSizeMB >= this._config.criticalThresholdMB);
    } 
    
    // 如果临时文件总大小超过阈值，也执行清理
    if (this._state.totalTempFileSize >= this._config.tempFileCleanThresholdMB * 1024 * 1024) {
      this._log('临时文件总大小超过阈值: ' + 
               (this._state.totalTempFileSize / (1024 * 1024)).toFixed(2) + 'MB', true);
      this.cleanupTempFiles(false);
    }
  },
  
  /**
   * 获取内存信息
   * @returns {Object} 内存信息
   * @private
   */
  _getMemoryInfo: function() {
    var result = {
      available: false,
      jsHeapSizeLimit: 0,
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      jsHeapSizeMB: 0,
      usedPercentage: 0
    };
    
    try {
      if (typeof wx !== 'undefined' && wx.getPerformance) {
        var performance = wx.getPerformance();
        var memory = performance && performance.memory;
        
        if (memory) {
          result.available = true;
          result.jsHeapSizeLimit = memory.jsHeapSizeLimit || 0;
          result.totalJSHeapSize = memory.totalJSHeapSize || 0;
          result.usedJSHeapSize = memory.usedJSHeapSize || 0;
          
          // 转换为MB并保留两位小数
          result.jsHeapSizeMB = parseFloat((result.usedJSHeapSize / (1024 * 1024)).toFixed(2));
          
          // 计算百分比
          if (result.jsHeapSizeLimit > 0) {
            result.usedPercentage = parseFloat((result.usedJSHeapSize / result.jsHeapSizeLimit * 100).toFixed(2));
          }
        }
      }
    } catch (e) {
      this._log('获取内存信息出错: ' + e.message, true);
    }
    
    return result;
  },
  
  /**
   * 注册临时文件
   * @param {String} filePath 文件路径
   * @param {Object} metadata 文件元数据
   * @returns {Object} 当前实例
   */
  registerTempFile: function(filePath, metadata) {
    if (!filePath) {
      return this;
    }
    
    // 获取文件大小
    var fileSize = 0;
    if (metadata && metadata.size) {
      fileSize = metadata.size;
    } else {
      try {
        var fileInfo = wx.getFileSystemManager().statSync(filePath);
        if (fileInfo && fileInfo.size) {
          fileSize = fileInfo.size;
        }
      } catch (e) {
        this._log('获取文件大小失败: ' + e.message);
      }
    }
    
    // 创建文件记录
    var fileRecord = {
      path: filePath,
      size: fileSize,
      timestamp: Date.now(),
      metadata: metadata || {},
      priority: metadata && metadata.priority ? metadata.priority : 'normal' // 优先级: 'low', 'normal', 'high'
    };
    
    // 添加到临时文件列表
    this._state.tempFiles.push(fileRecord);
    this._state.totalTempFileSize += fileSize;
    
    this._log('注册临时文件: ' + filePath + ', 大小: ' + (fileSize / 1024).toFixed(2) + 'KB');
    
    // 检查是否需要清理
    if (this._state.tempFiles.length > 50 || 
        this._state.totalTempFileSize > this._config.tempFileCleanThresholdMB * 1024 * 1024) {
      this.cleanupTempFiles(false);
    }
    
    return this;
  },
  
  /**
   * 取消注册临时文件
   * @param {String} filePath 文件路径
   * @param {Boolean} deleteFile 是否删除文件
   * @returns {Object} 当前实例
   */
  unregisterTempFile: function(filePath, deleteFile) {
    if (!filePath) {
      return this;
    }
    
    // 查找文件记录
    var fileIndex = -1;
    var fileRecord = null;
    
    for (var i = 0; i < this._state.tempFiles.length; i++) {
      if (this._state.tempFiles[i].path === filePath) {
        fileIndex = i;
        fileRecord = this._state.tempFiles[i];
        break;
      }
    }
    
    if (fileIndex >= 0) {
      // 减少总大小
      this._state.totalTempFileSize -= fileRecord.size;
      
      // 从列表中移除
      this._state.tempFiles.splice(fileIndex, 1);
      
      this._log('取消注册临时文件: ' + filePath);
      
      // 如果需要，删除文件
      if (deleteFile) {
        this._deleteTempFile(filePath);
      }
    }
    
    return this;
  },
  
  /**
   * 删除临时文件
   * @param {String} filePath 文件路径
   * @private
   */
  _deleteTempFile: function(filePath) {
    try {
      wx.getFileSystemManager().unlinkSync(filePath);
      this._log('已删除临时文件: ' + filePath);
    } catch (e) {
      this._log('删除临时文件失败: ' + e.message);
    }
  },
  
  /**
   * 清理临时文件
   * @param {Boolean} aggressive 是否积极清理
   * @returns {Promise} 清理结果
   */
  cleanupTempFiles: function(aggressive) {
    var that = this;
    
    return new Promise(function(resolve) {
      // 如果没有临时文件，直接返回
      if (that._state.tempFiles.length === 0) {
        resolve({ cleaned: 0, failed: 0, totalSize: 0 });
        return;
      }
      
      // 更新最后清理时间
      that._state.lastCleanupTime = Date.now();
      
      // 确定要删除的文件
      var filesToDelete = [];
      var remainingFiles = [];
      var currentTime = Date.now();
      var cleanupAge = aggressive ? 30 * 1000 : 5 * 60 * 1000; // 积极清理:30秒, 普通清理:5分钟
      
      // 按优先级和时间过滤文件
      that._state.tempFiles.forEach(function(file) {
        // 高优先级文件在非积极清理模式下保留
        if (file.priority === 'high' && !aggressive) {
          remainingFiles.push(file);
        } 
        // 普通和低优先级文件根据时间判断
        else if (currentTime - file.timestamp < cleanupAge && file.priority !== 'low') {
          remainingFiles.push(file);
        } 
        // 其他文件标记为删除
        else {
          filesToDelete.push(file);
        }
      });
      
      // 如果积极清理，且删除的文件不足总数的一半，删除更多
      if (aggressive && filesToDelete.length < that._state.tempFiles.length / 2) {
        // 按时间排序，保留最新的文件
        remainingFiles.sort(function(a, b) {
          return b.timestamp - a.timestamp;
        });
        
        // 根据情况，保留20-50%的文件
        var keepCount = aggressive ? 
                        Math.floor(that._state.tempFiles.length * 0.2) : 
                        Math.floor(that._state.tempFiles.length * 0.5);
        
        // 确保至少保留一个文件
        keepCount = Math.max(1, keepCount);
        
        // 多余的移入删除列表
        if (remainingFiles.length > keepCount) {
          filesToDelete = filesToDelete.concat(remainingFiles.splice(keepCount));
        }
      }
      
      that._log('开始清理临时文件: ' + filesToDelete.length + '个文件');
      
      // 统计变量
      var cleaned = 0;
      var failed = 0;
      var cleanedSize = 0;
      
      // 如果没有需要删除的文件，直接返回
      if (filesToDelete.length === 0) {
        that._state.tempFiles = remainingFiles;
        
        // 重新计算总大小
        that._state.totalTempFileSize = 0;
        remainingFiles.forEach(function(file) {
          that._state.totalTempFileSize += file.size;
        });
        
        resolve({ cleaned: 0, failed: 0, totalSize: 0 });
        return;
      }
      
      // 执行删除
      var fsm = wx.getFileSystemManager();
      
      // 使用Promise.all进行批量删除
      Promise.all(filesToDelete.map(function(file) {
        return new Promise(function(resolveDelete) {
          fsm.unlink({
            filePath: file.path,
            success: function() {
              cleaned++;
              cleanedSize += file.size;
              resolveDelete(true);
            },
            fail: function(err) {
              failed++;
              that._log('删除临时文件失败: ' + file.path + ', ' + err.errMsg);
              resolveDelete(false);
            }
          });
        });
      }))
      .then(function() {
        // 更新临时文件列表和总大小
        that._state.tempFiles = remainingFiles;
        
        // 重新计算总大小
        that._state.totalTempFileSize = 0;
        remainingFiles.forEach(function(file) {
          that._state.totalTempFileSize += file.size;
        });
        
        that._log('临时文件清理完成: 成功' + cleaned + '个, 失败' + failed + 
                 '个, 释放空间' + (cleanedSize / (1024 * 1024)).toFixed(2) + 'MB', true);
        
        resolve({
          cleaned: cleaned,
          failed: failed,
          totalSize: cleanedSize
        });
      });
    });
  },
  
  /**
   * 执行内存紧急释放
   * @returns {Promise} 释放结果
   */
  performEmergencyCleanup: function() {
    var that = this;
    
    this._log('执行内存紧急释放', true);
    
    return new Promise(function(resolve) {
      // 立即清理所有临时文件
      that.cleanupTempFiles(true)
        .then(function(result) {
          // 尝试触发系统垃圾回收
          if (typeof global !== 'undefined' && global.gc) {
            global.gc();
          }
          
          // 通知全局低内存模式
          var app = typeof getApp === 'function' ? getApp() : null;
          if (app) {
            app.globalData = app.globalData || {};
            app.globalData.lowMemoryMode = true;
            
            that._log('已启用全局低内存模式', true);
            
            // 如果有全局事件总线，发送通知
            if (app.eventBus && typeof app.eventBus.emit === 'function') {
              app.eventBus.emit('lowMemoryMode', { enabled: true });
            }
          }
          
          resolve({
            success: true,
            cleanedFiles: result,
            memoryMode: 'low'
          });
        });
    });
  },
  
  /**
   * 获取当前状态
   * @returns {Object} 状态信息
   */
  getStatus: function() {
    return {
      isMonitoring: this._state.isMonitoring,
      memoryWarningLevel: this._state.memoryWarningLevel,
      tempFileCount: this._state.tempFiles.length,
      tempFileTotalSize: this._state.totalTempFileSize,
      lastCleanupTime: this._state.lastCleanupTime,
      memoryInfo: this._getMemoryInfo()
    };
  }
};

module.exports = EnhancedMemoryManager; 