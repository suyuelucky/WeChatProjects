/**
 * 智能预加载器
 * 基于用户行为分析，智能预加载资源，提升用户体验
 * 
 * 创建时间: 2025-04-08 19:50:16
 * 创建者: Claude 3.7 Sonnet
 */

class IntelligentPreloader {
  constructor(options = {}) {
    // 基本配置
    this.options = Object.assign({
      // 默认配置
      maxPreloadResources: 10, // 最大预加载资源数量
      minCacheTime: 5 * 60 * 1000, // 最小缓存时间（5分钟）
      maxCacheTime: 30 * 60 * 1000, // 最大缓存时间（30分钟）
      preloadThreshold: 0.5, // 预加载阈值
      enableNetworkAwareness: true, // 启用网络感知
      enablePerformanceAwareness: true, // 启用性能感知
      debugMode: false // 调试模式
    }, options);
    
    // 内部状态
    this.isInitialized = false;
    this.isActive = false;
    this.preloadedResources = new Map(); // 已预加载的资源
    this.performanceMetrics = {
      networkType: 'unknown',
      devicePerformance: 'medium',
      lastUpdate: 0
    };
    
    // 统计数据
    this.statistics = {
      totalPreloads: 0,
      successfulPreloads: 0,
      usedPreloads: 0,
      preloadHitRate: 0
    };
    
    // 依赖项
    this.analysisEngine = null;
    this.networkManager = null;
    this.resourceCache = null;
  }
  
  // 初始化预加载器
  initialize(dependencies = {}) {
    if (this.isInitialized) {
      console.warn('智能预加载器已经初始化');
      return;
    }
    
    try {
      // 设置依赖项
      this.analysisEngine = dependencies.analysisEngine;
      this.networkManager = dependencies.networkManager;
      this.resourceCache = dependencies.resourceCache || this._createDefaultCache();
      
      // 检查必要依赖
      if (!this.analysisEngine) {
        throw new Error('缺少必要依赖: analysisEngine');
      }
      
      // 初始化性能监控
      this._initPerformanceMonitoring();
      
      // 标记为已初始化
      this.isInitialized = true;
      console.log('智能预加载器初始化成功');
    } catch (error) {
      console.error('智能预加载器初始化失败', error);
      throw error;
    }
  }
  
  // 内部方法: 创建默认缓存
  _createDefaultCache() {
    return {
      // 简单的内存缓存实现
      _cache: new Map(),
      
      get: function(key) {
        const item = this._cache.get(key);
        if (!item) return null;
        
        // 检查是否过期
        if (item.expireTime && item.expireTime < Date.now()) {
          this._cache.delete(key);
          return null;
        }
        
        return item.data;
      },
      
      set: function(key, data, ttl = 300000) { // 默认5分钟
        this._cache.set(key, {
          data: data,
          expireTime: Date.now() + ttl,
          createdAt: Date.now()
        });
      },
      
      has: function(key) {
        const item = this._cache.get(key);
        if (!item) return false;
        
        // 检查是否过期
        if (item.expireTime && item.expireTime < Date.now()) {
          this._cache.delete(key);
          return false;
        }
        
        return true;
      },
      
      delete: function(key) {
        return this._cache.delete(key);
      },
      
      clear: function() {
        this._cache.clear();
      },
      
      getAll: function() {
        const result = {};
        // 清理过期项并收集有效项
        this._cache.forEach((value, key) => {
          if (!value.expireTime || value.expireTime >= Date.now()) {
            result[key] = value.data;
          } else {
            this._cache.delete(key);
          }
        });
        return result;
      }
    };
  }
  
  // 内部方法: 初始化性能监控
  _initPerformanceMonitoring() {
    // 获取初始网络状态
    if (this.options.enableNetworkAwareness && this.networkManager) {
      this.performanceMetrics.networkType = this.networkManager.getNetworkType();
      
      // 监听网络变化
      this.networkManager.onNetworkStatusChange((res) => {
        this.performanceMetrics.networkType = res.networkType;
        this.performanceMetrics.lastUpdate = Date.now();
        
        if (this.options.debugMode) {
          console.log('网络状态变化:', res.networkType);
        }
      });
    } else {
      // 尝试使用微信API直接获取
      try {
        wx.getNetworkType({
          success: (res) => {
            this.performanceMetrics.networkType = res.networkType;
            this.performanceMetrics.lastUpdate = Date.now();
          }
        });
        
        // 监听网络状态变化
        wx.onNetworkStatusChange((res) => {
          this.performanceMetrics.networkType = res.networkType;
          this.performanceMetrics.lastUpdate = Date.now();
          
          if (this.options.debugMode) {
            console.log('网络状态变化:', res.networkType);
          }
        });
      } catch (error) {
        console.warn('无法获取网络状态:', error);
      }
    }
    
    // 估计设备性能
    this._estimateDevicePerformance();
  }
  
  // 内部方法: 估计设备性能
  _estimateDevicePerformance() {
    try {
      const systemInfo = wx.getSystemInfoSync();
      
      // 简单的性能评估逻辑
      if (systemInfo.platform === 'ios') {
        // iOS设备性能评估
        const model = systemInfo.model;
        const version = parseInt(systemInfo.system.split(' ')[1]) || 0;
        
        if (model.includes('iPhone X') || model.includes('iPhone 11') || 
            model.includes('iPhone 12') || model.includes('iPhone 13') ||
            model.includes('iPhone 14') || model.includes('iPhone 15') ||
            model.includes('iPad Pro')) {
          this.performanceMetrics.devicePerformance = 'high';
        } else if (version >= 13) {
          this.performanceMetrics.devicePerformance = 'medium';
        } else {
          this.performanceMetrics.devicePerformance = 'low';
        }
      } else if (systemInfo.platform === 'android') {
        // Android设备性能评估
        if (systemInfo.benchmarkLevel >= 50) {
          this.performanceMetrics.devicePerformance = 'high';
        } else if (systemInfo.benchmarkLevel >= 30) {
          this.performanceMetrics.devicePerformance = 'medium';
        } else {
          this.performanceMetrics.devicePerformance = 'low';
        }
      }
      
      if (this.options.debugMode) {
        console.log('设备性能评估:', this.performanceMetrics.devicePerformance);
      }
    } catch (error) {
      console.warn('无法评估设备性能:', error);
    }
  }
  
  // 启动预加载器
  start() {
    if (!this.isInitialized) {
      throw new Error('智能预加载器未初始化');
    }
    
    if (this.isActive) {
      console.warn('智能预加载器已经在运行中');
      return;
    }
    
    this.isActive = true;
    console.log('智能预加载器已启动');
  }
  
  // 停止预加载器
  stop() {
    if (!this.isActive) {
      console.warn('智能预加载器未在运行');
      return;
    }
    
    this.isActive = false;
    console.log('智能预加载器已停止');
  }
  
  // 页面切换时调用，执行预加载
  onPageChange(pageInfo) {
    if (!this.isInitialized || !this.isActive) {
      return;
    }
    
    const { currentPage, previousPage } = pageInfo;
    
    // 1. 记录预加载命中情况
    this._recordPreloadHits(currentPage);
    
    // 2. 获取预加载建议
    const preloadSuggestions = this._getPreloadSuggestions(currentPage);
    
    // 3. 执行预加载
    if (preloadSuggestions && preloadSuggestions.shouldPreload) {
      this._executePreload(preloadSuggestions.resources);
    }
    
    if (this.options.debugMode) {
      console.log('页面切换触发预加载:', {
        from: previousPage,
        to: currentPage,
        suggestions: preloadSuggestions
      });
    }
  }
  
  // 内部方法: 记录预加载命中情况
  _recordPreloadHits(currentPage) {
    // 遍历已预加载资源，检查哪些被当前页面使用
    let hitCount = 0;
    
    this.preloadedResources.forEach((resourceInfo, url) => {
      if (resourceInfo.targetPages.includes(currentPage)) {
        // 预加载命中
        hitCount++;
        resourceInfo.hit = true;
        
        // 更新统计
        this.statistics.usedPreloads++;
        
        if (this.options.debugMode) {
          console.log('预加载命中:', url);
        }
      }
    });
    
    // 清理过期或已命中的预加载资源
    this._cleanupPreloadedResources();
    
    // 更新命中率
    if (this.statistics.totalPreloads > 0) {
      this.statistics.preloadHitRate = this.statistics.usedPreloads / this.statistics.totalPreloads;
    }
    
    return hitCount;
  }
  
  // 内部方法: 清理预加载资源
  _cleanupPreloadedResources() {
    const now = Date.now();
    
    this.preloadedResources.forEach((resourceInfo, url) => {
      // 清理已命中或过期的资源
      if (resourceInfo.hit || now - resourceInfo.timestamp > this.options.maxCacheTime) {
        this.preloadedResources.delete(url);
      }
    });
  }
  
  // 内部方法: 获取预加载建议
  _getPreloadSuggestions(currentPage) {
    // 检查行为分析引擎
    if (!this.analysisEngine) {
      return null;
    }
    
    // 准备上下文信息
    const context = {
      currentPage: currentPage,
      networkType: this.performanceMetrics.networkType,
      devicePerformance: this.performanceMetrics.devicePerformance,
      recentEvents: [] // 这里可以添加最近的事件
    };
    
    // 获取预加载建议
    try {
      return this.analysisEngine.getPreloadSuggestions(context);
    } catch (error) {
      console.error('获取预加载建议失败:', error);
      return null;
    }
  }
  
  // 内部方法: 执行预加载
  _executePreload(resources) {
    if (!Array.isArray(resources) || resources.length === 0) {
      return;
    }
    
    // 限制预加载资源数量
    const resourcesToPreload = resources.slice(0, this.options.maxPreloadResources);
    
    // 根据网络状态调整预加载策略
    if (this.options.enableNetworkAwareness) {
      // 非WiFi环境下减少预加载数量
      if (this.performanceMetrics.networkType !== 'wifi') {
        resourcesToPreload.length = Math.min(resourcesToPreload.length, 3);
      }
      
      // 弱网环境下停止预加载
      if (this.performanceMetrics.networkType === '2g' || 
          this.performanceMetrics.networkType === 'none') {
        console.log('网络条件较差，暂停预加载');
        return;
      }
    }
    
    // 记录总预加载次数
    this.statistics.totalPreloads += resourcesToPreload.length;
    
    // 执行预加载
    resourcesToPreload.forEach(resource => {
      this._preloadResource(resource);
    });
  }
  
  // 内部方法: 预加载单个资源
  _preloadResource(resource) {
    const { url, type, priority, source } = resource;
    
    // 检查是否已缓存
    if (this.resourceCache.has(url)) {
      if (this.options.debugMode) {
        console.log('资源已缓存，跳过预加载:', url);
      }
      return;
    }
    
    // 判断资源类型，使用不同的预加载策略
    try {
      let preloadPromise = null;
      
      switch (type) {
        case 'api':
          preloadPromise = this._preloadApiData(url);
          break;
        case 'image':
          preloadPromise = this._preloadImage(url);
          break;
        default:
          // 默认使用请求预加载
          preloadPromise = this._preloadGenericResource(url);
          break;
      }
      
      // 处理预加载结果
      if (preloadPromise) {
        preloadPromise.then(result => {
          // 记录预加载成功
          this.statistics.successfulPreloads++;
          
          // 保存到预加载资源列表
          this.preloadedResources.set(url, {
            type,
            timestamp: Date.now(),
            priority,
            hit: false,
            targetPages: source.split(',')
          });
          
          if (this.options.debugMode) {
            console.log('预加载成功:', url);
          }
        }).catch(error => {
          if (this.options.debugMode) {
            console.error('预加载失败:', url, error);
          }
        });
      }
    } catch (error) {
      console.error('预加载过程出错:', error);
    }
  }
  
  // 内部方法: 预加载API数据
  _preloadApiData(url) {
    return new Promise((resolve, reject) => {
      // 使用微信请求API
      wx.request({
        url: url,
        method: 'GET',
        success: (res) => {
          // 缓存响应数据
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // 计算缓存时长（根据优先级调整）
            const ttl = this.options.minCacheTime;
            this.resourceCache.set(url, res.data, ttl);
            resolve(res.data);
          } else {
            reject(new Error(`API请求失败: ${res.statusCode}`));
          }
        },
        fail: reject
      });
    });
  }
  
  // 内部方法: 预加载图片
  _preloadImage(url) {
    return new Promise((resolve, reject) => {
      // 使用微信图片预加载API
      const manager = wx.createImageManager();
      manager.download({
        src: url,
        success: (res) => {
          this.resourceCache.set(url, res.path, this.options.minCacheTime);
          resolve(res.path);
        },
        fail: reject
      });
    });
  }
  
  // 内部方法: 预加载通用资源
  _preloadGenericResource(url) {
    return new Promise((resolve, reject) => {
      // 使用微信下载文件API
      wx.downloadFile({
        url: url,
        success: (res) => {
          if (res.statusCode === 200) {
            this.resourceCache.set(url, res.tempFilePath, this.options.minCacheTime);
            resolve(res.tempFilePath);
          } else {
            reject(new Error(`下载失败: ${res.statusCode}`));
          }
        },
        fail: reject
      });
    });
  }
  
  // 获取缓存资源
  getResource(url) {
    // 从缓存获取资源
    const resource = this.resourceCache.get(url);
    
    // 如果找到资源，更新统计
    if (resource && this.preloadedResources.has(url)) {
      const resourceInfo = this.preloadedResources.get(url);
      if (!resourceInfo.hit) {
        resourceInfo.hit = true;
        this.statistics.usedPreloads++;
        this.preloadedResources.set(url, resourceInfo);
      }
    }
    
    return resource;
  }
  
  // 获取统计数据
  getStatistics() {
    return {
      ...this.statistics,
      currentPreloadCount: this.preloadedResources.size,
      performanceMetrics: { ...this.performanceMetrics }
    };
  }
  
  // 清理所有预加载资源
  clearPreloadedResources() {
    this.preloadedResources.clear();
    this.resourceCache.clear();
    console.log('已清理所有预加载资源');
  }
}

module.exports = IntelligentPreloader; 