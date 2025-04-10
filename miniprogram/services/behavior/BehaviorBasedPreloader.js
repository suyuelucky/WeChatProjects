/**
 * 行为分析预加载器 - 基于用户行为的智能资源预加载适配器
 * 
 * 创建时间: 2025-04-08 19:58:26
 * 创建者: Claude 3.7 Sonnet
 * 
 * 描述: 该适配器将行为分析系统集成到网络请求管理模块中，提供基于用户行为分析的智能预加载能力
 */

// 严格模式
'use strict';

// 导入依赖组件
var BehaviorAnalysisSystem = require('./BehaviorAnalysisSystem');

/**
 * 行为分析预加载器 - 基于用户行为的智能预加载
 * @param {Object} options 配置选项
 * @param {Object} options.networkService 网络服务实例
 * @param {Object} options.behaviorSystem 行为分析系统或其配置
 * @param {Boolean} options.autoStart 是否自动启动，默认true
 * @param {Array} options.resourceMap 资源映射配置
 * @constructor
 */
function BehaviorBasedPreloader(options) {
  options = options || {};
  
  // 参数验证
  if (!options.networkService) {
    throw new Error('网络服务实例(networkService)不能为空');
  }
  
  // 基本配置
  this._config = {
    autoStart: options.autoStart !== false,
    debugMode: options.debugMode || false,
    preloadThreshold: options.preloadThreshold || 0.7, // 预加载概率阈值
    maxPreloadResources: options.maxPreloadResources || 5, // 最大预加载资源数
    preloadTimeout: options.preloadTimeout || 30000, // 预加载超时时间(ms)
    resourceMap: options.resourceMap || [] // 资源映射配置
  };
  
  // 保存网络服务实例
  this._networkService = options.networkService;
  
  // 内部状态
  this._initialized = false;
  this._running = false;
  this._resourceCache = {}; // 资源映射缓存
  this._preloadingResources = {}; // 正在预加载的资源
  
  // 初始化或使用现有行为分析系统
  if (options.behaviorSystem && options.behaviorSystem instanceof BehaviorAnalysisSystem) {
    this._behaviorSystem = options.behaviorSystem;
  } else {
    this._behaviorSystem = new BehaviorAnalysisSystem(options.behaviorSystem || {
      autoStart: false, // 由预加载器控制启动
      onDecision: this._onPreloadDecision.bind(this)
    });
  }
  
  // 初始化
  this._initialize();
  
  // 自动启动
  if (this._config.autoStart) {
    this.start();
  }
}

/**
 * 初始化预加载器
 * @private
 */
BehaviorBasedPreloader.prototype._initialize = function() {
  // 初始化资源映射
  this._initResourceMap();
  
  // 注册网络请求拦截器，用于收集API请求行为
  this._registerInterceptors();
  
  // 设置初始化标志
  this._initialized = true;
  
  // 调试信息
  if (this._config.debugMode) {
    console.info('[BehaviorBasedPreloader] 初始化完成，资源映射数量:', Object.keys(this._resourceCache).length);
  }
};

/**
 * 初始化资源映射
 * @private
 */
BehaviorBasedPreloader.prototype._initResourceMap = function() {
  // 清空资源缓存
  this._resourceCache = {};
  
  // 加载配置中的资源映射
  if (Array.isArray(this._config.resourceMap)) {
    var map = this._config.resourceMap;
    
    for (var i = 0; i < map.length; i++) {
      var item = map[i];
      
      // 检查资源配置是否有效
      if (!item || !item.url || !item.type) {
        continue;
      }
      
      // 添加到资源缓存
      this._resourceCache[item.url] = {
        url: item.url,
        type: item.type,
        pages: item.pages || [],
        dependsOn: item.dependsOn || [],
        size: item.size || 0,
        priority: item.priority || 0,
        ttl: item.ttl || this._config.preloadTimeout
      };
    }
  }
};

/**
 * 注册网络请求拦截器
 * @private
 */
BehaviorBasedPreloader.prototype._registerInterceptors = function() {
  var self = this;
  
  // 请求拦截器：收集API请求事件
  this._networkService.interceptors.request.use(function(config) {
    // 当系统运行时，收集请求事件
    if (self._running && self._behaviorSystem) {
      var currentPage = self._getCurrentPage();
      
      if (currentPage) {
        self._behaviorSystem.collectEvent({
          type: 'api',
          page: currentPage,
          params: {
            url: config.url,
            method: config.method,
            headers: config.headers
          },
          timestamp: Date.now()
        });
      }
    }
    
    // 返回配置，不修改请求
    return config;
  });
  
  // 响应拦截器：更新资源缓存状态
  this._networkService.interceptors.response.use(function(response) {
    // 当预加载请求成功完成时更新状态
    if (response && response.config && response.config._isPreload) {
      self._onPreloadComplete(response.config.url, true);
    }
    
    // 返回响应，不做修改
    return response;
  }, function(error) {
    // 当预加载请求失败时更新状态
    if (error && error.config && error.config._isPreload) {
      self._onPreloadComplete(error.config.url, false);
    }
    
    // 继续传递错误
    return Promise.reject(error);
  });
};

/**
 * 启动预加载器
 * @returns {Boolean} 是否成功启动
 */
BehaviorBasedPreloader.prototype.start = function() {
  // 检查初始化状态
  if (!this._initialized) {
    if (this._config.debugMode) {
      console.error('[BehaviorBasedPreloader] 启动失败，系统未初始化');
    }
    return false;
  }
  
  // 检查运行状态
  if (this._running) {
    if (this._config.debugMode) {
      console.warn('[BehaviorBasedPreloader] 系统已在运行中');
    }
    return true;
  }
  
  // 启动行为分析系统
  if (!this._behaviorSystem.getStatus().running) {
    // 设置决策回调
    if (!this._behaviorSystem.getConfig().decisionCallback) {
      this._behaviorSystem.getConfig().decisionCallback = this._onPreloadDecision.bind(this);
    }
    
    // 启动分析系统
    this._behaviorSystem.start();
  }
  
  // 设置运行状态
  this._running = true;
  
  // 调试信息
  if (this._config.debugMode) {
    console.info('[BehaviorBasedPreloader] 系统启动成功');
  }
  
  return true;
};

/**
 * 停止预加载器
 * @returns {Boolean} 是否成功停止
 */
BehaviorBasedPreloader.prototype.stop = function() {
  // 检查运行状态
  if (!this._running) {
    if (this._config.debugMode) {
      console.warn('[BehaviorBasedPreloader] 系统未在运行');
    }
    return true;
  }
  
  // 停止行为分析系统
  if (this._behaviorSystem.getStatus().running) {
    this._behaviorSystem.stop();
  }
  
  // 取消所有预加载任务
  this._cancelAllPreloads();
  
  // 设置运行状态
  this._running = false;
  
  // 调试信息
  if (this._config.debugMode) {
    console.info('[BehaviorBasedPreloader] 系统已停止');
  }
  
  return true;
};

/**
 * 获取当前页面路径
 * @returns {String} 当前页面路径
 * @private
 */
BehaviorBasedPreloader.prototype._getCurrentPage = function() {
  // 尝试从行为分析系统获取当前页面
  if (this._behaviorSystem && this._behaviorSystem.getStatus()) {
    var status = this._behaviorSystem.getStatus();
    if (status.currentPage) {
      return status.currentPage;
    }
  }
  
  // 尝试从小程序API获取当前页面
  try {
    var pages = getCurrentPages();
    if (pages && pages.length > 0) {
      var currentPage = pages[pages.length - 1];
      return currentPage.route;
    }
  } catch (err) {
    // 忽略错误
  }
  
  return '';
};

/**
 * 预加载决策回调
 * @param {Object} decision 预加载决策
 * @param {Array} predictions 行为预测
 * @private
 */
BehaviorBasedPreloader.prototype._onPreloadDecision = function(decision, predictions) {
  // 参数验证
  if (!decision) {
    return;
  }
  
  // 检查是否应预加载
  if (!decision.shouldPreload) {
    if (this._config.debugMode) {
      console.info('[BehaviorBasedPreloader] 决策不预加载，原因:', decision.reason);
    }
    return;
  }
  
  // 检查是否有资源可预加载
  if (!decision.resources || !Array.isArray(decision.resources) || decision.resources.length === 0) {
    if (this._config.debugMode) {
      console.info('[BehaviorBasedPreloader] 无可预加载资源');
    }
    return;
  }
  
  // 过滤和限制预加载资源
  var resourcesToPreload = this._filterResources(decision.resources);
  
  // 执行预加载
  this._executePreload(resourcesToPreload);
};

/**
 * 过滤可预加载资源
 * @param {Array} resources 资源列表
 * @returns {Array} 过滤后的资源列表
 * @private
 */
BehaviorBasedPreloader.prototype._filterResources = function(resources) {
  var self = this;
  var filtered = [];
  
  // 过滤条件：
  // 1. 资源必须存在于资源映射中
  // 2. 资源不在当前预加载队列中
  // 3. 资源必须是API类型
  resources.forEach(function(resource) {
    // 如果已经达到最大预加载数量，停止添加
    if (filtered.length >= self._config.maxPreloadResources) {
      return;
    }
    
    // 检查资源是否存在于资源映射中
    var cachedResource = self._resourceCache[resource.url];
    if (!cachedResource) {
      return;
    }
    
    // 检查是否正在预加载
    if (self._preloadingResources[resource.url]) {
      return;
    }
    
    // 检查资源类型
    if (resource.type !== 'api') {
      return;
    }
    
    // 添加到过滤后的资源列表
    filtered.push(resource);
  });
  
  // 返回过滤后的资源，按优先级排序
  return filtered.sort(function(a, b) {
    return b.priority - a.priority;
  });
};

/**
 * 执行资源预加载
 * @param {Array} resources 资源列表
 * @private
 */
BehaviorBasedPreloader.prototype._executePreload = function(resources) {
  var self = this;
  
  // 遍历资源列表执行预加载
  resources.forEach(function(resource) {
    // 标记资源为正在预加载
    self._preloadingResources[resource.url] = {
      url: resource.url,
      type: resource.type,
      startTime: Date.now(),
      priority: resource.priority,
      timeoutId: setTimeout(function() {
        // 预加载超时处理
        self._onPreloadTimeout(resource.url);
      }, self._config.preloadTimeout)
    };
    
    // 执行预加载请求
    self._preloadResource(resource);
    
    // 调试信息
    if (self._config.debugMode) {
      console.info('[BehaviorBasedPreloader] 开始预加载资源:', resource.url);
    }
  });
};

/**
 * 预加载单个资源
 * @param {Object} resource 资源对象
 * @private
 */
BehaviorBasedPreloader.prototype._preloadResource = function(resource) {
  var self = this;
  
  // 构建预加载请求配置
  var config = {
    url: resource.url,
    method: 'GET',
    _isPreload: true, // 标记为预加载请求
    headers: {
      'X-Preload': 'true'
    },
    // 预加载请求完成回调
    complete: function(res) {
      var success = !!(res && res.statusCode && res.statusCode >= 200 && res.statusCode < 300);
      self._onPreloadComplete(resource.url, success);
    }
  };
  
  // 执行预加载请求
  try {
    this._networkService.send(config);
  } catch (err) {
    // 预加载请求发送失败
    if (this._config.debugMode) {
      console.error('[BehaviorBasedPreloader] 预加载请求发送失败:', resource.url, err);
    }
    
    // 标记预加载完成(失败)
    this._onPreloadComplete(resource.url, false);
  }
};

/**
 * 处理预加载完成
 * @param {String} url 资源URL
 * @param {Boolean} success 是否成功
 * @private
 */
BehaviorBasedPreloader.prototype._onPreloadComplete = function(url, success) {
  // 检查资源是否在预加载队列中
  var preloadInfo = this._preloadingResources[url];
  if (!preloadInfo) {
    return;
  }
  
  // 清除超时定时器
  if (preloadInfo.timeoutId) {
    clearTimeout(preloadInfo.timeoutId);
  }
  
  // 计算耗时
  var duration = Date.now() - preloadInfo.startTime;
  
  // 移除预加载标记
  delete this._preloadingResources[url];
  
  // 记录预加载结果
  if (this._resourceCache[url]) {
    this._resourceCache[url].lastPreloaded = Date.now();
    this._resourceCache[url].preloadSuccess = success;
    this._resourceCache[url].preloadDuration = duration;
  }
  
  // 调试信息
  if (this._config.debugMode) {
    console.info(
      '[BehaviorBasedPreloader] 预加载' + (success ? '成功' : '失败') + ':',
      url,
      '耗时:', duration, 'ms'
    );
  }
};

/**
 * 处理预加载超时
 * @param {String} url 资源URL
 * @private
 */
BehaviorBasedPreloader.prototype._onPreloadTimeout = function(url) {
  // 检查资源是否在预加载队列中
  if (!this._preloadingResources[url]) {
    return;
  }
  
  // 移除预加载标记
  delete this._preloadingResources[url];
  
  // 记录预加载结果
  if (this._resourceCache[url]) {
    this._resourceCache[url].lastPreloaded = Date.now();
    this._resourceCache[url].preloadSuccess = false;
    this._resourceCache[url].preloadDuration = this._config.preloadTimeout;
    this._resourceCache[url].timeoutCount = (this._resourceCache[url].timeoutCount || 0) + 1;
  }
  
  // 调试信息
  if (this._config.debugMode) {
    console.warn('[BehaviorBasedPreloader] 预加载超时:', url);
  }
};

/**
 * 取消所有预加载任务
 * @private
 */
BehaviorBasedPreloader.prototype._cancelAllPreloads = function() {
  var self = this;
  
  // 遍历预加载队列，取消所有任务
  Object.keys(this._preloadingResources).forEach(function(url) {
    var preloadInfo = self._preloadingResources[url];
    
    // 清除超时定时器
    if (preloadInfo && preloadInfo.timeoutId) {
      clearTimeout(preloadInfo.timeoutId);
    }
    
    // 移除预加载标记
    delete self._preloadingResources[url];
    
    // 调试信息
    if (self._config.debugMode) {
      console.info('[BehaviorBasedPreloader] 取消预加载:', url);
    }
  });
};

/**
 * 获取系统状态
 * @returns {Object} 系统状态
 */
BehaviorBasedPreloader.prototype.getStatus = function() {
  return {
    initialized: this._initialized,
    running: this._running,
    currentPage: this._getCurrentPage(),
    preloadingCount: Object.keys(this._preloadingResources).length,
    resourceCount: Object.keys(this._resourceCache).length,
    behaviorSystem: this._behaviorSystem ? this._behaviorSystem.getStatus() : null
  };
};

/**
 * 添加资源映射
 * @param {Object|Array} resources 资源映射
 * @returns {Number} 添加的资源数量
 */
BehaviorBasedPreloader.prototype.addResources = function(resources) {
  var self = this;
  var addedCount = 0;
  
  // 处理单个资源
  function addResource(resource) {
    // 参数验证
    if (!resource || !resource.url || !resource.type) {
      return false;
    }
    
    // 添加或更新资源映射
    self._resourceCache[resource.url] = {
      url: resource.url,
      type: resource.type,
      pages: resource.pages || [],
      dependsOn: resource.dependsOn || [],
      size: resource.size || 0,
      priority: resource.priority || 0,
      ttl: resource.ttl || self._config.preloadTimeout,
      addedAt: Date.now()
    };
    
    return true;
  }
  
  // 处理资源数组
  if (Array.isArray(resources)) {
    resources.forEach(function(resource) {
      if (addResource(resource)) {
        addedCount++;
      }
    });
  } 
  // 处理单个资源对象
  else if (typeof resources === 'object') {
    if (addResource(resources)) {
      addedCount++;
    }
  }
  
  // 调试信息
  if (this._config.debugMode && addedCount > 0) {
    console.info('[BehaviorBasedPreloader] 添加', addedCount, '个资源映射');
  }
  
  return addedCount;
};

/**
 * 移除资源映射
 * @param {String|Array} urls 要移除的资源URL或URL数组
 * @returns {Number} 移除的资源数量
 */
BehaviorBasedPreloader.prototype.removeResources = function(urls) {
  var self = this;
  var removedCount = 0;
  
  // 处理单个URL
  function removeResource(url) {
    // 参数验证
    if (!url || typeof url !== 'string' || !self._resourceCache[url]) {
      return false;
    }
    
    // 如果正在预加载，取消预加载
    if (self._preloadingResources[url]) {
      var preloadInfo = self._preloadingResources[url];
      if (preloadInfo.timeoutId) {
        clearTimeout(preloadInfo.timeoutId);
      }
      delete self._preloadingResources[url];
    }
    
    // 移除资源映射
    delete self._resourceCache[url];
    
    return true;
  }
  
  // 处理URL数组
  if (Array.isArray(urls)) {
    urls.forEach(function(url) {
      if (removeResource(url)) {
        removedCount++;
      }
    });
  } 
  // 处理单个URL
  else if (typeof urls === 'string') {
    if (removeResource(urls)) {
      removedCount++;
    }
  }
  
  // 调试信息
  if (this._config.debugMode && removedCount > 0) {
    console.info('[BehaviorBasedPreloader] 移除', removedCount, '个资源映射');
  }
  
  return removedCount;
};

/**
 * 手动触发预加载分析
 * @param {Object} context 自定义上下文，可选
 * @returns {Object} 预加载决策
 */
BehaviorBasedPreloader.prototype.triggerPreloadAnalysis = function(context) {
  // 检查运行状态
  if (!this._running || !this._behaviorSystem) {
    if (this._config.debugMode) {
      console.warn('[BehaviorBasedPreloader] 系统未运行，无法触发预加载分析');
    }
    return { shouldPreload: false, reason: 'system_not_running' };
  }
  
  // 调用行为分析系统获取预加载决策
  var decision = this._behaviorSystem.getPreloadDecision(context);
  
  // 处理预加载决策
  this._onPreloadDecision(decision);
  
  return decision;
};

/**
 * 清空预加载历史
 */
BehaviorBasedPreloader.prototype.clearHistory = function() {
  // 取消所有预加载任务
  this._cancelAllPreloads();
  
  // 重置资源缓存状态
  Object.keys(this._resourceCache).forEach(function(url) {
    var resource = this._resourceCache[url];
    delete resource.lastPreloaded;
    delete resource.preloadSuccess;
    delete resource.preloadDuration;
    delete resource.timeoutCount;
  }, this);
  
  // 清除行为分析系统历史
  if (this._behaviorSystem) {
    this._behaviorSystem.clearHistory();
  }
  
  // 调试信息
  if (this._config.debugMode) {
    console.info('[BehaviorBasedPreloader] 历史记录已清除');
  }
};

// 导出模块
module.exports = BehaviorBasedPreloader; 