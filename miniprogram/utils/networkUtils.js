/**
 * 小程序网络状态检测工具
 * 提供网络状态检测、变化监听和离线功能支持
 */

let networkType = 'unknown';
let isConnected = true;
let signalStrength = 'unknown'; // 网络信号强度
const listeners = [];

/**
 * 获取当前网络状态
 * @returns {Promise<{networkType: string, isConnected: boolean, signalStrength: string}>}
 */
const getNetworkStatus = () => {
  return new Promise((resolve) => {
    wx.getNetworkType({
      success: (res) => {
        networkType = res.networkType;
        isConnected = res.networkType !== 'none';
        signalStrength = getSignalStrengthByNetworkType(res.networkType);
        
        resolve({
          networkType: res.networkType,
          isConnected: res.networkType !== 'none',
          signalStrength
        });
      },
      fail: () => {
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
};

/**
 * 基于网络类型判断信号强度
 * @param {string} type 网络类型
 * @returns {string} 信号强度描述
 */
const getSignalStrengthByNetworkType = (type) => {
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
};

/**
 * 检测WiFi信号强度
 * @returns {string} WiFi信号强度描述
 */
const detectWifiStrength = () => {
  // 由于小程序API限制，目前无法直接获取WiFi信号强度
  // 使用ping测试作为间接方法评估WiFi质量
  return 'good'; // 默认认为WiFi信号良好
};

/**
 * 监听网络状态变化
 * @param {Function} callback - 网络状态变化回调函数
 * @returns {Function} - 取消监听的函数
 */
const onNetworkStatusChange = (callback) => {
  if (typeof callback !== 'function') return () => {};
  
  // 保存回调函数
  listeners.push(callback);
  
  // 首次获取网络状态
  getNetworkStatus().then(callback);
  
  // 返回取消监听的函数
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

/**
 * 初始化网络监听（应用启动时调用）
 */
const initNetworkListener = () => {
  // 监听网络状态变化
  wx.onNetworkStatusChange((res) => {
    networkType = res.networkType;
    isConnected = res.isConnected;
    signalStrength = getSignalStrengthByNetworkType(res.networkType);
    
    // 通知所有监听器
    listeners.forEach(callback => {
      try {
        callback({
          networkType: res.networkType,
          isConnected: res.isConnected,
          signalStrength
        });
      } catch (error) {
        console.error('网络状态变化回调执行失败:', error);
      }
    });
  });
  
  // 初始获取网络状态
  return getNetworkStatus();
};

/**
 * 判断当前是否有网络连接
 * @returns {boolean}
 */
const hasNetworkConnection = () => {
  return isConnected;
};

/**
 * 判断当前是否为弱网环境
 * @returns {boolean}
 */
const isWeakNetwork = () => {
  // 2g、3g或未知网络类型视为弱网
  return networkType === '2g' || networkType === '3g' || 
    signalStrength === 'poor' || signalStrength === 'fair';
};

/**
 * 判断当前是否为强网环境（5G/4G/高速WiFi）
 * @returns {boolean}
 */
const isStrongNetwork = () => {
  return networkType === '5g' || networkType === '4g' || 
    (networkType === 'wifi' && signalStrength === 'excellent');
};

/**
 * 获取网络类型
 * @returns {string} - 'wifi', '4g', '3g', '2g', 'unknown' 或 'none'
 */
const getNetworkType = () => {
  return networkType;
};

/**
 * 测量当前网络延迟
 * @param {string} url 测试URL
 * @returns {Promise<number>} 延迟时间(ms)
 */
const measureNetworkLatency = async (url = 'https://api.xiuhuazhen.com/ping') => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    wx.request({
      url,
      method: 'HEAD',
      success: () => {
        const latency = Date.now() - startTime;
        resolve(latency);
      },
      fail: () => {
        resolve(-1); // 失败时返回-1表示无法测量
      }
    });
  });
};

/**
 * 获取当前网络带宽估计
 * @returns {Promise<string>} 带宽等级描述
 */
const estimateNetworkBandwidth = async () => {
  // 基于网络类型和延迟粗略估计带宽
  const latency = await measureNetworkLatency();
  
  if (latency < 0) {
    return 'unknown';
  }
  
  // 根据网络类型和延迟综合判断带宽
  if (networkType === '5g' || (networkType === '4g' && latency < 50)) {
    return 'high';
  } else if (networkType === '4g' || (networkType === 'wifi' && latency < 100)) {
    return 'medium';
  } else if (networkType === '3g' || (networkType === 'wifi' && latency < 300)) {
    return 'low';
  } else {
    return 'very-low';
  }
};

/**
 * 获取详细网络信息
 * @returns {Promise<Object>} 网络详情
 */
const getNetworkDetails = async () => {
  const status = await getNetworkStatus();
  const latency = await measureNetworkLatency();
  const bandwidth = await estimateNetworkBandwidth();
  
  return {
    ...status,
    latency,
    bandwidth,
    timestamp: Date.now(),
    // 计算网络质量评分 (0-100)
    qualityScore: calculateNetworkQualityScore(status.networkType, latency, bandwidth),
    // 网络质量分级
    qualityLevel: getNetworkQualityLevel(status.networkType, latency, bandwidth)
  };
};

/**
 * 根据网络状况获取适应性配置
 * @returns {Object} 适应不同网络环境的配置
 */
const getNetworkAdaptiveConfig = () => {
  // 基础配置
  const config = {
    timeout: 30000,            // 请求超时时间(ms)
    retryCount: 3,             // 重试次数
    retryDelay: 1000,          // 重试间隔(ms)
    imageQuality: 'normal',    // 图片质量
    preloadEnabled: true,      // 是否启用预加载
    cacheDuration: 3600,       // 缓存时长(s)
    backgroundSync: true,      // 后台同步
    offlineMode: false,        // 离线模式
    batchRequests: true,       // 批量请求
    compressionEnabled: false, // 数据压缩
    trackingEnabled: true,     // 跟踪启用
    syncInterval: 30000        // 同步间隔(ms)
  };
  
  // 根据网络类型调整配置
  if (networkType === 'none') {
    // 无网络
    config.offlineMode = true;
    config.timeout = 5000;
    config.retryCount = 0;
    config.preloadEnabled = false;
    config.backgroundSync = false;
    config.trackingEnabled = false;
    config.syncInterval = 120000; // 长间隔尝试同步
  } else if (isWeakNetwork()) {
    // 弱网环境
    config.timeout = 45000;
    config.retryCount = 5;
    config.retryDelay = 2000;
    config.imageQuality = 'low';
    config.preloadEnabled = false;
    config.cacheDuration = 7200;
    config.batchRequests = true;
    config.compressionEnabled = true;
    config.syncInterval = 60000;
  } else if (isStrongNetwork()) {
    // 强网环境
    config.timeout = 15000;
    config.retryCount = 2;
    config.retryDelay = 500;
    config.imageQuality = 'high';
    config.preloadEnabled = true;
    config.cacheDuration = 1800;
    config.compressionEnabled = false;
    config.syncInterval = 10000;
  }
  
  return config;
};

/**
 * 计算网络质量评分(0-100)
 * @param {string} networkType 网络类型
 * @param {number} latency 网络延迟
 * @param {string} bandwidth 带宽等级
 * @returns {number} 质量评分
 */
const calculateNetworkQualityScore = (networkType, latency, bandwidth) => {
  // 基础分
  let score = 50;
  
  // 根据网络类型加分
  if (networkType === '5g') score += 30;
  else if (networkType === '4g') score += 20;
  else if (networkType === 'wifi') score += 25;
  else if (networkType === '3g') score += 10;
  else if (networkType === '2g') score += 5;
  else if (networkType === 'none') score = 0;
  
  // 根据延迟调整分数
  if (latency > 0) {
    if (latency < 50) score += 20;
    else if (latency < 100) score += 15;
    else if (latency < 200) score += 10;
    else if (latency < 500) score += 0;
    else if (latency < 1000) score -= 10;
    else score -= 20;
  }
  
  // 根据带宽调整
  if (bandwidth === 'high') score += 5;
  else if (bandwidth === 'medium') score += 0;
  else if (bandwidth === 'low') score -= 5;
  else if (bandwidth === 'very-low') score -= 10;
  
  // 确保分数在0-100范围内
  return Math.max(0, Math.min(100, score));
};

/**
 * 获取网络质量等级
 * @param {string} networkType 网络类型
 * @param {number} latency 网络延迟
 * @param {string} bandwidth 带宽等级
 * @returns {string} 质量等级
 */
const getNetworkQualityLevel = (networkType, latency, bandwidth) => {
  const score = calculateNetworkQualityScore(networkType, latency, bandwidth);
  
  if (score >= 80) return 'excellent';
  else if (score >= 60) return 'good';
  else if (score >= 40) return 'fair';
  else if (score >= 20) return 'poor';
  else return 'critical';
};

// 导出网络工具模块
module.exports = {
  getNetworkStatus,
  onNetworkStatusChange,
  initNetworkListener,
  hasNetworkConnection,
  isWeakNetwork,
  isStrongNetwork,
  getNetworkType,
  measureNetworkLatency,
  estimateNetworkBandwidth,
  getNetworkDetails,
  getNetworkAdaptiveConfig
}; 