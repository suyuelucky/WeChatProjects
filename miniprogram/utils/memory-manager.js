/**
 * 内存管理器
 * 用于监控和管理微信小程序内存使用情况
 * 实现内存优化，防止内存泄漏和OOM
 * 遵循ES5语法，确保在微信小程序环境兼容
 */

/**
 * 内存管理器
 */
const MemoryManager = (function() {
  // 私有变量
  var memorySnapshots = [];
  var isMonitoring = false;
  var monitorInterval = null;
  var memoryWarningHandler = null;
  var config = {
    monitorInterval: 10000,     // 监控间隔，默认10秒
    maxSnapshotCount: 20,       // 最大快照数量
    warningThresholdMB: 150,    // 内存警告阈值(MB)
    criticalThresholdMB: 180,   // 内存临界阈值(MB)
    autoCleanup: true,          // 是否自动清理
    cleanupThresholdMB: 160,    // 触发清理的阈值(MB)
    debugMode: false            // 调试模式
  };
  
  /**
   * 初始化内存管理器
   * @param {Object} options 初始化选项
   */
  function init(options) {
    // 合并配置
    if (options) {
      for (var key in options) {
        if (options.hasOwnProperty(key) && config.hasOwnProperty(key)) {
          config[key] = options[key];
        }
      }
    }
    
    // 监听内存警告事件
    if (typeof wx !== 'undefined' && wx.onMemoryWarning) {
      memoryWarningHandler = function(res) {
        var warningLevel = res.level || 0;
        logMessage('内存警告: 级别' + warningLevel, true);
        
        // 记录内存快照
        takeMemorySnapshot('warning_' + warningLevel);
        
        // 根据级别触发不同的清理策略
        switch(warningLevel) {
          case 5: // Android极端内存告警
          case 10: // iOS即将OOM
            performCriticalCleanup();
            break;
          case 1: // Android系统内存不足告警
          case 2: // Android系统内存极低告警
            performAggressiveCleanup();
            break;
          default: // 普通告警
            performNormalCleanup();
            break;
        }
      };
      
      wx.onMemoryWarning(memoryWarningHandler);
      logMessage('已开启内存警告监听');
    }
    
    // 启动监控
    if (config.autoCleanup) {
      startMonitoring();
    }
    
    // 初始内存快照
    takeMemorySnapshot('init');
    
    return this;
  }
  
  /**
   * 开始内存监控
   */
  function startMonitoring() {
    if (isMonitoring) {
      return;
    }
    
    isMonitoring = true;
    
    // 设置定时器
    monitorInterval = setInterval(function() {
      // 获取当前内存使用情况
      var memoryInfo = getMemoryInfo();
      
      // 每次监控都记录快照
      takeMemorySnapshot('monitor');
      
      // 检查是否需要清理
      if (memoryInfo && memoryInfo.jsHeapSizeMB >= config.cleanupThresholdMB) {
        logMessage('内存使用超过清理阈值: ' + memoryInfo.jsHeapSizeMB + 'MB', true);
        performNormalCleanup();
      }
    }, config.monitorInterval);
    
    logMessage('内存监控已启动，间隔: ' + config.monitorInterval + 'ms');
  }
  
  /**
   * 停止内存监控
   */
  function stopMonitoring() {
    if (!isMonitoring) {
      return;
    }
    
    isMonitoring = false;
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
    
    logMessage('内存监控已停止');
  }
  
  /**
   * 获取内存信息
   * @return {Object} 内存信息
   */
  function getMemoryInfo() {
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
          result.jsHeapSizeMB = (result.usedJSHeapSize / (1024 * 1024)).toFixed(2);
          
          // 计算百分比
          if (result.jsHeapSizeLimit > 0) {
            result.usedPercentage = (result.usedJSHeapSize / result.jsHeapSizeLimit * 100).toFixed(2);
          }
        }
      }
    } catch (e) {
      logMessage('获取内存信息出错: ' + e.message, true);
    }
    
    return result;
  }
  
  /**
   * 记录内存快照
   * @param {String} reason 记录原因
   * @return {Object} 内存快照
   */
  function takeMemorySnapshot(reason) {
    var memoryInfo = getMemoryInfo();
    var snapshot = {
      timestamp: Date.now(),
      reason: reason || 'manual',
      memory: memoryInfo
    };
    
    // 添加快照
    memorySnapshots.push(snapshot);
    
    // 限制快照数量
    if (memorySnapshots.length > config.maxSnapshotCount) {
      memorySnapshots.shift();
    }
    
    // 调试输出
    if (config.debugMode) {
      logMessage('内存快照: ' + 
                 snapshot.reason + ' - ' + 
                 memoryInfo.jsHeapSizeMB + 'MB (' + 
                 memoryInfo.usedPercentage + '%)');
    }
    
    return snapshot;
  }
  
  /**
   * 获取所有内存快照
   * @return {Array} 内存快照数组
   */
  function getMemorySnapshots() {
    return memorySnapshots.slice();
  }
  
  /**
   * 普通清理
   * 清理非关键缓存，保持基本功能
   */
  function performNormalCleanup() {
    logMessage('执行普通内存清理');
    
    // 发送清理事件
    triggerCleanupEvent('normal');
    
    // 建议进行垃圾回收
    if (typeof gc !== 'undefined') {
      gc();
    }
    
    // 清理完成后记录快照
    takeMemorySnapshot('after_normal_cleanup');
  }
  
  /**
   * 积极清理
   * 清理更多缓存，可能影响性能但保持基本功能
   */
  function performAggressiveCleanup() {
    logMessage('执行积极内存清理', true);
    
    // 执行普通清理
    performNormalCleanup();
    
    // 发送积极清理事件
    triggerCleanupEvent('aggressive');
    
    // 再次尝试垃圾回收
    if (typeof gc !== 'undefined') {
      setTimeout(function() {
        gc();
      }, 1000);
    }
    
    // 清理完成后记录快照
    takeMemorySnapshot('after_aggressive_cleanup');
  }
  
  /**
   * 关键清理
   * 释放几乎所有可释放资源以避免崩溃
   */
  function performCriticalCleanup() {
    logMessage('执行关键内存清理', true);
    
    // 执行积极清理
    performAggressiveCleanup();
    
    // 发送关键清理事件
    triggerCleanupEvent('critical');
    
    // 建议开启低内存模式
    // 低内存模式将禁用部分功能、降低图片质量等
    setLowMemoryMode(true);
    
    // 清理完成后记录快照
    takeMemorySnapshot('after_critical_cleanup');
  }
  
  /**
   * 触发清理事件
   * @param {String} level 清理级别
   */
  function triggerCleanupEvent(level) {
    // 通过事件通知其他模块进行清理
    if (typeof wx !== 'undefined' && wx.triggerEvent) {
      wx.triggerEvent('memoryCleanup', {
        level: level,
        timestamp: Date.now()
      });
    }
    
    // 如果没有wx.triggerEvent，使用全局事件对象
    var global = typeof window !== 'undefined' ? window : 
                 typeof global !== 'undefined' ? global : 
                 typeof getApp === 'function' ? getApp() : {};
    
    if (global.eventBus && typeof global.eventBus.emit === 'function') {
      global.eventBus.emit('memoryCleanup', {
        level: level,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * 设置低内存模式
   * @param {Boolean} enabled 是否启用
   */
  function setLowMemoryMode(enabled) {
    var app = typeof getApp === 'function' ? getApp() : null;
    
    if (app) {
      app.globalData = app.globalData || {};
      app.globalData.lowMemoryMode = enabled;
      
      logMessage('低内存模式: ' + (enabled ? '开启' : '关闭'), true);
      
      // 通知页面和组件
      triggerCleanupEvent(enabled ? 'lowMemoryModeOn' : 'lowMemoryModeOff');
    }
  }
  
  /**
   * 日志输出
   * @param {String} message 日志消息
   * @param {Boolean} force 是否强制输出
   */
  function logMessage(message, force) {
    if (config.debugMode || force) {
      console.log('[MemoryManager] ' + message);
    }
  }
  
  /**
   * 注册内存警告回调
   * @param {Function} callback 回调函数
   */
  function onMemoryWarning(callback) {
    if (typeof wx !== 'undefined' && wx.onMemoryWarning) {
      wx.onMemoryWarning(callback);
    }
  }
  
  /**
   * 手动清理内存
   * @param {String} level 清理级别 (normal/aggressive/critical)
   */
  function cleanup(level) {
    switch(level) {
      case 'critical':
        performCriticalCleanup();
        break;
      case 'aggressive':
        performAggressiveCleanup();
        break;
      default:
        performNormalCleanup();
        break;
    }
    
    return getMemoryInfo();
  }
  
  /**
   * 获取内存使用报告
   * @return {Object} 内存报告
   */
  function getMemoryReport() {
    var currentMemory = getMemoryInfo();
    var snapshots = getMemorySnapshots();
    
    // 找出最高内存使用记录
    var highestUsage = currentMemory.usedJSHeapSize;
    var highestSnapshot = null;
    
    snapshots.forEach(function(snapshot) {
      if (snapshot.memory && snapshot.memory.usedJSHeapSize > highestUsage) {
        highestUsage = snapshot.memory.usedJSHeapSize;
        highestSnapshot = snapshot;
      }
    });
    
    // 计算平均内存使用
    var totalUsage = snapshots.reduce(function(sum, snapshot) {
      return sum + (snapshot.memory ? snapshot.memory.usedJSHeapSize : 0);
    }, 0);
    
    var avgUsage = snapshots.length > 0 ? totalUsage / snapshots.length : 0;
    
    return {
      current: currentMemory,
      highest: {
        usedJSHeapSize: highestUsage,
        jsHeapSizeMB: (highestUsage / (1024 * 1024)).toFixed(2),
        snapshot: highestSnapshot
      },
      average: {
        usedJSHeapSize: avgUsage,
        jsHeapSizeMB: (avgUsage / (1024 * 1024)).toFixed(2)
      },
      snapshots: snapshots.length,
      isMonitoring: isMonitoring,
      lowMemoryMode: typeof getApp === 'function' && getApp().globalData ? 
                     !!getApp().globalData.lowMemoryMode : false
    };
  }
  
  // 返回公共API
  return {
    init: init,
    getMemoryInfo: getMemoryInfo,
    takeMemorySnapshot: takeMemorySnapshot,
    getMemorySnapshots: getMemorySnapshots,
    startMonitoring: startMonitoring,
    stopMonitoring: stopMonitoring,
    cleanup: cleanup,
    getMemoryReport: getMemoryReport,
    onMemoryWarning: onMemoryWarning,
    setLowMemoryMode: setLowMemoryMode
  };
})();

// 导出MemoryManager
module.exports = MemoryManager; 