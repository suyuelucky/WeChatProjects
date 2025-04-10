/**
 * 小程序网络状态检测工具
 * 提供网络状态检测、变化监听和离线功能支持
 */

var networkType = 'unknown';
var isConnected = true;
var signalStrength = 'unknown'; // 网络信号强度
var listeners = [];

/**
 * 获取当前网络状态
 * @returns {Promise<{networkType: string, isConnected: boolean, signalStrength: string}>}
 */
function getNetworkStatus() {
  return new Promise(function(resolve) {
    wx.getNetworkType({
      success: function(res) {
        networkType = res.networkType;
        isConnected = res.networkType !== 'none';
        signalStrength = getSignalStrengthByNetworkType(res.networkType);
        
        resolve({
          networkType: res.networkType,
          isConnected: res.networkType !== 'none',
          signalStrength: signalStrength
        });
      },
      fail: function() {
        networkType = 'unknown';
        isConnected = false;
        signalStrength = 'unknown';
        
        resolve({
          networkType: 'unknown',
          isConnected: false,
          signalStrength: 'unknown'
        });
      }
    });
  });
}

/**
 * 基于网络类型判断信号强度
 * @param {string} type 网络类型
 * @returns {string} 信号强度描述
 */
function getSignalStrengthByNetworkType(type) {
  switch (type) {
    case '5g':
      return 'excellent';
    case '4g':
      return 'good';
    case 'wifi':
      // WiFi需进一步检测
      return detectWifiStrength();
    case '3g':
      return 'fair';
    case '2g':
      return 'poor';
    case 'none':
      return 'none';
    default:
      return 'unknown';
  }
}

/**
 * 检测WiFi信号强度
 * @returns {string} WiFi信号强度描述
 */
function detectWifiStrength() {
  // 由于小程序API限制，目前无法直接获取WiFi信号强度
  // 使用ping测试作为间接方法评估WiFi质量
  return 'good'; // 默认认为WiFi信号良好
}

/**
 * 监听网络状态变化
 * @param {Function} callback - 网络状态变化回调函数
 * @returns {Function} - 取消监听的函数
 */
function onNetworkStatusChange(callback) {
  if (typeof callback !== 'function') return function() {};
  
  // 保存回调函数
  listeners.push(callback);
  
  // 首次获取网络状态
  getNetworkStatus().then(function(status) {
    callback(status);
  });
  
  // 返回取消监听的函数
  return function() {
    var index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * 初始化网络监听（应用启动时调用）
 */
function initNetworkListener() {
  // 监听网络状态变化
  wx.onNetworkStatusChange(function(res) {
    networkType = res.networkType;
    isConnected = res.isConnected;
    signalStrength = getSignalStrengthByNetworkType(res.networkType);
    
    // 通知所有监听器
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i]({
          networkType: res.networkType,
          isConnected: res.isConnected,
          signalStrength: signalStrength
        });
      } catch (error) {
        console.error('网络状态变化回调执行失败:', error);
      }
    }
  });
  
  // 初始获取网络状态
  return getNetworkStatus();
}

/**
 * 判断当前是否有网络连接
 * @returns {boolean}
 */
function hasNetworkConnection() {
  return isConnected;
}

/**
 * 判断当前是否为弱网环境
 * @returns {boolean}
 */
function isWeakNetwork() {
  // 2g、3g或未知网络类型视为弱网
  return networkType === '2g' || networkType === '3g' || 
    signalStrength === 'poor' || signalStrength === 'fair';
}

/**
 * 判断当前是否为强网环境（5G/4G/高速WiFi）
 * @returns {boolean}
 */
function isStrongNetwork() {
  return networkType === '5g' || networkType === '4g' || 
    (networkType === 'wifi' && signalStrength === 'excellent');
}

/**
 * 获取网络类型
 * @returns {string} - 'wifi', '4g', '3g', '2g', 'unknown' 或 'none'
 */
function getNetworkType() {
  return networkType;
}

/**
 * 测量当前网络延迟
 * @param {string} url 测试URL
 * @returns {Promise<number>} 延迟时间(ms)
 */
function measureNetworkLatency(url) {
  url = url || 'https://api.xiuhuazhen.com/ping';
  
  return new Promise(function(resolve) {
    var startTime = Date.now();
    
    wx.request({
      url: url,
      method: 'HEAD',
      success: function() {
        var latency = Date.now() - startTime;
        resolve(latency);
      },
      fail: function() {
        resolve(-1); // 失败时返回-1表示无法测量
      }
    });
  });
}

/**
 * 获取当前网络带宽估计
 * @returns {Promise<string>} 带宽等级描述
 */
function estimateNetworkBandwidth() {
  // 基于网络类型和延迟粗略估计带宽
  return new Promise(function(resolve) {
    measureNetworkLatency().then(function(latency) {
      if (latency < 0) {
        resolve('unknown');
        return;
      }
      
      // 根据网络类型和延迟综合判断带宽
      if (networkType === '5g') {
        resolve(latency < 50 ? 'very-high' : 'high');
      } else if (networkType === '4g') {
        if (latency < 100) {
          resolve('high');
        } else if (latency < 200) {
          resolve('medium');
        } else {
          resolve('low');
        }
      } else if (networkType === 'wifi') {
        if (latency < 50) {
          resolve('very-high');
        } else if (latency < 150) {
          resolve('high');
        } else if (latency < 300) {
          resolve('medium');
        } else {
          resolve('low');
        }
      } else if (networkType === '3g') {
        resolve(latency < 300 ? 'medium-low' : 'low');
      } else {
        resolve('very-low');
      }
    });
  });
}

/**
 * 获取当前网络详细信息
 * @returns {Promise<Object>} 网络详细信息
 */
function getNetworkDetails() {
  return new Promise(function(resolve) {
    var networkDetails = {
      type: networkType,
      isConnected: isConnected,
      signalStrength: signalStrength
    };
    
    // 测量延迟
    measureNetworkLatency().then(function(latency) {
      networkDetails.latency = latency;
      
      // 估计带宽
      return estimateNetworkBandwidth();
    }).then(function(bandwidth) {
      networkDetails.bandwidthLevel = bandwidth;
      
      // 计算网络质量分数
      var qualityScore = calculateNetworkQualityScore(
        networkDetails.type, 
        networkDetails.latency, 
        networkDetails.bandwidthLevel
      );
      
      networkDetails.qualityScore = qualityScore;
      networkDetails.qualityLevel = getNetworkQualityLevel(qualityScore);
      
      resolve(networkDetails);
    });
  });
}

/**
 * 根据网络状态获取自适应配置
 * @returns {Object} 自适应配置参数
 */
function getNetworkAdaptiveConfig() {
  var config = {
    imageQuality: 'medium', // 图片质量: low, medium, high
    preferCache: false,     // 是否优先使用缓存
    autoSync: true,         // 是否自动同步
    syncInterval: 30,       // 同步间隔(分钟)
    offlineMode: false,     // 是否启用离线模式
    retryCount: 3,          // 请求失败重试次数
    timeout: 10000,         // 请求超时时间(ms)
    concurrentRequests: 6,  // 并发请求数
    preloadLevel: 2,        // 预加载级别
    compressionLevel: 0.8   // 压缩级别
  };
  
  // 根据网络类型和信号强度调整配置
  if (!isConnected) {
    // 离线状态
    config.imageQuality = 'low';
    config.preferCache = true;
    config.autoSync = false;
    config.offlineMode = true;
    config.timeout = 5000;
    config.concurrentRequests = 2;
    config.preloadLevel = 0;
    config.compressionLevel = 0.6;
  } else if (isWeakNetwork()) {
    // 弱网环境
    if (networkType === '2g') {
      config.imageQuality = 'low';
      config.preferCache = true;
      config.syncInterval = 60;
      config.timeout = 20000;
      config.concurrentRequests = 2;
      config.preloadLevel = 1;
      config.compressionLevel = 0.7;
      config.retryCount = 5;
    } else {
      // 3g或信号较弱的WiFi
      config.imageQuality = 'medium';
      config.preferCache = true;
      config.syncInterval = 45;
      config.timeout = 15000;
      config.concurrentRequests = 4;
      config.preloadLevel = 1;
      config.compressionLevel = 0.8;
    }
  } else if (isStrongNetwork()) {
    // 强网环境
    config.imageQuality = 'high';
    config.preferCache = false;
    config.syncInterval = 15;
    config.timeout = 10000;
    config.concurrentRequests = 8;
    config.preloadLevel = 3;
    config.compressionLevel = 0.9;
  }
  
  return config;
}

/**
 * 计算网络质量得分(0-100)
 * @param {string} networkType 网络类型
 * @param {number} latency 延迟(ms)
 * @param {string} bandwidth 带宽等级
 * @returns {number} 网络质量得分
 */
function calculateNetworkQualityScore(networkType, latency, bandwidth) {
  // 基础分数，根据网络类型
  var baseScore = 0;
  if (networkType === '5g') {
    baseScore = 90;
  } else if (networkType === '4g') {
    baseScore = 75;
  } else if (networkType === 'wifi') {
    baseScore = 80;
  } else if (networkType === '3g') {
    baseScore = 60;
  } else if (networkType === '2g') {
    baseScore = 40;
  } else if (networkType === 'none') {
    return 0;
  } else {
    baseScore = 50;
  }
  
  // 延迟调整
  var latencyScore = 0;
  if (latency <= 0) {
    latencyScore = 0; // 无法测量
  } else if (latency < 50) {
    latencyScore = 10;
  } else if (latency < 100) {
    latencyScore = 8;
  } else if (latency < 200) {
    latencyScore = 5;
  } else if (latency < 300) {
    latencyScore = 2;
  } else {
    latencyScore = -5; // 延迟过高扣分
  }
  
  // 带宽调整
  var bandwidthScore = 0;
  if (bandwidth === 'very-high') {
    bandwidthScore = 10;
  } else if (bandwidth === 'high') {
    bandwidthScore = 7;
  } else if (bandwidth === 'medium') {
    bandwidthScore = 5;
  } else if (bandwidth === 'low') {
    bandwidthScore = 2;
  } else if (bandwidth === 'very-low') {
    bandwidthScore = 0;
  } else {
    bandwidthScore = 3; // 未知带宽给中等偏下分数
  }
  
  // 计算总分，最高100分
  var totalScore = baseScore + latencyScore + bandwidthScore;
  return Math.max(0, Math.min(100, totalScore));
}

/**
 * 根据质量分数获取网络质量级别
 * @param {number} score 质量分数(0-100)
 * @returns {string} 质量级别描述
 */
function getNetworkQualityLevel(score) {
  if (score >= 90) {
    return 'excellent';
  } else if (score >= 75) {
    return 'good';
  } else if (score >= 60) {
    return 'fair';
  } else if (score >= 40) {
    return 'poor';
  } else if (score > 0) {
    return 'bad';
  } else {
    return 'offline';
  }
}

module.exports = {
  getNetworkStatus: getNetworkStatus,
  initNetworkListener: initNetworkListener,
  onNetworkStatusChange: onNetworkStatusChange,
  hasNetworkConnection: hasNetworkConnection,
  isWeakNetwork: isWeakNetwork,
  isStrongNetwork: isStrongNetwork,
  getNetworkType: getNetworkType,
  measureNetworkLatency: measureNetworkLatency,
  estimateNetworkBandwidth: estimateNetworkBandwidth,
  getNetworkDetails: getNetworkDetails,
  getNetworkAdaptiveConfig: getNetworkAdaptiveConfig
}; 