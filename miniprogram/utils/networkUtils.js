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
export const getNetworkStatus = () => {
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
export const onNetworkStatusChange = (callback) => {
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
export const initNetworkListener = () => {
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
export const hasNetworkConnection = () => {
  return isConnected;
};

/**
 * 判断当前是否为弱网环境
 * @returns {boolean}
 */
export const isWeakNetwork = () => {
  // 2g、3g或未知网络类型视为弱网
  return networkType === '2g' || networkType === '3g' || 
    signalStrength === 'poor' || signalStrength === 'fair';
};

/**
 * 判断当前是否为强网环境（5G/4G/高速WiFi）
 * @returns {boolean}
 */
export const isStrongNetwork = () => {
  return networkType === '5g' || networkType === '4g' || 
    (networkType === 'wifi' && signalStrength === 'excellent');
};

/**
 * 获取网络类型
 * @returns {string} - 'wifi', '4g', '3g', '2g', 'unknown' 或 'none'
 */
export const getNetworkType = () => {
  return networkType;
};

/**
 * 测量当前网络延迟
 * @param {string} url 测试URL
 * @returns {Promise<number>} 延迟时间(ms)
 */
export const measureNetworkLatency = async (url = 'https://api.xiuhuazhen.com/ping') => {
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
export const estimateNetworkBandwidth = async () => {
  // 基于网络类型和延迟粗略估计带宽
  const latency = await measureNetworkLatency();
  
  if (latency < 0) {
    return 'unknown';
  }
  
  // 根据网络类型和延迟综合判断带宽
  if (networkType === '5g' || (networkType === 'wifi' && latency < 50)) {
    return 'very_high'; // >50Mbps
  } else if (networkType === '4g' || (networkType === 'wifi' && latency < 100)) {
    return 'high'; // 10-50Mbps
  } else if (networkType === '3g' || (networkType === 'wifi' && latency < 200)) {
    return 'medium'; // 1-10Mbps
  } else if (networkType === '2g' || latency > 500) {
    return 'low'; // <1Mbps
  } else {
    return 'medium'; // 默认中等带宽
  }
};

/**
 * 获取当前网络详情（综合信息）
 * @returns {Promise<Object>} 网络详情
 */
export const getNetworkDetails = async () => {
  // 获取基本网络状态
  const status = await getNetworkStatus();
  
  // 测量额外指标
  const [latency, bandwidthEstimate] = await Promise.all([
    measureNetworkLatency(),
    estimateNetworkBandwidth()
  ]);
  
  // 获取当前时间和地理位置信息
  const timestamp = Date.now();
  const timeStr = new Date(timestamp).toLocaleString();
  
  return {
    ...status,
    latency: latency >= 0 ? latency : 'unknown',
    bandwidth: bandwidthEstimate,
    timestamp,
    timeStr,
    isWeak: isWeakNetwork(),
    isStrong: isStrongNetwork()
  };
};

/**
 * 返回适合当前网络状态的配置参数
 * @returns {Object} 网络相关配置
 */
export const getNetworkAdaptiveConfig = () => {
  // 根据网络状态返回不同的配置
  if (isStrongNetwork()) {
    // 高速网络配置
    return {
      imageQuality: 'high',
      uploadChunkSize: 2 * 1024 * 1024, // 2MB
      concurrentUploads: 5,
      preloadLimit: 10,
      cacheTTL: 10 * 60 * 1000, // 10分钟
      syncInterval: 30 * 1000, // 30秒
      retryDelay: 1000 // 1秒
    };
  } else if (isWeakNetwork()) {
    // 弱网配置
    return {
      imageQuality: 'low',
      uploadChunkSize: 512 * 1024, // 512KB
      concurrentUploads: 2,
      preloadLimit: 3,
      cacheTTL: 30 * 60 * 1000, // 30分钟
      syncInterval: 120 * 1000, // 2分钟
      retryDelay: 5000 // 5秒
    };
  } else {
    // 默认网络配置
    return {
      imageQuality: 'medium',
      uploadChunkSize: 1024 * 1024, // 1MB
      concurrentUploads: 3,
      preloadLimit: 5,
      cacheTTL: 15 * 60 * 1000, // 15分钟
      syncInterval: 60 * 1000, // 1分钟
      retryDelay: 2000 // 2秒
    };
  }
}; 