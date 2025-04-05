import { getNetworkStatus } from './networkDetector';
import { storage, syncQueue } from './storageUtils';

// API基础配置
const API_CONFIG = {
  baseUrl: 'https://api.example.com/v1', // 替换为实际的API地址
  timeout: 15000, // 15秒超时
  headers: {
    'Content-Type': 'application/json'
  }
};

/**
 * 核心请求函数
 * @param {string} endpoint - API端点
 * @param {Object} options - 请求选项
 * @returns {Promise<any>}
 */
const request = async (endpoint, options = {}) => {
  const { method = 'GET', data, headers = {}, offline = false } = options;
  
  // 检查网络状态
  const isOnline = (await getNetworkStatus());
  
  // 如果离线且不允许离线操作，则抛出错误
  if (!isOnline && !offline) {
    throw new Error('无网络连接，请稍后再试');
  }
  
  // 构建请求URL
  const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.baseUrl}${endpoint}`;
  
  // 配置请求头
  const requestHeaders = {
    ...API_CONFIG.headers,
    ...headers
  };
  
  // 如果有身份验证信息，添加到头部
  const token = await storage.get('auth_token');
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  // 构建请求选项
  const requestOptions = {
    method,
    headers: requestHeaders,
    signal: AbortSignal.timeout(API_CONFIG.timeout)
  };
  
  // 如果有请求体，添加到请求选项中
  if (data) {
    requestOptions.body = JSON.stringify(data);
  }
  
  try {
    // 发送请求
    const response = await fetch(url, requestOptions);
    
    // 检查返回状态码
    if (!response.ok) {
      throw new Error(`请求失败: ${response.status} ${response.statusText}`);
    }
    
    // 解析返回结果
    const result = await response.json();
    
    return result;
  } catch (error) {
    // 处理网络错误或超时
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请稍后再试');
    }
    
    // 如果允许离线操作，添加到同步队列
    if (offline && method !== 'GET') {
      await syncQueue.add({
        endpoint,
        options,
        timestamp: Date.now()
      });
      
      return { 
        _offlineOperation: true,
        message: '操作已保存，将在网络恢复后同步'
      };
    }
    
    throw error;
  }
};

/**
 * API服务对象
 */
const apiService = {
  /**
   * 发送GET请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  get: (endpoint, options = {}) => {
    return request(endpoint, { ...options, method: 'GET' });
  },
  
  /**
   * 发送POST请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  post: (endpoint, data, options = {}) => {
    return request(endpoint, { ...options, method: 'POST', data });
  },
  
  /**
   * 发送PUT请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  put: (endpoint, data, options = {}) => {
    return request(endpoint, { ...options, method: 'PUT', data });
  },
  
  /**
   * 发送DELETE请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  delete: (endpoint, options = {}) => {
    return request(endpoint, { ...options, method: 'DELETE' });
  },
  
  /**
   * 支持离线操作的POST请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  offlinePost: (endpoint, data, options = {}) => {
    return request(endpoint, { ...options, method: 'POST', data, offline: true });
  },
  
  /**
   * 支持离线操作的PUT请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise<any>}
   */
  offlinePut: (endpoint, data, options = {}) => {
    return request(endpoint, { ...options, method: 'PUT', data, offline: true });
  },
  
  /**
   * 处理离线同步队列
   * @returns {Promise<Array>} - 处理结果
   */
  async processSyncQueue() {
    return await syncQueue.process(async (task) => {
      const { endpoint, options } = task;
      return await request(endpoint, { ...options, offline: false });
    });
  }
};

export default apiService; 