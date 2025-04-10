/**
 * 微信小程序性能监控工具
 * 提供性能数据收集、分析和报告功能
 * 符合ES5标准，兼容微信小程序环境
 */

var PerfMonitor = {
  /**
   * 存储时间点标记
   */
  marks: {},
  
  /**
   * 存储测量结果
   */
  measures: {},
  
  /**
   * 存储操作时间记录
   */
  actionTimes: {},
  
  /**
   * 存储性能数据
   */
  performanceData: {},
  
  /**
   * 存储内存使用数据
   */
  memoryData: [],
  
  /**
   * 设置某个时间点标记
   * @param {string} name - 标记名称
   * @return {number} 记录的时间戳
   */
  mark: function(name) {
    if(!name) {
      console.error('标记名称不能为空');
      return false;
    }
    
    var timestamp = Date.now();
    this.marks[name] = timestamp;
    return timestamp;
  },
  
  /**
   * 测量两个标记点之间的时间差
   * @param {string} name - 测量结果名称
   * @param {string} startMark - 开始标记名称
   * @param {string} endMark - 结束标记名称
   * @return {number} 时间差(毫秒)，出错返回-1
   */
  measure: function(name, startMark, endMark) {
    if(!this.marks[startMark] || !this.marks[endMark]) {
      console.error('起始或结束标记不存在');
      return -1;
    }
    
    var duration = this.marks[endMark] - this.marks[startMark];
    this.measures[name] = duration;
    
    // 记录到性能数据中
    if(!this.performanceData.timings) {
      this.performanceData.timings = {};
    }
    this.performanceData.timings[name] = duration;
    
    return duration;
  },
  
  /**
   * 开始记录某个操作的耗时
   * @param {string} name - 操作名称
   * @return {Function} 结束记录并获取耗时的函数
   */
  startAction: function(name) {
    var self = this;
    var startTime = Date.now();
    
    return function() {
      var duration = Date.now() - startTime;
      self.actionTimes[name] = duration;
      
      // 记录到性能数据中
      if(!self.performanceData.actions) {
        self.performanceData.actions = {};
      }
      self.performanceData.actions[name] = duration;
      
      return duration;
    };
  },
  
  /**
   * 记录某个操作的耗时
   * @param {string} name - 操作名称
   * @param {Function} action - 要执行的操作函数
   * @return {number} 操作耗时(毫秒)
   */
  timeAction: function(name, action) {
    var startTime = Date.now();
    
    // 执行操作
    action();
    
    var duration = Date.now() - startTime;
    this.actionTimes[name] = duration;
    
    // 记录到性能数据中
    if(!this.performanceData.actions) {
      this.performanceData.actions = {};
    }
    this.performanceData.actions[name] = duration;
    
    return duration;
  },
  
  /**
   * 记录setData操作的性能
   * @param {object} pageInstance - 页面实例
   * @param {string} name - 记录名称
   * @param {object} data - 要设置的数据
   * @param {Function} callback - setData回调
   */
  recordSetData: function(pageInstance, name, data, callback) {
    if(!pageInstance || !pageInstance.setData) {
      console.error('页面实例无效');
      return;
    }
    
    var self = this;
    var startTime = Date.now();
    var dataSize = JSON.stringify(data).length;
    
    pageInstance.setData(data, function() {
      var duration = Date.now() - startTime;
      
      // 记录setData性能数据
      if(!self.performanceData.setData) {
        self.performanceData.setData = [];
      }
      
      self.performanceData.setData.push({
        name: name,
        time: duration,
        size: dataSize,
        timestamp: startTime
      });
      
      // 执行原回调
      if(typeof callback === 'function') {
        callback();
      }
    });
  },
  
  /**
   * 监控页面生命周期性能
   * @param {object} pageInstance - 页面实例
   */
  monitorPageLifecycle: function(pageInstance) {
    if(!pageInstance) {
      console.error('页面实例无效');
      return;
    }
    
    var self = this;
    var pagePath = pageInstance.route || 'unknown';
    
    // 保存原始生命周期函数
    var originalOnLoad = pageInstance.onLoad;
    var originalOnReady = pageInstance.onReady;
    var originalOnShow = pageInstance.onShow;
    var originalOnHide = pageInstance.onHide;
    var originalOnUnload = pageInstance.onUnload;
    
    // 注入性能监控
    pageInstance.onLoad = function(options) {
      self.mark(pagePath + '.onLoad.start');
      
      // 执行原始onLoad
      if(typeof originalOnLoad === 'function') {
        originalOnLoad.call(this, options);
      }
      
      self.mark(pagePath + '.onLoad.end');
      self.measure(pagePath + '.onLoad', pagePath + '.onLoad.start', pagePath + '.onLoad.end');
    };
    
    pageInstance.onReady = function() {
      self.mark(pagePath + '.onReady.start');
      
      // 执行原始onReady
      if(typeof originalOnReady === 'function') {
        originalOnReady.call(this);
      }
      
      self.mark(pagePath + '.onReady.end');
      self.measure(pagePath + '.onReady', pagePath + '.onReady.start', pagePath + '.onReady.end');
      
      // 记录页面总加载时间
      if(self.marks[pagePath + '.onLoad.start']) {
        self.measure(pagePath + '.totalReady', pagePath + '.onLoad.start', pagePath + '.onReady.end');
      }
    };
    
    pageInstance.onShow = function() {
      self.mark(pagePath + '.onShow.start');
      
      // 执行原始onShow
      if(typeof originalOnShow === 'function') {
        originalOnShow.call(this);
      }
      
      self.mark(pagePath + '.onShow.end');
      self.measure(pagePath + '.onShow', pagePath + '.onShow.start', pagePath + '.onShow.end');
    };
    
    pageInstance.onHide = function() {
      self.mark(pagePath + '.onHide.start');
      
      // 执行原始onHide
      if(typeof originalOnHide === 'function') {
        originalOnHide.call(this);
      }
      
      self.mark(pagePath + '.onHide.end');
      self.measure(pagePath + '.onHide', pagePath + '.onHide.start', pagePath + '.onHide.end');
    };
    
    pageInstance.onUnload = function() {
      self.mark(pagePath + '.onUnload.start');
      
      // 执行原始onUnload
      if(typeof originalOnUnload === 'function') {
        originalOnUnload.call(this);
      }
      
      self.mark(pagePath + '.onUnload.end');
      self.measure(pagePath + '.onUnload', pagePath + '.onUnload.start', pagePath + '.onUnload.end');
    };
    
    return pageInstance;
  },
  
  /**
   * 监控网络请求性能
   * @param {object} requestOptions - 请求参数
   * @return {object} 修改后的请求参数
   */
  monitorRequest: function(requestOptions) {
    if(!requestOptions) {
      return requestOptions;
    }
    
    var self = this;
    var url = requestOptions.url || 'unknown';
    var requestId = 'request_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    
    // 保存原始回调
    var originalSuccess = requestOptions.success;
    var originalFail = requestOptions.fail;
    var originalComplete = requestOptions.complete;
    
    // 记录开始时间
    self.mark(requestId + '.start');
    
    // 注入性能监控
    requestOptions.success = function(res) {
      self.mark(requestId + '.end');
      var duration = self.measure(requestId, requestId + '.start', requestId + '.end');
      
      // 记录请求性能数据
      if(!self.performanceData.requests) {
        self.performanceData.requests = [];
      }
      
      self.performanceData.requests.push({
        url: url,
        method: requestOptions.method || 'GET',
        time: duration,
        size: res && JSON.stringify(res).length,
        status: 'success',
        timestamp: self.marks[requestId + '.start']
      });
      
      // 执行原回调
      if(typeof originalSuccess === 'function') {
        originalSuccess(res);
      }
    };
    
    requestOptions.fail = function(err) {
      self.mark(requestId + '.end');
      var duration = self.measure(requestId, requestId + '.start', requestId + '.end');
      
      // 记录请求性能数据
      if(!self.performanceData.requests) {
        self.performanceData.requests = [];
      }
      
      self.performanceData.requests.push({
        url: url,
        method: requestOptions.method || 'GET',
        time: duration,
        status: 'fail',
        error: err,
        timestamp: self.marks[requestId + '.start']
      });
      
      // 执行原回调
      if(typeof originalFail === 'function') {
        originalFail(err);
      }
    };
    
    requestOptions.complete = function(res) {
      // 执行原回调
      if(typeof originalComplete === 'function') {
        originalComplete(res);
      }
    };
    
    return requestOptions;
  },
  
  /**
   * 记录内存使用情况
   * 需要在获取权限后调用
   */
  recordMemoryUsage: function() {
    var self = this;
    
    try {
      // 尝试获取内存数据，若不支持会抛出异常
      if(wx.getPerformance) {
        var performance = wx.getPerformance();
        var memory = performance.getMemoryStats();
        
        if(memory) {
          var currentTime = Date.now();
          
          self.memoryData.push({
            timestamp: currentTime,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            totalJSHeapSize: memory.totalJSHeapSize,
            usedJSHeapSize: memory.usedJSHeapSize
          });
          
          // 控制记录数量，避免内存占用过大
          if(self.memoryData.length > 100) {
            self.memoryData.shift();
          }
        }
      }
    } catch(e) {
      console.warn('获取内存数据失败', e);
    }
  },
  
  /**
   * 启动内存监控
   * @param {number} interval - 采样间隔(毫秒)，默认5000ms
   * @return {object} 定时器对象，可用于停止监控
   */
  startMemoryMonitor: function(interval) {
    var self = this;
    interval = interval || 5000;
    
    // 先记录一次当前值
    self.recordMemoryUsage();
    
    // 定时记录
    var timer = setInterval(function() {
      self.recordMemoryUsage();
    }, interval);
    
    return {
      stop: function() {
        clearInterval(timer);
      }
    };
  },
  
  /**
   * 获取所有收集的性能数据
   * @return {object} 性能数据
   */
  getAllMetrics: function() {
    return {
      marks: this.marks,
      measures: this.measures,
      actionTimes: this.actionTimes,
      performanceData: this.performanceData,
      memoryData: this.memoryData
    };
  },
  
  /**
   * 生成性能报告
   * @return {string} 格式化的性能报告
   */
  generateReport: function() {
    var report = '性能监控报告\n';
    report += '=============\n\n';
    
    // 添加时间测量数据
    report += '时间测量:\n';
    for(var key in this.measures) {
      if(this.measures.hasOwnProperty(key)) {
        report += key + ': ' + this.measures[key] + 'ms\n';
      }
    }
    report += '\n';
    
    // 添加操作时间数据
    report += '操作耗时:\n';
    for(var key in this.actionTimes) {
      if(this.actionTimes.hasOwnProperty(key)) {
        report += key + ': ' + this.actionTimes[key] + 'ms\n';
      }
    }
    report += '\n';
    
    // 添加setData性能数据
    if(this.performanceData.setData && this.performanceData.setData.length) {
      report += 'setData性能:\n';
      
      this.performanceData.setData.forEach(function(item) {
        report += item.name + ': ' + item.time + 'ms (' + 
          (item.size / 1024).toFixed(2) + 'KB)\n';
      });
      
      report += '\n';
    }
    
    // 添加网络请求性能数据
    if(this.performanceData.requests && this.performanceData.requests.length) {
      report += '网络请求性能:\n';
      
      this.performanceData.requests.forEach(function(item) {
        report += item.url + ' (' + item.method + '): ' + 
          item.time + 'ms (' + item.status + ')\n';
      });
      
      report += '\n';
    }
    
    // 添加内存数据
    if(this.memoryData.length) {
      report += '内存使用情况:\n';
      
      // 只显示最新的5条记录
      var recentMemory = this.memoryData.slice(-5);
      
      recentMemory.forEach(function(item) {
        var usedMB = (item.usedJSHeapSize / (1024 * 1024)).toFixed(2);
        var totalMB = (item.totalJSHeapSize / (1024 * 1024)).toFixed(2);
        var limitMB = (item.jsHeapSizeLimit / (1024 * 1024)).toFixed(2);
        
        var time = new Date(item.timestamp).toLocaleTimeString();
        report += time + ' - 已用: ' + usedMB + 'MB / 总共: ' + 
          totalMB + 'MB / 限制: ' + limitMB + 'MB\n';
      });
      
      report += '\n';
    }
    
    return report;
  },
  
  /**
   * 将性能数据上报到服务器
   * @param {string} url - 服务器接口地址
   * @param {object} extraData - 额外数据
   */
  uploadMetrics: function(url, extraData) {
    if(!url) {
      console.error('上报地址不能为空');
      return;
    }
    
    var data = {
      performanceData: this.performanceData,
      extraData: extraData || {}
    };
    
    // 添加设备信息
    try {
      var systemInfo = wx.getSystemInfoSync();
      data.deviceInfo = systemInfo;
    } catch(e) {
      console.warn('获取系统信息失败', e);
    }
    
    // 发送请求
    wx.request({
      url: url,
      method: 'POST',
      data: data,
      success: function(res) {
        console.log('性能数据上报成功', res);
      },
      fail: function(err) {
        console.error('性能数据上报失败', err);
      }
    });
  },
  
  /**
   * 清空所有记录的性能数据
   */
  clear: function() {
    this.marks = {};
    this.measures = {};
    this.actionTimes = {};
    this.performanceData = {};
    this.memoryData = [];
  },
  
  /**
   * 启动性能监控
   * @param {object} options - 配置选项
   * @param {number} options.reportInterval - 自动上报间隔(毫秒)，0表示不自动上报
   * @param {string} options.reportUrl - 上报地址
   * @param {boolean} options.enableMemoryMonitor - 是否启用内存监控
   * @param {boolean} options.enableSetDataMonitor - 是否启用setData监控
   * @param {boolean} options.enableNetworkMonitor - 是否启用网络监控
   */
  start: function(options) {
    options = options || {};
    var self = this;
    
    // 清空之前的数据
    this.clear();
    
    // 记录启动时间
    this.mark('perfMonitor.start');
    
    // 启动内存监控
    if(options.enableMemoryMonitor) {
      this.memoryMonitor = this.startMemoryMonitor(options.memoryInterval || 5000);
    }
    
    // 设置自动上报
    if(options.reportInterval && options.reportUrl) {
      this.reportTimer = setInterval(function() {
        self.uploadMetrics(options.reportUrl);
      }, options.reportInterval);
    }
    
    // 重写wx.request用于监控网络请求
    if(options.enableNetworkMonitor && !this._requestPatched) {
      var originalRequest = wx.request;
      var self = this;
      
      wx.request = function(requestOptions) {
        try {
          // 克隆请求选项，避免修改原始请求选项
          var monitoredOptions = JSON.parse(JSON.stringify(requestOptions));
          
          // 确保不修改重要参数，特别是timeout
          var origTimeout = requestOptions.timeout;
          var origSuccess = requestOptions.success;
          var origFail = requestOptions.fail;
          var origComplete = requestOptions.complete;
          
          // 应用监控逻辑
          monitoredOptions = self.monitorRequest(monitoredOptions);
          
          // 恢复原始timeout，确保超时设置不受影响
          if (origTimeout) {
            monitoredOptions.timeout = origTimeout;
          }
          
          // 包装回调，确保即使监控逻辑出错，原始回调仍能正确执行
          var wrappedSuccess = monitoredOptions.success;
          var wrappedFail = monitoredOptions.fail;
          var wrappedComplete = monitoredOptions.complete;
          
          monitoredOptions.success = function(res) {
            try {
              if (typeof wrappedSuccess === 'function') {
                wrappedSuccess(res);
              }
            } catch (err) {
              console.error('性能监控success回调异常', err);
              // 确保原始回调仍能执行
              if (typeof origSuccess === 'function') {
                origSuccess(res);
              }
            }
          };
          
          monitoredOptions.fail = function(err) {
            try {
              if (typeof wrappedFail === 'function') {
                wrappedFail(err);
              }
            } catch (monitorErr) {
              console.error('性能监控fail回调异常', monitorErr);
              // 确保原始回调仍能执行
              if (typeof origFail === 'function') {
                origFail(err);
              }
            }
          };
          
          monitoredOptions.complete = function(res) {
            try {
              if (typeof wrappedComplete === 'function') {
                wrappedComplete(res);
              }
            } catch (err) {
              console.error('性能监控complete回调异常', err);
              // 确保原始回调仍能执行
              if (typeof origComplete === 'function') {
                origComplete(res);
              }
            }
          };
          
          // 调用原始请求
          return originalRequest(monitoredOptions);
        } catch (err) {
          console.error('性能监控请求拦截异常', err);
          // 出错时回退到原始请求，确保功能正常
          return originalRequest(requestOptions);
        }
      };
      
      this._requestPatched = true;
    }
    
    return this;
  },
  
  /**
   * 停止性能监控
   */
  stop: function() {
    // 停止内存监控
    if(this.memoryMonitor) {
      this.memoryMonitor.stop();
      this.memoryMonitor = null;
    }
    
    // 停止自动上报
    if(this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
    
    // 记录结束时间
    this.mark('perfMonitor.stop');
    this.measure('perfMonitor.duration', 'perfMonitor.start', 'perfMonitor.stop');
    
    return this;
  }
};

module.exports = PerfMonitor; 