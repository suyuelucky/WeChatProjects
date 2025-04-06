/**
 * 图片分级加载策略
 * 根据不同场景加载不同分辨率的图片，优化内存占用
 */

/**
 * 图片加载策略
 * 根据不同场景和设备能力动态调整图片加载策略
 */

const NetworkMonitor = require('./network-monitor');

/**
 * 图片加载策略
 * 负责根据网络状态、设备性能和使用场景动态调整图片加载方式
 */
const ImageLoadingStrategy = {
  // 策略配置
  _config: {
    // 默认质量级别（低/中/高）
    defaultQuality: 'medium',
    
    // 最大图片尺寸 (单位: 像素)
    maxSize: {
      thumbnail: 200,  // 缩略图模式
      preview: 1200,   // 预览模式
      full: 2400       // 全尺寸模式
    },
    
    // 网络类型对应的质量级别
    networkQuality: {
      wifi: 'high',
      '4g': 'medium',
      '3g': 'low',
      '2g': 'low',
      unknown: 'medium',
      none: 'low'
    },
    
    // 内存压力级别
    memoryPressure: {
      none: 0,       // 无压力
      low: 1,        // 轻微压力
      medium: 2,     // 中等压力
      high: 3        // 严重压力
    },
    
    // 当前内存压力
    currentMemoryPressure: 0
  },
  
  /**
   * 初始化图片加载策略
   * @param {Object} options 配置选项
   */
  init(options = {}) {
    // 合并配置
    this._config = {
      ...this._config,
      ...options
    };
    
    // 设置内存警告监听
    this._setupMemoryWarning();
    
    // 初始化网络监控（如果还没初始化）
    if (NetworkMonitor._isInitialized !== true) {
      NetworkMonitor.init();
    }
    
    console.log('[ImageLoadingStrategy] 图片加载策略初始化完成');
    
    return this;
  },
  
  /**
   * 设置内存警告监听
   * @private
   */
  _setupMemoryWarning() {
    // 内存警告处理函数
    this._memoryWarningHandler = function(res) {
      // 根据警告级别设置内存压力
      // level: 5+ 表示严重内存不足
      if (res.level >= 10) {
        this._config.currentMemoryPressure = this._config.memoryPressure.high;
      } else if (res.level >= 5) {
        this._config.currentMemoryPressure = this._config.memoryPressure.medium;
      } else {
        this._config.currentMemoryPressure = this._config.memoryPressure.low;
      }
      
      console.warn(`[ImageLoadingStrategy] 内存警告 (级别: ${res.level})，当前内存压力: ${this._config.currentMemoryPressure}`);
    }.bind(this);
    
    // 注册内存警告监听
    wx.onMemoryWarning(this._memoryWarningHandler);
  },
  
  /**
   * 根据网络状态、内存压力和使用场景获取最佳图片加载策略
   * @param {String} mode 加载模式 ('thumbnail', 'preview', 'full')
   * @param {Object} imageInfo 图片信息 {width, height, size}
   * @returns {Object} 加载策略
   */
  getStrategy(mode = 'preview', imageInfo = {}) {
    // 获取当前网络状态
    const networkState = NetworkMonitor._networkState;
    
    // 确定质量级别（基于网络）
    let quality = this._config.networkQuality[networkState.networkType] || this._config.defaultQuality;
    
    // 基于内存压力调整质量级别
    if (this._config.currentMemoryPressure >= this._config.memoryPressure.high) {
      // 严重内存压力下，无论什么模式都使用低质量
      quality = 'low';
      mode = mode === 'full' ? 'preview' : mode; // 降级
    } else if (this._config.currentMemoryPressure >= this._config.memoryPressure.medium) {
      // 中等内存压力下，调整质量
      if (quality === 'high') quality = 'medium';
    }
    
    // 确定最大尺寸
    const maxSize = this._config.maxSize[mode] || this._config.maxSize.preview;
    
    // 计算实际尺寸
    let targetWidth = imageInfo.width || maxSize;
    let targetHeight = imageInfo.height || maxSize;
    
    if (targetWidth > maxSize || targetHeight > maxSize) {
      // 等比例缩放
      const ratio = Math.min(maxSize / targetWidth, maxSize / targetHeight);
      targetWidth = Math.floor(targetWidth * ratio);
      targetHeight = Math.floor(targetHeight * ratio);
    }
    
    // 构建加载策略
    return {
      mode: mode,
      quality: quality,
      width: targetWidth,
      height: targetHeight,
      enableProgressiveLoad: mode !== 'thumbnail', // 缩略图不使用渐进式加载
      useWebp: quality !== 'high', // 非高质量时使用webp格式
      priority: this._getPriority(mode),
      memoryPressure: this._config.currentMemoryPressure
    };
  },
  
  /**
   * 获取加载优先级
   * @param {String} mode 加载模式
   * @returns {Number} 优先级 (1-5，5最高)
   * @private
   */
  _getPriority(mode) {
    // 不同模式设置不同优先级
    switch (mode) {
      case 'thumbnail': return 3; // 中等优先级
      case 'preview': return 4;   // 较高优先级
      case 'full': return 2;      // 较低优先级
      default: return 3;          // 默认中等优先级
    }
  },
  
  /**
   * 释放资源，降低内存压力
   */
  releaseMemory() {
    // 重置内存压力级别
    this._config.currentMemoryPressure = this._config.memoryPressure.low;
    
    // 强制进行垃圾回收（实际上小程序环境不能直接触发GC）
    // 但可以通过清理缓存来释放部分内存
    try {
      // 模拟GC的一些操作
      if (typeof wx.setStorage === 'function') {
        // 清理图片缓存状态
        wx.removeStorage({
          key: 'imageCache_status',
          fail: () => {} // 忽略失败
        });
      }
      
      console.log('[ImageLoadingStrategy] 已尝试释放内存');
    } catch (e) {
      console.error('[ImageLoadingStrategy] 释放内存失败:', e);
    }
  }
};

/**
 * 智能预加载相邻图片
 * @param {Number} currentIndex 当前查看的索引
 * @param {Array} photoList 照片列表
 * @param {String} viewMode 查看模式
 */
function preloadAdjacentImages(currentIndex, photoList, viewMode) {
  if (!photoList || !photoList.length) {
    return;
  }
  
  // 计算需要预加载的索引范围
  const start = Math.max(0, currentIndex - 2);
  const end = Math.min(photoList.length - 1, currentIndex + 2);
  
  // 对于预览模式，预加载中等分辨率
  if (viewMode === 'preview') {
    for (let i = start; i <= end; i++) {
      if (i !== currentIndex && photoList[i] && photoList[i].id) {
        ImageLoadingStrategy.loadMediumImage(photoList[i].id, true); // true表示这是预加载
      }
    }
  }
  
  // 列表模式下预加载更多缩略图
  if (viewMode === 'list') {
    const preloadRange = 5; // 预加载前后5张
    for (let i = Math.max(0, currentIndex - preloadRange); 
         i <= Math.min(photoList.length - 1, currentIndex + preloadRange); i++) {
      if (photoList[i] && photoList[i].id) {
        ImageLoadingStrategy.loadThumbnail(photoList[i].id, true);
      }
    }
  }
}

// 导出
module.exports = {
  ImageLoadingStrategy,
  preloadAdjacentImages
}; 