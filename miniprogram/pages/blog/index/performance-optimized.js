/**
 * 博客首页滚动性能优化模块
 * 创建时间：2025年04月10日 21:30:58
 * 创建者：Claude助手
 * 修改时间：2025年04月11日 10:15:36，提升帧率以支持高刷新率设备
 * 修改时间：2025年05月12日 19:54:37，修复性能优化绑定问题和缓存策略
 * 修改时间：2025-04-10 23:04:22，增强错误处理能力，改进真机兼容性
 */

// 帧率控制相关
const HIGH_PERFORMANCE_FPS = 144;  // 最高性能模式
const STANDARD_FPS = 60;   // 标准模式
const frameInterval = 1000 / HIGH_PERFORMANCE_FPS;  // 144fps下的帧间隔时间

// 虚拟列表相关
const DEFAULT_ITEM_HEIGHT = 300;   // 默认列表项高度（rpx）
const VIEWPORT_BUFFER = 5;   // 视口外预加载的项数量

// 安全检查函数
function isSupportedEnvironment() {
  try {
    // 检查基础库和运行环境
    const systemInfo = wx.getSystemInfoSync();
    const isDevtools = systemInfo.platform === 'devtools';
    const sdkVersion = systemInfo.SDKVersion;
    
    // 检查是否支持requestAnimationFrame
    if (typeof requestAnimationFrame === 'undefined') {
      console.error('[性能优化] 当前环境不支持requestAnimationFrame');
      return false;
    }
    
    // 基础库版本检查
    const versionNums = sdkVersion.split('.').map(Number);
    const isVersionSupported = versionNums[0] > 2 || 
                              (versionNums[0] === 2 && versionNums[1] >= 10);
    
    if (!isVersionSupported) {
      console.error('[性能优化] 当前基础库版本过低:', sdkVersion);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('[性能优化] 环境检查失败:', err);
    return false;
  }
}

/**
 * 高性能滚动管理类
 * 负责处理高帧率滚动、虚拟列表等性能优化
 */
class BlogScrollPerformanceManager {
  constructor() {
    this.isEnabled = false;
    this.highPerformanceMode = false;
    this.requestId = null;
    this.lastFrameTime = 0;
    this.scrollPosition = 0;
    this.scrollDirection = 'down';
    this.scrollSpeed = 0;
    this.lastScrollPosition = 0;
    this.scrollTimestamp = 0;
    this.virtualListEnabled = false;
    this.allItems = [];
    this.visibleItems = [];
    this.itemHeights = new Map();
    this.viewportHeight = 0;
    this.containerRef = null;
    this.onFrameCallback = null;
    this.errorCount = 0;
    this.maxErrorCount = 3;
    
    // 确保方法绑定
    this.renderFrame = this.renderFrame.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }

  /**
   * 启用高性能滚动模式
   * @param {Object} options 配置选项
   */
  enable(options = {}) {
    if (this.isEnabled) return;
    
    try {
      // 检查是否在支持的环境中
      if (!isSupportedEnvironment()) {
        return false;
      }
      
      const {
        highPerformanceMode = true,
        virtualList = true,
        containerRef = null,
        onFrame = null
      } = options;
      
      this.isEnabled = true;
      this.highPerformanceMode = highPerformanceMode;
      this.virtualListEnabled = virtualList;
      this.containerRef = containerRef;
      this.onFrameCallback = onFrame;
      
      // 启动渲染循环
      this.startRenderLoop();
      
      console.log('[性能优化] 已启用高性能滚动模式', {
        highPerformanceMode: this.highPerformanceMode ? '144fps' : '60fps',
        virtualList: this.virtualListEnabled ? '已启用' : '未启用'
      });
      
      return true;
    } catch (err) {
      console.error('[性能优化] 启用失败:', err);
      return false;
    }
  }

  /**
   * 禁用高性能滚动模式
   */
  disable() {
    if (!this.isEnabled) return;
    
    try {
      this.isEnabled = false;
      this.stopRenderLoop();
      
      console.log('[性能优化] 已禁用高性能滚动模式');
      return true;
    } catch (err) {
      console.error('[性能优化] 禁用失败:', err);
      return false;
    }
  }

  /**
   * 开始渲染循环
   */
  startRenderLoop() {
    try {
      if (this.requestId) {
        cancelAnimationFrame(this.requestId);
      }
      
      this.lastFrameTime = performance.now();
      this.requestId = requestAnimationFrame(this.renderFrame);
    } catch (err) {
      console.error('[性能优化] 启动渲染循环失败:', err);
      this.isEnabled = false;
    }
  }

  /**
   * 停止渲染循环
   */
  stopRenderLoop() {
    try {
      if (this.requestId) {
        cancelAnimationFrame(this.requestId);
        this.requestId = null;
      }
    } catch (err) {
      console.error('[性能优化] 停止渲染循环失败:', err);
    }
  }

  /**
   * 渲染帧
   */
  renderFrame() {
    try {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;
      
      // 控制帧率
      if (this.highPerformanceMode || elapsed >= frameInterval) {
        // 执行帧处理逻辑
        if (this.onFrameCallback) {
          this.onFrameCallback(now, elapsed);
        }
        
        // 如果启用了虚拟列表，更新可见项
        if (this.virtualListEnabled && this.errorCount < this.maxErrorCount) {
          try {
            this.updateVisibleItems();
          } catch (err) {
            console.error('[性能优化] 更新可见项失败:', err);
            this.errorCount++;
            
            if (this.errorCount >= this.maxErrorCount) {
              console.warn('[性能优化] 虚拟列表错误次数过多，已自动降级');
              this.virtualListEnabled = false;
            }
          }
        }
        
        this.lastFrameTime = now;
      }
      
      // 继续渲染循环
      if (this.isEnabled) {
        this.requestId = requestAnimationFrame(this.renderFrame);
      }
    } catch (err) {
      console.error('[性能优化] 渲染帧处理失败:', err);
      
      // 重新启动循环，但如果错误过多则关闭
      this.errorCount++;
      if (this.errorCount < 10) {
        this.requestId = requestAnimationFrame(this.renderFrame);
      } else {
        console.error('[性能优化] 渲染循环错误过多，已停止');
        this.isEnabled = false;
      }
    }
  }

  /**
   * 设置所有数据项
   * @param {Array} items 所有数据项
   */
  setItems(items) {
    try {
      if (!items || !Array.isArray(items)) {
        console.error('[性能优化] 设置数据项失败: 无效的数据');
        return false;
      }
      
      this.allItems = items;
      
      // 重置项高度缓存
      this.itemHeights = new Map();
      
      // 估计初始项高度
      items.forEach((item, index) => {
        this.itemHeights.set(index, this.estimateItemHeight(item));
      });
      
      if (this.virtualListEnabled) {
        this.updateVisibleItems();
      } else {
        this.visibleItems = [...items];
      }
      
      return true;
    } catch (err) {
      console.error('[性能优化] 设置数据项失败:', err);
      return false;
    }
  }

  /**
   * 更新可见项
   */
  updateVisibleItems() {
    if (!this.isEnabled || !this.virtualListEnabled) return;
    if (!this.allItems || !this.allItems.length) return;
    
    try {
      // 视口高度暂时固定
      this.viewportHeight = 800;
      
      // 计算可见范围
      const scrollTop = this.scrollPosition;
      const startPosition = Math.max(0, scrollTop - this.viewportHeight * 0.5);
      const endPosition = scrollTop + this.viewportHeight * 1.5;
      
      // 计算可见项索引范围
      let currentPosition = 0;
      let startIndex = 0;
      let endIndex = this.allItems.length - 1;
      
      // 找到第一个可见项
      for (let i = 0; i < this.allItems.length; i++) {
        const height = this.itemHeights.get(i) || DEFAULT_ITEM_HEIGHT;
        
        if (currentPosition + height >= startPosition) {
          startIndex = Math.max(0, i - VIEWPORT_BUFFER);
          break;
        }
        
        currentPosition += height;
      }
      
      // 找到最后一个可见项
      currentPosition = 0;
      for (let i = 0; i < this.allItems.length; i++) {
        const height = this.itemHeights.get(i) || DEFAULT_ITEM_HEIGHT;
        currentPosition += height;
        
        if (currentPosition >= endPosition) {
          endIndex = Math.min(this.allItems.length - 1, i + VIEWPORT_BUFFER);
          break;
        }
      }
      
      // 更新可见项
      this.visibleItems = this.allItems.slice(startIndex, endIndex + 1).map((item, index) => ({
        ...item,
        _virtualIndex: startIndex + index
      }));
    } catch (err) {
      console.error('[性能优化] 更新可见项失败:', err);
      // 出错时回退到显示所有项
      this.visibleItems = [...this.allItems];
    }
  }

  /**
   * 滚动事件处理函数
   * @param {Object} e 滚动事件对象
   */
  handleScroll(e) {
    if (!this.isEnabled) return;
    
    try {
      const now = Date.now();
      
      // 确保e.detail存在
      if (!e || !e.detail) {
        return;
      }
      
      const scrollTop = e.detail.scrollTop || 0;
      
      // 计算滚动方向和速度
      this.scrollDirection = scrollTop > this.scrollPosition ? 'down' : 'up';
      
      if (this.scrollTimestamp) {
        const timeDiff = now - this.scrollTimestamp;
        if (timeDiff > 0) {
          this.scrollSpeed = Math.abs(scrollTop - this.scrollPosition) / timeDiff;
        }
      }
      
      this.scrollPosition = scrollTop;
      this.scrollTimestamp = now;
      this.lastScrollPosition = scrollTop;
      
      // 只有在启用虚拟列表时才更新可见项
      if (this.virtualListEnabled && this.errorCount < this.maxErrorCount) {
        // 使用节流以避免过于频繁地更新
        if (!this._throttleUpdateTimer) {
          this._throttleUpdateTimer = setTimeout(() => {
            try {
              this.updateVisibleItems();
              this._throttleUpdateTimer = null;
            } catch (err) {
              console.error('[性能优化] 滚动更新可见项失败:', err);
              this._throttleUpdateTimer = null;
              this.errorCount++;
            }
          }, 16); // 约60fps
        }
      }
    } catch (err) {
      console.error('[性能优化] 滚动处理失败:', err);
      this.errorCount++;
    }
  }

  /**
   * 估计项高度
   * @param {Object} item 数据项
   * @returns {number} 估计高度
   */
  estimateItemHeight(item) {
    // 基础高度
    let height = 180; // rpx
    
    // 根据内容估计
    if (item.content) {
      // 估算文本行数
      const textLength = item.content.length;
      const linesEstimate = Math.ceil(textLength / 15);
      height += linesEstimate * 40; // 每行40rpx
    }
    
    // 图片高度
    if (item.images && item.images.length > 0) {
      height += 220 * Math.ceil(item.images.length / 2); // 假设图片会自适应
    }
    
    return height;
  }

  /**
   * 更新项高度
   * @param {number} index 索引
   * @param {number} height 高度
   */
  updateItemHeight(index, height) {
    this.itemHeights.set(index, height);
  }

  /**
   * 获取当前可见项
   * @returns {Array} 可见项列表
   */
  getVisibleItems() {
    return this.visibleItems;
  }

  /**
   * 获取性能信息
   * @returns {Object} 性能信息
   */
  getPerformanceInfo() {
    return {
      fps: this.highPerformanceMode ? HIGH_PERFORMANCE_FPS : STANDARD_FPS,
      scrollSpeed: this.scrollSpeed,
      scrollDirection: this.scrollDirection,
      virtualListEnabled: this.virtualListEnabled,
      visibleItems: this.visibleItems.length,
      totalItems: this.allItems.length,
      errorCount: this.errorCount
    };
  }
}

/**
 * 图片懒加载管理器
 */
class ImageLazyLoadManager {
  constructor() {
    this.enabled = false;
    this.imageQueue = [];
    this.loadingCount = 0;
    this.maxConcurrent = 3;
    this.imageCache = new Map();
    this.isProcessing = false;
    this.errorCount = 0;
    this.lastProcessTime = 0;
    
    // 绑定方法
    this.processQueue = this.processQueue.bind(this);
  }

  /**
   * 启用图片懒加载
   * @param {Object} options 配置选项
   */
  enable(options = {}) {
    if (this.enabled) return;
    
    try {
      const {
        maxConcurrent = 3,
        cacheSize = 100
      } = options;
      
      this.enabled = true;
      this.maxConcurrent = maxConcurrent;
      this.cacheSize = cacheSize;
      
      console.log('[图片优化] 已启用懒加载', {
        maxConcurrent: this.maxConcurrent,
        cacheSize: this.cacheSize
      });
      
      return true;
    } catch (err) {
      console.error('[图片优化] 启用失败:', err);
      return false;
    }
  }

  /**
   * 禁用图片懒加载
   */
  disable() {
    try {
      this.enabled = false;
      console.log('[图片优化] 已禁用懒加载');
      return true;
    } catch (err) {
      console.error('[图片优化] 禁用失败:', err);
      return false;
    }
  }

  /**
   * 添加图片到加载队列
   * @param {string} src 图片地址
   * @param {number} distance 距离可视区域的距离
   * @param {Function} onLoad 加载完成回调
   */
  addImage(src, distance, onLoad) {
    if (!this.enabled) {
      if (onLoad) onLoad(src);
      return;
    }
    
    try {
      // 检查是否已在缓存中
      if (this.imageCache.has(src)) {
        if (onLoad) onLoad(src);
        return;
      }
      
      // 检查是否已在队列中
      const existingIndex = this.imageQueue.findIndex(item => item.src === src);
      
      if (existingIndex >= 0) {
        // 更新已有项的优先级
        this.imageQueue[existingIndex].distance = distance;
        this.imageQueue[existingIndex].priority = this.calculatePriority(distance);
        
        if (onLoad && !this.imageQueue[existingIndex].callbacks.includes(onLoad)) {
          this.imageQueue[existingIndex].callbacks.push(onLoad);
        }
      } else {
        // 添加新项
        this.imageQueue.push({
          src: src,
          distance: distance,
          priority: this.calculatePriority(distance),
          status: 'pending',
          callbacks: onLoad ? [onLoad] : []
        });
      }
      
      // 排序队列
      this.sortQueueByPriority();
      
      // 开始处理队列
      if (!this.isProcessing) {
        this.processQueue();
      }
    } catch (err) {
      console.error('[图片优化] 添加图片失败:', err);
      if (onLoad) onLoad(src);
    }
  }

  /**
   * 处理队列
   */
  processQueue() {
    if (!this.enabled || this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      
      while (this.loadingCount < this.maxConcurrent && this.imageQueue.length > 0) {
        const item = this.imageQueue.shift();
        
        if (item.status === 'pending') {
          this.loadingCount++;
          this.loadImage(item);
        }
      }
      
      this.isProcessing = false;
    } catch (err) {
      console.error('[图片优化] 处理队列失败:', err);
      this.isProcessing = false;
    }
  }

  /**
   * 按优先级排序队列
   */
  sortQueueByPriority() {
    this.imageQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 加载图片
   * @param {Object} item 队列项
   */
  loadImage(item) {
    try {
      if (!this.enabled) {
        this.loadingCount--;
        
        // 执行回调
        item.callbacks.forEach(callback => {
          if (callback) callback(item.src);
        });
        
        // 继续处理队列
        this.processQueue();
        return;
      }
      
      const startTime = Date.now();
      
      // 使用wx.getImageInfo加载图片
      wx.getImageInfo({
        src: item.src,
        success: res => {
          try {
            // 添加到缓存
            this.addToCache(item.src, res);
            
            // 执行回调
            item.callbacks.forEach(callback => {
              if (callback) callback(item.src);
            });
          } catch (err) {
            console.error('[图片优化] 图片加载后回调失败:', err);
          }
        },
        fail: err => {
          console.error('[图片优化] 图片加载失败:', item.src, err);
          this.errorCount++;
        },
        complete: () => {
          this.loadingCount--;
          
          // 记录加载时间
          const loadTime = Date.now() - startTime;
          if (loadTime > 1000) {
            console.warn('[图片优化] 图片加载耗时过长:', item.src, loadTime + 'ms');
          }
          
          // 继续处理队列
          this.processQueue();
        }
      });
    } catch (err) {
      console.error('[图片优化] 加载图片失败:', err);
      this.loadingCount--;
      this.processQueue();
    }
  }

  /**
   * 添加图片到缓存
   * @param {string} src 图片地址
   * @param {Object} img 图片信息
   */
  addToCache(src, img) {
    // 限制缓存大小
    if (this.imageCache.size >= this.cacheSize) {
      // 删除最早的项
      const oldestKey = this.imageCache.keys().next().value;
      this.imageCache.delete(oldestKey);
    }
    
    // 添加到缓存
    this.imageCache.set(src, {
      data: img,
      timestamp: Date.now()
    });
  }

  /**
   * 更新图片距离
   * @param {string} src 图片地址
   * @param {number} distance 距离可视区域的距离
   */
  updateImageDistance(src, distance) {
    try {
      const index = this.imageQueue.findIndex(item => item.src === src);
      
      if (index >= 0) {
        this.imageQueue[index].distance = distance;
        this.imageQueue[index].priority = this.calculatePriority(distance);
        
        // 定期排序队列（避免频繁排序）
        const now = Date.now();
        if (now - this.lastProcessTime > 500) {
          this.sortQueueByPriority();
          this.lastProcessTime = now;
        }
      }
    } catch (err) {
      console.error('[图片优化] 更新图片距离失败:', err);
    }
  }

  /**
   * 计算优先级（越小优先级越高）
   * @param {number} distance 距离
   * @returns {number} 优先级值
   */
  calculatePriority(distance) {
    // 距离越近，优先级越高
    return Math.max(0, distance);
  }
}

/**
 * 优化博客列表页滚动性能
 * @param {Object} pageInstance 页面实例
 * @param {Object} options 优化选项
 */
function optimizeBlogListPage(pageInstance, options = {}) {
  try {
    // 检查环境是否支持
    if (!isSupportedEnvironment()) {
      console.warn('[性能优化] 当前环境不支持高性能模式，已自动降级');
      return null;
    }
    
    // 默认选项
    const defaultOptions = {
      highPerformanceMode: true,
      virtualList: true,
      lazyLoadImages: true
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 创建滚动管理器
    const scrollManager = new BlogScrollPerformanceManager();
    
    // 创建图片懒加载管理器
    const imageManager = new ImageLazyLoadManager();
    
    // 启用优化
    const scrollEnabled = scrollManager.enable({
      highPerformanceMode: mergedOptions.highPerformanceMode,
      virtualList: mergedOptions.virtualList
    });
    
    const imageEnabled = mergedOptions.lazyLoadImages ? 
      imageManager.enable() : false;
    
    // 扩展页面的滚动事件处理函数
    const originalOnScroll = pageInstance.onScroll || function() {};
    
    pageInstance.onScroll = function(e) {
      // 调用原始处理函数
      originalOnScroll.call(this, e);
      
      // 调用优化后的处理函数
      scrollManager.handleScroll(e);
      
      // 更新可见项到页面数据
      if (scrollManager.virtualListEnabled) {
        try {
          const visibleItems = scrollManager.getVisibleItems();
          if (visibleItems && visibleItems.length > 0) {
            this.setData({
              _virtualBlogList: visibleItems
            });
          }
        } catch (err) {
          console.error('[性能优化] 更新虚拟列表数据失败:', err);
        }
      }
    };
    
    // 扩展页面的图片错误处理函数
    pageInstance.onImageError = function(e) {
      try {
        const src = e.currentTarget.dataset.src || '';
        console.warn('[图片优化] 图片加载失败:', src);
      } catch (err) {
        console.error('[图片优化] 处理图片错误事件失败:', err);
      }
    };
    
    return {
      scrollManager,
      imageManager,
      enabled: scrollEnabled && imageEnabled
    };
  } catch (err) {
    console.error('[性能优化] 初始化优化失败:', err);
    return null;
  }
}

// 导出优化函数和管理器类
module.exports = {
  optimizeBlogListPage,
  BlogScrollPerformanceManager,
  ImageLazyLoadManager,
  isSupportedEnvironment
};
