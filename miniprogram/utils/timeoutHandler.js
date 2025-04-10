/**
 * 超时处理工具
 * 用于处理网络请求超时和相关异常情况
 * 符合ES5标准，兼容微信小程序环境
 */

var ErrorCollector = require('./error-collector.js');
var networkUtils = require('./networkUtils.js');

/**
 * 超时记录存储
 */
var timeoutRecords = [];

/**
 * 超时统计
 */
var timeoutStats = {
  total: 0,
  byHost: {},
  byAPI: {},
  byNetwork: {}
};

/**
 * 网络环境与推荐超时时间的映射
 */
var NETWORK_TIMEOUT_MAP = {
  '5g': 20000,   // 5G网络 - 20秒
  '4g': 25000,   // 4G网络 - 25秒
  'wifi': 20000, // WIFI - 20秒
  '3g': 30000,   // 3G网络 - 30秒
  '2g': 45000,   // 2G网络 - 45秒
  'none': 5000,  // 离线 - 5秒(快速失败)
  'unknown': 30000 // 未知网络 - 30秒
};

/**
 * 根据URL提取API路径
 * @param {string} url 请求URL
 * @return {string} API路径
 */
function extractAPIPath(url) {
  if (!url) return 'unknown';
  
  try {
    // 移除查询参数
    var pathOnly = url.split('?')[0];
    
    // 提取主要路径部分
    var parts = pathOnly.split('/');
    if (parts.length < 4) return pathOnly;
    
    // 返回最后2-3段作为API标识
    return parts.slice(-3).join('/');
  } catch (err) {
    return 'unknown';
  }
}

/**
 * 从URL提取主机名
 * @param {string} url 请求URL
 * @return {string} 主机名
 */
function extractHostname(url) {
  if (!url) return 'unknown';
  
  try {
    // 检查是否有协议
    var hasProtocol = url.indexOf('://') > -1;
    
    if (hasProtocol) {
      // 从URL中提取主机名
      var hostname = url.split('://')[1].split('/')[0];
      return hostname;
    } else {
      // 如果没有协议，则使用第一段作为主机标识
      return url.split('/')[0];
    }
  } catch (err) {
    return 'unknown';
  }
}

/**
 * 记录超时事件
 * @param {string} url 请求URL
 * @param {Object} requestOptions 请求选项
 * @param {Object} error 错误对象
 */
function recordTimeout(url, requestOptions, error) {
  var currentTime = Date.now();
  var networkType = networkUtils.getNetworkType();
  var apiPath = extractAPIPath(url);
  var hostname = extractHostname(url);
  
  // 创建超时记录
  var timeoutRecord = {
    url: url,
    method: requestOptions.method || 'GET',
    timestamp: currentTime,
    networkType: networkType,
    timeout: requestOptions.timeout || 'default',
    error: error ? {
      errMsg: error.errMsg,
      errCode: error.errCode
    } : null,
    apiPath: apiPath,
    hostname: hostname
  };
  
  // 保存记录
  timeoutRecords.push(timeoutRecord);
  
  // 限制记录数量
  if (timeoutRecords.length > 100) {
    timeoutRecords.shift();
  }
  
  // 更新统计数据
  timeoutStats.total++;
  
  // 按主机名统计
  if (!timeoutStats.byHost[hostname]) {
    timeoutStats.byHost[hostname] = 0;
  }
  timeoutStats.byHost[hostname]++;
  
  // 按API路径统计
  if (!timeoutStats.byAPI[apiPath]) {
    timeoutStats.byAPI[apiPath] = 0;
  }
  timeoutStats.byAPI[apiPath]++;
  
  // 按网络类型统计
  if (!timeoutStats.byNetwork[networkType]) {
    timeoutStats.byNetwork[networkType] = 0;
  }
  timeoutStats.byNetwork[networkType]++;
  
  // 记录到错误收集器
  ErrorCollector.reportError('network-timeout', '请求超时', {
    url: url,
    method: requestOptions.method || 'GET',
    networkType: networkType,
    timeout: requestOptions.timeout || 'default',
    apiPath: apiPath,
    hostname: hostname
  });
}

/**
 * 获取建议的超时时间
 * @param {string} url 请求URL
 * @param {Object} options 请求选项
 * @return {number} 建议的超时时间(毫秒)
 */
function getSuggestedTimeout(url, options) {
  var networkType = networkUtils.getNetworkType();
  var baseTimeout = NETWORK_TIMEOUT_MAP[networkType] || 30000;
  
  // 根据主机名调整超时时间
  var hostname = extractHostname(url);
  
  // 判断是否为高延迟主机
  var isHighLatencyHost = timeoutStats.byHost[hostname] && 
                          timeoutStats.byHost[hostname] > 5;
  
  // 如果是高延迟主机，增加50%超时时间
  if (isHighLatencyHost) {
    baseTimeout = Math.floor(baseTimeout * 1.5);
  }
  
  // 判断是否为关键请求
  var isImportantRequest = options.important === true;
  
  // 如果是重要请求，增加额外超时时间
  if (isImportantRequest) {
    baseTimeout += 10000;
  }
  
  return baseTimeout;
}

/**
 * 获取所有超时记录
 * @return {Array} 超时记录数组
 */
function getTimeoutRecords() {
  return timeoutRecords.slice();
}

/**
 * 获取超时统计信息
 * @return {Object} 超时统计数据
 */
function getTimeoutStats() {
  return JSON.parse(JSON.stringify(timeoutStats));
}

/**
 * 分析超时问题并生成报告
 * @return {string} 超时分析报告
 */
function analyzeTimeouts() {
  if (timeoutStats.total === 0) {
    return '暂无超时记录';
  }
  
  var report = '超时问题分析报告\n';
  report += '==============\n\n';
  
  // 总体情况
  report += '总计超时次数: ' + timeoutStats.total + '\n\n';
  
  // 按网络类型分析
  report += '按网络类型分布:\n';
  for (var network in timeoutStats.byNetwork) {
    if (timeoutStats.byNetwork.hasOwnProperty(network)) {
      var percentage = Math.round((timeoutStats.byNetwork[network] / timeoutStats.total) * 100);
      report += network + ': ' + timeoutStats.byNetwork[network] + ' 次 (' + percentage + '%)\n';
    }
  }
  report += '\n';
  
  // 按主机名分析
  report += '按服务器主机分布:\n';
  var hostEntries = [];
  for (var host in timeoutStats.byHost) {
    if (timeoutStats.byHost.hasOwnProperty(host)) {
      hostEntries.push({
        host: host,
        count: timeoutStats.byHost[host]
      });
    }
  }
  
  // 按超时次数排序
  hostEntries.sort(function(a, b) {
    return b.count - a.count;
  });
  
  // 显示前5个主机
  for (var i = 0; i < Math.min(5, hostEntries.length); i++) {
    var entry = hostEntries[i];
    var percentage = Math.round((entry.count / timeoutStats.total) * 100);
    report += entry.host + ': ' + entry.count + ' 次 (' + percentage + '%)\n';
  }
  report += '\n';
  
  // 按API路径分析
  report += '按API路径分布:\n';
  var apiEntries = [];
  for (var api in timeoutStats.byAPI) {
    if (timeoutStats.byAPI.hasOwnProperty(api)) {
      apiEntries.push({
        api: api,
        count: timeoutStats.byAPI[api]
      });
    }
  }
  
  // 按超时次数排序
  apiEntries.sort(function(a, b) {
    return b.count - a.count;
  });
  
  // 显示前5个API
  for (var i = 0; i < Math.min(5, apiEntries.length); i++) {
    var entry = apiEntries[i];
    var percentage = Math.round((entry.count / timeoutStats.total) * 100);
    report += entry.api + ': ' + entry.count + ' 次 (' + percentage + '%)\n';
  }
  
  return report;
}

/**
 * 清空所有超时记录和统计
 */
function clearTimeoutData() {
  timeoutRecords = [];
  timeoutStats = {
    total: 0,
    byHost: {},
    byAPI: {},
    byNetwork: {}
  };
}

module.exports = {
  recordTimeout: recordTimeout,
  getSuggestedTimeout: getSuggestedTimeout,
  getTimeoutRecords: getTimeoutRecords,
  getTimeoutStats: getTimeoutStats,
  analyzeTimeouts: analyzeTimeouts,
  clearTimeoutData: clearTimeoutData
}; 