/**
 * 微信小程序云开发极限测试 - 性能监控工具
 * 
 * 用于监控测试过程中的内存、CPU、网络等资源使用情况
 * 使用方法：在开发者工具控制台执行该文件中的函数
 */

// 监控结果存储
const monitorResults = {
  memory: [],
  networkRequests: [],
  errors: [],
  startTime: null,
  endTime: null
};

/**
 * 开始性能监控
 */
function startMonitoring() {
  console.log('开始性能监控...');
  
  // 记录开始时间
  monitorResults.startTime = new Date();
  monitorResults.memory = [];
  monitorResults.networkRequests = [];
  monitorResults.errors = [];
  
  // 开始内存监控
  _startMemoryMonitoring();
  
  // 监控网络请求
  _startNetworkMonitoring();
  
  // 监控错误
  _startErrorMonitoring();
  
  return '性能监控已启动';
}

/**
 * 停止性能监控
 */
function stopMonitoring() {
  console.log('停止性能监控...');
  
  // 记录结束时间
  monitorResults.endTime = new Date();
  
  // 清除监控
  if (window._memoryMonitorTimer) {
    clearInterval(window._memoryMonitorTimer);
    window._memoryMonitorTimer = null;
  }
  
  // 移除网络请求监听
  if (window._originalFetch) {
    window.fetch = window._originalFetch;
    window._originalFetch = null;
  }
  
  if (window._originalXhrOpen) {
    XMLHttpRequest.prototype.open = window._originalXhrOpen;
    window._originalXhrOpen = null;
  }
  
  if (window._originalXhrSend) {
    XMLHttpRequest.prototype.send = window._originalXhrSend;
    window._originalXhrSend = null;
  }
  
  // 移除错误监听
  if (window._originalOnError) {
    window.onerror = window._originalOnError;
    window._originalOnError = null;
  }
  
  return '性能监控已停止';
}

/**
 * 获取监控结果分析
 */
function getMonitoringResults() {
  const duration = monitorResults.endTime - monitorResults.startTime;
  
  // 内存使用分析
  let memoryAnalysis = {};
  if (monitorResults.memory.length > 0) {
    const memoryValues = monitorResults.memory.map(m => m.usedJSHeapSize);
    memoryAnalysis = {
      average: Math.round(memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length / (1024 * 1024)) + ' MB',
      peak: Math.round(Math.max(...memoryValues) / (1024 * 1024)) + ' MB',
      start: Math.round(memoryValues[0] / (1024 * 1024)) + ' MB',
      end: Math.round(memoryValues[memoryValues.length - 1] / (1024 * 1024)) + ' MB',
      samples: monitorResults.memory.length
    };
  }
  
  // 网络请求分析
  const networkAnalysis = {
    totalRequests: monitorResults.networkRequests.length,
    averageResponseTime: monitorResults.networkRequests.length > 0 ? 
      Math.round(monitorResults.networkRequests.reduce((a, b) => a + b.duration, 0) / monitorResults.networkRequests.length) + ' ms' : 'N/A',
    requestsPerSecond: Math.round(monitorResults.networkRequests.length / (duration / 1000) * 10) / 10,
    errorRate: monitorResults.networkRequests.length > 0 ? 
      Math.round(monitorResults.networkRequests.filter(r => !r.success).length / monitorResults.networkRequests.length * 100) + '%' : 'N/A'
  };
  
  // 错误分析
  const errorAnalysis = {
    totalErrors: monitorResults.errors.length,
    errorsPerSecond: Math.round(monitorResults.errors.length / (duration / 1000) * 100) / 100,
    topErrors: _getTopErrors()
  };
  
  return {
    duration: Math.round(duration / 1000) + ' 秒',
    memory: memoryAnalysis,
    network: networkAnalysis,
    errors: errorAnalysis,
    timestamp: new Date().toISOString()
  };
}

/**
 * 导出监控结果为Markdown格式
 */
function exportResultsAsMarkdown() {
  const results = getMonitoringResults();
  
  let markdown = `# 性能监控报告\n\n`;
  markdown += `**测试时间**: ${monitorResults.startTime.toLocaleString()} - ${monitorResults.endTime.toLocaleString()}\n`;
  markdown += `**测试持续时间**: ${results.duration}\n\n`;
  
  markdown += `## 内存使用情况\n\n`;
  markdown += `- 平均内存使用: ${results.memory.average}\n`;
  markdown += `- 峰值内存使用: ${results.memory.peak}\n`;
  markdown += `- 起始内存使用: ${results.memory.start}\n`;
  markdown += `- 结束内存使用: ${results.memory.end}\n`;
  markdown += `- 采样数: ${results.memory.samples}\n\n`;
  
  markdown += `## 网络请求情况\n\n`;
  markdown += `- 总请求数: ${results.network.totalRequests}\n`;
  markdown += `- 平均响应时间: ${results.network.averageResponseTime}\n`;
  markdown += `- 每秒请求数: ${results.network.requestsPerSecond}\n`;
  markdown += `- 请求错误率: ${results.network.errorRate}\n\n`;
  
  markdown += `## 错误情况\n\n`;
  markdown += `- 总错误数: ${results.errors.totalErrors}\n`;
  markdown += `- 每秒错误数: ${results.errors.errorsPerSecond}\n`;
  
  if (results.errors.topErrors.length > 0) {
    markdown += `- 常见错误:\n`;
    results.errors.topErrors.forEach(error => {
      markdown += `  - ${error.message} (出现 ${error.count} 次)\n`;
    });
  }
  
  return markdown;
}

// 辅助函数 - 内存监控
function _startMemoryMonitoring() {
  if (!window.performance || !window.performance.memory) {
    console.warn('当前环境不支持内存监控');
    return;
  }
  
  // 每5秒采样一次内存使用情况
  window._memoryMonitorTimer = setInterval(() => {
    const memoryInfo = window.performance.memory;
    monitorResults.memory.push({
      timestamp: new Date(),
      totalJSHeapSize: memoryInfo.totalJSHeapSize,
      usedJSHeapSize: memoryInfo.usedJSHeapSize,
      jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
    });
  }, 5000);
}

// 辅助函数 - 网络监控
function _startNetworkMonitoring() {
  // 监控 fetch
  if (window.fetch) {
    window._originalFetch = window.fetch;
    window.fetch = function(...args) {
      const startTime = performance.now();
      const url = args[0] instanceof Request ? args[0].url : args[0];
      
      return window._originalFetch.apply(this, args)
        .then(response => {
          const duration = performance.now() - startTime;
          monitorResults.networkRequests.push({
            type: 'fetch',
            url,
            duration,
            timestamp: new Date(),
            success: response.ok
          });
          return response;
        })
        .catch(error => {
          const duration = performance.now() - startTime;
          monitorResults.networkRequests.push({
            type: 'fetch',
            url,
            duration,
            timestamp: new Date(),
            success: false,
            error: error.message
          });
          throw error;
        });
    };
  }
  
  // 监控 XMLHttpRequest
  if (window.XMLHttpRequest) {
    window._originalXhrOpen = XMLHttpRequest.prototype.open;
    window._originalXhrSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      this._monitorData = {
        method,
        url,
        startTime: 0
      };
      return window._originalXhrOpen.apply(this, [method, url, ...args]);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      if (this._monitorData) {
        this._monitorData.startTime = performance.now();
        
        const originalOnload = this.onload;
        this.onload = function(...loadArgs) {
          const duration = performance.now() - this._monitorData.startTime;
          monitorResults.networkRequests.push({
            type: 'xhr',
            url: this._monitorData.url,
            method: this._monitorData.method,
            duration,
            timestamp: new Date(),
            success: this.status >= 200 && this.status < 300
          });
          
          if (originalOnload) {
            return originalOnload.apply(this, loadArgs);
          }
        };
        
        const originalOnerror = this.onerror;
        this.onerror = function(error) {
          const duration = performance.now() - this._monitorData.startTime;
          monitorResults.networkRequests.push({
            type: 'xhr',
            url: this._monitorData.url,
            method: this._monitorData.method,
            duration,
            timestamp: new Date(),
            success: false,
            error: error
          });
          
          if (originalOnerror) {
            return originalOnerror.apply(this, arguments);
          }
        };
      }
      
      return window._originalXhrSend.apply(this, args);
    };
  }
}

// 辅助函数 - 错误监控
function _startErrorMonitoring() {
  window._originalOnError = window.onerror;
  
  window.onerror = function(message, source, lineno, colno, error) {
    monitorResults.errors.push({
      message,
      source,
      lineno,
      colno,
      stack: error ? error.stack : null,
      timestamp: new Date()
    });
    
    if (window._originalOnError) {
      return window._originalOnError.apply(this, arguments);
    }
  };
}

// 辅助函数 - 分析Top错误
function _getTopErrors() {
  const errorMap = {};
  
  monitorResults.errors.forEach(error => {
    const key = error.message;
    if (!errorMap[key]) {
      errorMap[key] = { message: key, count: 0 };
    }
    errorMap[key].count++;
  });
  
  return Object.values(errorMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// 导出函数到全局，方便在控制台调用
if (typeof window !== 'undefined') {
  window.startPerformanceMonitoring = startMonitoring;
  window.stopPerformanceMonitoring = stopMonitoring;
  window.getPerformanceResults = getMonitoringResults;
  window.exportPerformanceResultsAsMarkdown = exportResultsAsMarkdown;
  
  console.log('性能监控工具已加载，可使用以下命令：');
  console.log('- startPerformanceMonitoring() - 开始监控');
  console.log('- stopPerformanceMonitoring() - 停止监控');
  console.log('- getPerformanceResults() - 获取监控结果');
  console.log('- exportPerformanceResultsAsMarkdown() - 导出为Markdown');
}

// 为NodeJS环境导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startMonitoring,
    stopMonitoring,
    getMonitoringResults,
    exportResultsAsMarkdown
  };
} 