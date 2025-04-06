/**
 * 图片缓存管理器
 * 负责管理图片缓存，控制内存占用，实现LRU淘汰策略
 */

/**
 * 基于Map实现的LRU缓存
 * 记录图片访问顺序，自动淘汰最久未使用的图片
 */
class LRUCache {
  /**
   * 构造函数
   * @param {Number} capacity 最大缓存容量
   */
  constructor(capacity) {
    this.capacity = capacity; // 最大缓存数量
    this.cache = new Map(); // 使用Map保证插入顺序
  }
  
  /**
   * 获取缓存中的图片
   * @param {String} key 缓存键
   * @returns {Object|null} 缓存的图片对象或null
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    // 获取缓存的同时，更新访问顺序（删除后重新插入到末尾）
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }
  
  /**
   * 添加图片到缓存
   * @param {String} key 缓存键
   * @param {Object} value 图片对象
   */
  put(key, value) {
    // 如果键已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // 如果缓存已满，删除最久未使用的项（Map的第一个元素）
    else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
      
      console.log(`[ImageCacheManager] 缓存已满，淘汰图片: ${oldestKey}`);
    }
    
    // 将新项添加到末尾
    this.cache.set(key, value);
  }
  
  /**
   * 删除缓存项
   * @param {String} key 缓存键
   * @returns {Boolean} 是否成功删除
   */
  delete(key) {
    return this.cache.delete(key);
  }
  
  /**
   * 清空缓存
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * 获取缓存大小
   * @returns {Number} 当前缓存项数量
   */
  size() {
    return this.cache.size;
  }
  
  /**
   * 获取所有缓存键
   * @returns {Array} 当前缓存的所有键
   */
  keys() {
    return [...this.cache.keys()];
  }
  
  /**
   * 获取所有缓存值
   * @returns {Array} 当前缓存的所有值
   */
  values() {
    return [...this.cache.values()];
  }
}

/**
 * 图片缓存管理器
 */
const ImageCacheManager = {
  /**
   * 缩略图缓存
   * 用于存储小尺寸预览图，容量更大
   */
  thumbnailCache: new LRUCache(30), // 最多缓存30张缩略图
  
  /**
   * 原图缓存
   * 用于存储原始大图，容量较小
   */
  originalCache: new LRUCache(10), // 最多缓存10张原图
  
  /**
   * 已使用内存大小估计（字节）
   */
  estimatedMemoryUsage: 0,
  
  /**
   * 最后清理时间
   */
  lastCleanupTime: null,
  
  /**
   * 内存限制（字节）
   * 默认限制为50MB
   */
  memoryLimit: 50 * 1024 * 1024,
  
  /**
   * 初始化缓存管理器
   */
  init() {
    console.log('[ImageCacheManager] 初始化图片缓存管理器');
    
    // 定期清理临时文件
    this.setupAutoCleanup();
  },
  
  /**
   * 设置自动清理机制
   */
  setupAutoCleanup() {
    // 每5分钟检查一次内存使用情况
    setInterval(() => {
      this.checkMemoryUsage();
    }, 5 * 60 * 1000);
  },
  
  /**
   * 检查内存使用情况
   * 如果超过阈值，触发清理
   */
  checkMemoryUsage() {
    // 如果估计的内存使用超过80%的限制，触发清理
    if (this.estimatedMemoryUsage > this.memoryLimit * 0.8) {
      console.log('[ImageCacheManager] 内存使用较高，开始清理缓存');
      this.cleanup();
    }
  },
  
  /**
   * 添加图片到缓存
   * @param {String} key 图片键
   * @param {Object} imageInfo 图片信息对象
   * @param {String} imageInfo.path 图片路径
   * @param {Number} imageInfo.size 图片大小（字节）
   * @param {Boolean} isThumbnail 是否为缩略图
   */
  addImage(key, imageInfo, isThumbnail = false) {
    if (!key || !imageInfo || !imageInfo.path) {
      console.warn('[ImageCacheManager] 添加图片缺少必要信息', key);
      return;
    }
    
    // 估算图片大小
    const estimatedSize = imageInfo.size || this.estimateImageSize(imageInfo.path, isThumbnail);
    
    // 增加估计内存使用量
    this.estimatedMemoryUsage += estimatedSize;
    
    // 创建缓存项
    const cacheItem = {
      ...imageInfo,
      estimatedSize,
      timestamp: Date.now()
    };
    
    // 根据类型添加到不同缓存
    if (isThumbnail) {
      this.thumbnailCache.put(key, cacheItem);
    } else {
      this.originalCache.put(key, cacheItem);
    }
    
    // 每次添加后检查内存使用
    this.checkMemoryUsage();
  },
  
  /**
   * 获取缓存中的图片
   * @param {String} key 图片键
   * @param {Boolean} isThumbnail 是否为缩略图
   * @returns {Object|null} 图片信息对象
   */
  getImage(key, isThumbnail = false) {
    return isThumbnail 
      ? this.thumbnailCache.get(key)
      : this.originalCache.get(key);
  },
  
  /**
   * 从缓存中移除图片
   * @param {String} key 图片键
   * @param {Boolean} isThumbnail 是否为缩略图
   */
  removeImage(key, isThumbnail = false) {
    const cache = isThumbnail ? this.thumbnailCache : this.originalCache;
    const imageInfo = cache.get(key);
    
    if (imageInfo) {
      // 减少估计内存使用量
      this.estimatedMemoryUsage -= imageInfo.estimatedSize;
      
      // 从缓存中移除
      cache.delete(key);
      
      // 尝试删除临时文件
      this.removeTempFile(imageInfo.path);
    }
  },
  
  /**
   * 清理缓存
   * 移除最旧的缓存项以释放内存
   */
  cleanup() {
    console.log('[ImageCacheManager] 执行缓存清理');
    
    // 如果缓存数量超过一定阈值，则移除最久未使用的部分图片
    const thumbnailKeys = this.thumbnailCache.keys();
    const originalKeys = this.originalCache.keys();
    
    // 缩略图缓存保留70%
    const thumbnailsToRemove = Math.floor(thumbnailKeys.length * 0.3);
    for (let i = 0; i < thumbnailsToRemove; i++) {
      const key = thumbnailKeys[i];
      this.removeImage(key, true);
    }
    
    // 原图缓存保留50%
    const originalsToRemove = Math.floor(originalKeys.length * 0.5);
    for (let i = 0; i < originalsToRemove; i++) {
      const key = originalKeys[i];
      this.removeImage(key, false);
    }
    
    // 更新最后清理时间
    this.lastCleanupTime = Date.now();
    
    console.log('[ImageCacheManager] 缓存清理完成，当前内存使用:', this.estimatedMemoryUsage);
    return true;
  },
  
  /**
   * 清空所有缓存
   */
  clearCache() {
    // 删除所有临时文件
    [...this.thumbnailCache.values(), ...this.originalCache.values()].forEach(imageInfo => {
      this.removeTempFile(imageInfo.path);
    });
    
    // 清空缓存
    this.thumbnailCache.clear();
    this.originalCache.clear();
    
    // 重置内存使用估计
    this.estimatedMemoryUsage = 0;
    
    // 更新最后清理时间
    this.lastCleanupTime = Date.now();
    
    console.log('[ImageCacheManager] 已清空所有缓存');
    return true;
  },
  
  /**
   * 尝试删除临时文件
   * @param {String} filePath 文件路径
   */
  removeTempFile(filePath) {
    if (!filePath || !filePath.startsWith('wxfile://')) {
      return;
    }
    
    wx.removeSavedFile({
      filePath,
      success: () => {
        console.log(`[ImageCacheManager] 成功删除临时文件: ${filePath}`);
      },
      fail: (err) => {
        console.error(`[ImageCacheManager] 删除临时文件失败: ${filePath}`, err);
      }
    });
  },
  
  /**
   * 估算图片占用内存大小
   * 由于不能直接获取内存占用，使用文件大小和图片类型进行估算
   * @param {String} filePath 图片路径
   * @param {Boolean} isThumbnail 是否为缩略图
   * @returns {Number} 估计的内存占用（字节）
   */
  estimateImageSize(filePath, isThumbnail) {
    // 缩略图默认按100KB估算
    if (isThumbnail) {
      return 100 * 1024;
    }
    
    // 原图默认按1MB估算
    return 1 * 1024 * 1024;
  },
  
  /**
   * 预加载图片
   * 提前加载并缓存图片，提高用户体验
   * @param {Array} imageUrls 图片URL数组
   * @param {Boolean} asThumbnail 是否作为缩略图缓存
   * @returns {Promise} 加载结果
   */
  preloadImages(imageUrls, asThumbnail = false) {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return Promise.resolve([]);
    }
    
    // 限制预加载数量，避免一次性加载过多
    const limitedUrls = imageUrls.slice(0, 5);
    
    const loadPromises = limitedUrls.map(url => 
      new Promise((resolve) => {
        // 如果已经在缓存中，直接返回
        const cacheKey = url;
        const cachedImage = this.getImage(cacheKey, asThumbnail);
        if (cachedImage) {
          resolve(cachedImage);
          return;
        }
        
        // 下载图片到临时路径
        wx.downloadFile({
          url,
          success: (res) => {
            if (res.statusCode === 200) {
              // 将图片信息添加到缓存
              const imageInfo = {
                path: res.tempFilePath,
                size: res.dataLength || 0,
                url
              };
              
              this.addImage(cacheKey, imageInfo, asThumbnail);
              resolve(imageInfo);
            } else {
              console.error(`[ImageCacheManager] 预加载图片失败: ${url}, 状态码: ${res.statusCode}`);
              resolve(null);
            }
          },
          fail: (err) => {
            console.error(`[ImageCacheManager] 预加载图片失败: ${url}`, err);
            resolve(null);
          }
        });
      })
    );
    
    return Promise.all(loadPromises);
  },
  
  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计信息
   */
  getStats() {
    return {
      thumbnailCount: this.thumbnailCache.size(),
      originalCount: this.originalCache.size(),
      memoryUsageMB: (this.estimatedMemoryUsage / (1024 * 1024)).toFixed(2)
    };
  },
  
  /**
   * 获取最后清理时间
   * @returns {Number|null} 最后清理时间的时间戳
   */
  getLastCleanupTime() {
    return this.lastCleanupTime;
  }
};

module.exports = ImageCacheManager; 