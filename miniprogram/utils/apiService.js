/**
 * API服务模块
 * 提供网络请求、离线操作和同步队列管理功能
 */

const { hasNetworkConnection } = require('./networkUtils');
const { syncQueue } = require('./storageUtils');

// API基础配置
const API_CONFIG = {
  baseUrl: 'https://api.example.com/v1', // 替换为实际的API地址
  timeout: 15000, // 15秒超时
  header: {
    'content-type': 'application/json'
  }
};

/**
 * 获取存储的token
 * @returns {Promise<string|null>}
 */
const getToken = async () => {
  try {
    return wx.getStorageSync('auth_token') || null;
  } catch (error) {
    console.error('获取token失败:', error);
    return null;
  }
};

/**
 * 核心请求函数
 * @param {string} url - API端点
 * @param {Object} options - 请求选项
 * @returns {Promise<any>}
 */
const request = (url, options = {}) => {
  return new Promise(async (resolve, reject) => {
    const { 
      method = 'GET', 
      data, 
      header = {}, 
      offline = false,
      retryCount = 0,
      maxRetries = 3
    } = options;
    
    // 如果离线且不允许离线操作，则拒绝请求
    if (!hasNetworkConnection() && !offline) {
      return reject(new Error('无网络连接，请稍后再试'));
    }
    
    // 构建完整URL
    const apiUrl = url.startsWith('http') ? url : `${API_CONFIG.baseUrl}${url}`;
    
    // 合并请求头
    const requestHeader = {
      ...API_CONFIG.header,
      ...header
    };
    
    // 添加认证信息
    const token = await getToken();
    if (token) {
      requestHeader['Authorization'] = `Bearer ${token}`;
    }
    
    // 发起请求
    const requestTask = wx.request({
      url: apiUrl,
      data,
      method,
      header: requestHeader,
      timeout: API_CONFIG.timeout,
      success: (response) => {
        const { statusCode, data } = response;
        
        // 请求成功
        if (statusCode >= 200 && statusCode < 300) {
          resolve(data);
        } 
        // 需要重试的状态码
        else if ([408, 429, 500, 502, 503, 504].includes(statusCode) && retryCount < maxRetries) {
          console.log(`请求失败，状态码: ${statusCode}，第${retryCount + 1}次重试`);
          setTimeout(() => {
            request(url, { 
              ...options, 
              retryCount: retryCount + 1 
            }).then(resolve).catch(reject);
          }, Math.pow(2, retryCount) * 1000); // 指数退避策略
        } 
        // 其他错误
        else {
          reject(new Error(`请求失败: ${statusCode} ${data.message || ''}`));
        }
      },
      fail: (error) => {
        console.error('请求失败:', error);
        
        // 如果允许离线操作且不是GET请求，则添加到同步队列
        if (offline && method !== 'GET') {
          syncQueue.add({
            url,
            options: {
              method,
              data,
              header
            },
            timestamp: Date.now()
          }).then(() => {
            resolve({
              _offlineOperation: true,
              message: '操作已保存，将在网络恢复后同步'
            });
          }).catch(reject);
        } else {
          reject(error);
        }
      }
    });
    
    // 超时自动取消
    setTimeout(() => {
      try {
        requestTask.abort();
      } catch (error) {
        console.error('取消请求失败:', error);
      }
    }, API_CONFIG.timeout);
  });
};

/**
 * API服务对象
 */
const apiService = {
  /**
   * 发送GET请求
   * @param {string} url - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  get: (url, options = {}) => {
    return request(url, { ...options, method: 'GET' });
  },
  
  /**
   * 发送POST请求
   * @param {string} url - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  post: (url, data, options = {}) => {
    return request(url, { ...options, method: 'POST', data });
  },
  
  /**
   * 发送PUT请求
   * @param {string} url - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  put: (url, data, options = {}) => {
    return request(url, { ...options, method: 'PUT', data });
  },
  
  /**
   * 发送DELETE请求
   * @param {string} url - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  delete: (url, options = {}) => {
    return request(url, { ...options, method: 'DELETE' });
  },
  
  /**
   * 支持离线操作的POST请求
   * @param {string} url - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  offlinePost: (url, data, options = {}) => {
    return request(url, { ...options, method: 'POST', data, offline: true });
  },
  
  /**
   * 支持离线操作的PUT请求
   * @param {string} url - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  offlinePut: (url, data, options = {}) => {
    return request(url, { ...options, method: 'PUT', data, offline: true });
  },
  
  /**
   * 处理同步队列
   * @returns {Promise<Array>} - 处理结果
   */
  async processSyncQueue() {
    return await syncQueue.process(async (task) => {
      const { url, options } = task;
      return await request(url, { ...options, offline: false });
    });
  }
};

// 导出apiService实例
module.exports = apiService; 